-- Fast public pincode lookup (master data, non-personal)
CREATE INDEX IF NOT EXISTS pincodes_pin_prefix_idx ON public.pincodes (pincode text_pattern_ops);
CREATE INDEX IF NOT EXISTS pincodes_city_prefix_idx ON public.pincodes (lower(city) text_pattern_ops);
GRANT SELECT ON public.pincodes TO anon;
CREATE POLICY "public read pincodes" ON public.pincodes FOR SELECT TO anon USING (active);

CREATE INDEX IF NOT EXISTS shipments_user_created_idx ON public.shipments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments (status);
CREATE INDEX IF NOT EXISTS tracking_events_shipment_idx ON public.tracking_events (shipment_id, created_at DESC);

CREATE SEQUENCE IF NOT EXISTS public.ops_seq START 1;

-- RETURNS / RTO
CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id),
  kind text NOT NULL CHECK (kind IN ('customer_return','rto')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','in_transit','returned','rejected')),
  return_awb text UNIQUE,
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX returns_one_open_per_shipment ON public.returns (shipment_id) WHERE status IN ('requested','approved','in_transit');
GRANT SELECT ON public.returns TO authenticated;
GRANT ALL ON public.returns TO service_role;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "returns read" ON public.returns FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = returns.shipment_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'network') OR public.can_access_pincode(auth.uid(), s.sender_pincode) OR public.can_access_pincode(auth.uid(), s.receiver_pincode))));

CREATE OR REPLACE FUNCTION public.create_return(_awb text, _kind text, _reason text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); s public.shipments%ROWTYPE; rid uuid; rawb text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'Reason required'; END IF;
  SELECT * INTO s FROM public.shipments WHERE tracking_number = upper(trim(_awb));
  IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found'; END IF;
  IF _kind = 'customer_return' THEN
    IF s.user_id <> caller AND NOT public.has_role(caller,'admin') THEN RAISE EXCEPTION 'Not your shipment'; END IF;
    IF s.status <> 'delivered' THEN RAISE EXCEPTION 'Returns can be requested only after delivery'; END IF;
  ELSIF _kind = 'rto' THEN
    IF NOT (public.has_role(caller,'admin') OR public.has_role(caller,'network') OR public.can_access_pincode(caller, s.receiver_pincode) OR public.can_access_pincode(caller, s.sender_pincode)) THEN RAISE EXCEPTION 'Staff in scope only'; END IF;
    IF s.status IN ('delivered','cancelled','awaiting_payment','rto') THEN RAISE EXCEPTION 'RTO not allowed in status %', s.status; END IF;
  ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
  rawb := public.next_awb();
  INSERT INTO public.returns (shipment_id, kind, reason, return_awb, requested_by, status)
    VALUES (s.id, _kind, trim(_reason), rawb, caller, CASE WHEN _kind='rto' THEN 'approved' ELSE 'requested' END) RETURNING id INTO rid;
  INSERT INTO public.tracking_events (shipment_id, status, note) VALUES (s.id, CASE WHEN _kind='rto' THEN 'rto_initiated' ELSE 'return_requested' END, trim(_reason) || ' · Return AWB ' || rawb);
  IF _kind = 'rto' THEN UPDATE public.shipments SET status='rto_initiated', updated_at=now() WHERE id = s.id; END IF;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'create_return', 'returns', rid::text, jsonb_build_object('awb', s.tracking_number, 'kind', _kind, 'return_awb', rawb));
  RETURN json_build_object('id', rid, 'return_awb', rawb);
END $$;

CREATE OR REPLACE FUNCTION public.update_return_status(_return_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); r public.returns%ROWTYPE; s public.shipments%ROWTYPE;
BEGIN
  IF NOT public.is_staff(caller) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF _status NOT IN ('approved','in_transit','returned','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO r FROM public.returns WHERE id = _return_id; IF NOT FOUND THEN RAISE EXCEPTION 'Return not found'; END IF;
  SELECT * INTO s FROM public.shipments WHERE id = r.shipment_id;
  IF NOT (public.has_role(caller,'admin') OR public.has_role(caller,'network') OR public.can_access_pincode(caller, s.receiver_pincode) OR public.can_access_pincode(caller, s.sender_pincode)) THEN RAISE EXCEPTION 'Out of scope'; END IF;
  UPDATE public.returns SET status=_status, updated_at=now() WHERE id=_return_id;
  INSERT INTO public.tracking_events (shipment_id, status, note) VALUES (s.id, CASE WHEN _status='returned' THEN (CASE WHEN r.kind='rto' THEN 'rto_delivered' ELSE 'returned' END) ELSE 'return_' || _status END, 'Return AWB ' || r.return_awb);
  IF _status='returned' THEN UPDATE public.shipments SET status = CASE WHEN r.kind='rto' THEN 'rto_delivered' ELSE 'returned' END, updated_at=now() WHERE id=s.id; END IF;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'return_status', 'returns', _return_id::text, jsonb_build_object('status', _status));
END $$;

-- BAGS + MANIFESTS
CREATE TABLE public.bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_code text NOT NULL UNIQUE,
  destination text NOT NULL,
  seal_no text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','sealed','dispatched','received')),
  manifest_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sealed_at timestamptz
);
CREATE TABLE public.bag_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id uuid NOT NULL REFERENCES public.bags(id),
  piece_id uuid NOT NULL REFERENCES public.shipment_pieces(id),
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bag_id, piece_id)
);
CREATE TABLE public.manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_code text NOT NULL UNIQUE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  vehicle_no text,
  status text NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched','received')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  received_by uuid
);
ALTER TABLE public.bags ADD CONSTRAINT bags_manifest_fk FOREIGN KEY (manifest_id) REFERENCES public.manifests(id);
GRANT SELECT ON public.bags, public.bag_items, public.manifests TO authenticated;
GRANT ALL ON public.bags, public.bag_items, public.manifests TO service_role;
ALTER TABLE public.bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bag_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read bags" ON public.bags FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read bag items" ON public.bag_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read manifests" ON public.manifests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_bag(_destination text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); code text; bid uuid;
BEGIN
  IF NOT public.is_staff(caller) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF length(trim(coalesce(_destination,''))) < 2 THEN RAISE EXCEPTION 'Destination required'; END IF;
  code := 'DBXB' || lpad(nextval('public.ops_seq')::text, 8, '0');
  INSERT INTO public.bags (bag_code, destination, created_by) VALUES (code, trim(_destination), caller) RETURNING id INTO bid;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'create_bag', 'bags', bid::text, jsonb_build_object('code', code));
  RETURN json_build_object('id', bid, 'bag_code', code);
END $$;

CREATE OR REPLACE FUNCTION public.add_piece_to_bag(_bag_id uuid, _code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); b public.bags%ROWTYPE; p public.shipment_pieces%ROWTYPE; s public.shipments%ROWTYPE;
BEGIN
  IF NOT public.is_staff(caller) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO b FROM public.bags WHERE id=_bag_id; IF NOT FOUND THEN RAISE EXCEPTION 'Bag not found'; END IF;
  IF b.status <> 'open' THEN RAISE EXCEPTION 'Bag % is %', b.bag_code, b.status; END IF;
  SELECT * INTO p FROM public.shipment_pieces WHERE piece_code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'No parcel with code %', _code; END IF;
  SELECT * INTO s FROM public.shipments WHERE id = p.shipment_id;
  IF s.status IN ('awaiting_payment','cancelled','delivered') THEN RAISE EXCEPTION 'Parcel status % cannot be bagged', s.status; END IF;
  IF EXISTS (SELECT 1 FROM public.bag_items i JOIN public.bags bb ON bb.id=i.bag_id WHERE i.piece_id=p.id AND bb.status IN ('open','sealed','dispatched')) THEN RAISE EXCEPTION 'Parcel already in an active bag'; END IF;
  INSERT INTO public.bag_items (bag_id, piece_id, added_by) VALUES (b.id, p.id, caller);
  INSERT INTO public.tracking_events (shipment_id, piece_id, status, location, note) VALUES (s.id, p.id, 'bagged', b.destination, 'Bag ' || b.bag_code);
  RETURN json_build_object('piece', p.piece_code, 'awb', s.tracking_number);
END $$;

CREATE OR REPLACE FUNCTION public.seal_bag(_bag_id uuid, _seal text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); b public.bags%ROWTYPE;
BEGIN
  IF NOT public.is_staff(caller) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO b FROM public.bags WHERE id=_bag_id; IF NOT FOUND OR b.status <> 'open' THEN RAISE EXCEPTION 'Bag must be open'; END IF;
  IF length(trim(coalesce(_seal,''))) < 3 THEN RAISE EXCEPTION 'Seal number required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bag_items WHERE bag_id=_bag_id) THEN RAISE EXCEPTION 'Bag is empty'; END IF;
  UPDATE public.bags SET status='sealed', seal_no=upper(trim(_seal)), sealed_at=now() WHERE id=_bag_id;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'seal_bag', 'bags', _bag_id::text, jsonb_build_object('seal', _seal));
END $$;

CREATE OR REPLACE FUNCTION public.create_manifest(_from text, _to text, _vehicle text, _bag_ids uuid[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); code text; mid uuid; n int;
BEGIN
  IF NOT public.is_staff(caller) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT count(*) INTO n FROM public.bags WHERE id = ANY(_bag_ids) AND status='sealed';
  IF n = 0 OR n <> coalesce(array_length(_bag_ids,1),0) THEN RAISE EXCEPTION 'Select only sealed bags'; END IF;
  code := 'DBXM' || lpad(nextval('public.ops_seq')::text, 8, '0');
  INSERT INTO public.manifests (manifest_code, from_location, to_location, vehicle_no, created_by) VALUES (code, trim(_from), trim(_to), nullif(upper(trim(_vehicle)),''), caller) RETURNING id INTO mid;
  UPDATE public.bags SET status='dispatched', manifest_id=mid WHERE id = ANY(_bag_ids);
  INSERT INTO public.tracking_events (shipment_id, piece_id, status, location, note)
    SELECT p.shipment_id, p.id, 'in_transit', trim(_from), 'Dispatched to ' || trim(_to) || ' · ' || code
    FROM public.bag_items i JOIN public.shipment_pieces p ON p.id=i.piece_id WHERE i.bag_id = ANY(_bag_ids);
  UPDATE public.shipments SET status='in_transit', updated_at=now() WHERE id IN (SELECT p.shipment_id FROM public.bag_items i JOIN public.shipment_pieces p ON p.id=i.piece_id WHERE i.bag_id = ANY(_bag_ids));
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'create_manifest', 'manifests', mid::text, jsonb_build_object('code', code, 'bags', n));
  RETURN json_build_object('id', mid, 'manifest_code', code);
END $$;

CREATE OR REPLACE FUNCTION public.receive_manifest(_manifest_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); m public.manifests%ROWTYPE;
BEGIN
  IF NOT public.is_staff(caller) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO m FROM public.manifests WHERE id=_manifest_id; IF NOT FOUND OR m.status<>'dispatched' THEN RAISE EXCEPTION 'Manifest not in transit'; END IF;
  UPDATE public.manifests SET status='received', received_at=now(), received_by=caller WHERE id=_manifest_id;
  UPDATE public.bags SET status='received' WHERE manifest_id=_manifest_id;
  INSERT INTO public.tracking_events (shipment_id, piece_id, status, location, note)
    SELECT p.shipment_id, p.id, 'reached_hub', m.to_location, 'Received · ' || m.manifest_code
    FROM public.bags b JOIN public.bag_items i ON i.bag_id=b.id JOIN public.shipment_pieces p ON p.id=i.piece_id WHERE b.manifest_id=_manifest_id;
  UPDATE public.shipments SET status='reached_hub', updated_at=now() WHERE id IN (SELECT p.shipment_id FROM public.bags b JOIN public.bag_items i ON i.bag_id=b.id JOIN public.shipment_pieces p ON p.id=i.piece_id WHERE b.manifest_id=_manifest_id);
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'receive_manifest', 'manifests', _manifest_id::text, '{}'::jsonb);
END $$;

-- POINT COMMISSIONS
CREATE TABLE public.point_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_user_id uuid NOT NULL,
  shipment_id uuid NOT NULL UNIQUE REFERENCES public.shipments(id),
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  settled_by uuid
);
GRANT SELECT ON public.point_commissions TO authenticated;
GRANT ALL ON public.point_commissions TO service_role;
ALTER TABLE public.point_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission read" ON public.point_commissions FOR SELECT TO authenticated USING (point_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.accrue_point_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pu uuid; rate numeric := 0.10;
BEGIN
  pu := nullif(NEW.routing_snapshot->>'origin_point_user','')::uuid;
  IF pu IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('booked','picked_up') AND NOT EXISTS (SELECT 1 FROM public.point_commissions WHERE shipment_id=NEW.id) THEN
    INSERT INTO public.point_commissions (point_user_id, shipment_id, rate, amount) VALUES (pu, NEW.id, rate, round(NEW.price * rate, 2));
  ELSIF NEW.status = 'cancelled' THEN
    UPDATE public.point_commissions SET status='void' WHERE shipment_id=NEW.id AND status='pending';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shipments_accrue_commission AFTER INSERT OR UPDATE OF status ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.accrue_point_commission();

CREATE OR REPLACE FUNCTION public.settle_commissions(_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); n int;
BEGIN
  IF NOT public.has_role(caller,'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.point_commissions SET status='settled', settled_at=now(), settled_by=caller WHERE id = ANY(_ids) AND status='pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (caller, 'settle_commissions', 'point_commissions', null, jsonb_build_object('count', n));
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION public.accrue_point_commission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_return(text,text,text), public.update_return_status(uuid,text), public.create_bag(text), public.add_piece_to_bag(uuid,text), public.seal_bag(uuid,text), public.create_manifest(text,text,text,uuid[]), public.receive_manifest(uuid), public.settle_commissions(uuid[]) TO authenticated;