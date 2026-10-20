-- Pincode access check: admin, active allocation holder, or state-scoped staff
CREATE OR REPLACE FUNCTION public.can_access_pincode(_user uuid, _pin text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT public.has_role(_user, 'admin')
    OR EXISTS (SELECT 1 FROM public.pincode_allocations a
        WHERE a.holder_user_id = _user AND a.pincode = _pin AND a.status = 'active')
    OR EXISTS (SELECT 1 FROM public.staff_scopes sc JOIN public.pincodes p ON p.state = sc.state
        WHERE sc.user_id = _user AND sc.revoked_at IS NULL AND p.pincode = _pin
          AND sc.role IN ('state_director','state_manager'))
$$;

-- Grant a staff role with hierarchy enforcement
CREATE OR REPLACE FUNCTION public.grant_staff_role(_user_id uuid, _role app_role, _state text DEFAULT NULL, _point_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT (
    public.has_role(caller, 'admin')
    OR (_role = 'state_manager' AND public.has_role(caller, 'state_director')
        AND EXISTS (SELECT 1 FROM public.staff_scopes s WHERE s.user_id = caller AND s.role = 'state_director' AND s.state = _state AND s.revoked_at IS NULL))
    OR (_role = 'area_manager' AND public.has_role(caller, 'state_manager')
        AND EXISTS (SELECT 1 FROM public.staff_scopes s WHERE s.user_id = caller AND s.role = 'state_manager' AND s.state = _state AND s.revoked_at IS NULL))
    OR (_role = 'point' AND public.has_role(caller, 'area_manager'))
  ) THEN RAISE EXCEPTION 'You are not allowed to grant this role'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  INSERT INTO public.staff_scopes (user_id, role, state, point_id, created_by)
    VALUES (_user_id, _role, _state, _point_id, caller);
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta)
    VALUES (caller, 'grant_role', 'user_roles', _user_id::text, jsonb_build_object('role', _role, 'state', _state, 'point_id', _point_id));
END;
$$;

-- Allocate a pincode downward the hierarchy; caller must hold it (or be admin)
CREATE OR REPLACE FUNCTION public.allocate_pincode(_pincode text, _holder uuid, _holder_role app_role, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE caller uuid := auth.uid(); new_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pincodes WHERE pincode = _pincode AND active) THEN
    RAISE EXCEPTION 'Unknown or inactive pincode %', _pincode; END IF;
  IF _holder_role NOT IN ('state_manager','area_manager','point') THEN
    RAISE EXCEPTION 'Pincodes can only be allocated to state_manager, area_manager or point'; END IF;
  -- Caller must be admin or hold this pincode at the parent level
  IF NOT (
    public.has_role(caller, 'admin')
    OR (_holder_role = 'area_manager' AND EXISTS (SELECT 1 FROM public.pincode_allocations a
        WHERE a.pincode = _pincode AND a.holder_user_id = caller AND a.holder_role = 'state_manager' AND a.status = 'active'))
    OR (_holder_role = 'point' AND EXISTS (SELECT 1 FROM public.pincode_allocations a
        WHERE a.pincode = _pincode AND a.holder_user_id = caller AND a.holder_role = 'area_manager' AND a.status = 'active'))
  ) THEN RAISE EXCEPTION 'Pincode % is not in your scope', _pincode; END IF;
  -- Conflict: another active holder at the same level
  IF EXISTS (SELECT 1 FROM public.pincode_allocations a
      WHERE a.pincode = _pincode AND a.holder_role = _holder_role AND a.status = 'active') THEN
    RAISE EXCEPTION 'Pincode % is already allocated to an active %', _pincode, _holder_role; END IF;
  INSERT INTO public.pincode_allocations (pincode, holder_user_id, holder_role, assigned_by, note)
    VALUES (_pincode, _holder, _holder_role, caller, _note) RETURNING id INTO new_id;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta)
    VALUES (caller, 'allocate_pincode', 'pincode_allocations', new_id::text,
      jsonb_build_object('pincode', _pincode, 'holder', _holder, 'role', _holder_role));
  RETURN new_id;
END;
$$;

-- Release an allocation (admin, the assigner, or the holder themselves)
CREATE OR REPLACE FUNCTION public.release_pincode(_allocation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE caller uuid := auth.uid(); a public.pincode_allocations%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.pincode_allocations WHERE id = _allocation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  IF NOT (public.has_role(caller, 'admin') OR a.assigned_by = caller OR a.holder_user_id = caller) THEN
    RAISE EXCEPTION 'Not allowed to release this allocation'; END IF;
  UPDATE public.pincode_allocations SET status = 'released', effective_to = now() WHERE id = _allocation_id;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta)
    VALUES (caller, 'release_pincode', 'pincode_allocations', _allocation_id::text, jsonb_build_object('pincode', a.pincode));
END;
$$;

-- Admin-only audited CSV import of pincode master rows
CREATE OR REPLACE FUNCTION public.import_pincodes(_rows jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  INSERT INTO public.pincodes (pincode, city, state, tier, zone)
    SELECT r->>'pincode', r->>'city', r->>'state', nullif(r->>'tier',''), nullif(r->>'zone','')
    FROM jsonb_array_elements(_rows) AS r
    WHERE r->>'pincode' ~ '^[0-9]{6}$'
  ON CONFLICT (pincode) DO UPDATE SET city = excluded.city, state = excluded.state,
    tier = excluded.tier, zone = excluded.zone;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.audit_logs (actor, action, entity, meta)
    VALUES (auth.uid(), 'import_pincodes', 'pincodes', jsonb_build_object('rows', n));
  RETURN n;
END;
$$;

-- Scan a piece (or master AWB): staff add a tracking event
CREATE OR REPLACE FUNCTION public.scan_piece(_code text, _status text, _location text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE caller uuid := auth.uid(); p public.shipment_pieces%ROWTYPE; s public.shipments%ROWTYPE;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT (public.has_role(caller,'admin') OR public.has_role(caller,'network') OR public.has_role(caller,'point')
      OR public.has_role(caller,'state_director') OR public.has_role(caller,'state_manager') OR public.has_role(caller,'area_manager')) THEN
    RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO p FROM public.shipment_pieces WHERE piece_code = upper(trim(_code));
  IF FOUND THEN
    SELECT * INTO s FROM public.shipments WHERE id = p.shipment_id;
  ELSE
    SELECT * INTO s FROM public.shipments WHERE tracking_number = upper(trim(_code));
    IF NOT FOUND THEN RAISE EXCEPTION 'No parcel found for %', _code; END IF;
  END IF;
  INSERT INTO public.tracking_events (shipment_id, piece_id, status, location, note)
    VALUES (s.id, p.id, _status, _location, _note);
  UPDATE public.shipments SET status = _status, updated_at = now() WHERE id = s.id;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta)
    VALUES (caller, 'scan', 'shipments', s.id::text, jsonb_build_object('code', _code, 'status', _status));
  RETURN json_build_object('awb', s.tracking_number, 'piece', p.piece_code, 'status', _status);
END;
$$;

-- Public tracking: resolve master AWB or a piece code
CREATE OR REPLACE FUNCTION public.track_shipment(_tracking text) RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT json_build_object(
    'tracking_number', s.tracking_number, 'status', s.status, 'service', s.service,
    'from_city', s.sender_city, 'to_city', s.receiver_city, 'created_at', s.created_at,
    'pieces', coalesce((SELECT json_agg(json_build_object('code', pc.piece_code, 'seq', pc.seq_no, 'total', pc.total) ORDER BY pc.seq_no)
        FROM public.shipment_pieces pc WHERE pc.shipment_id = s.id), '[]'::json),
    'events', coalesce((SELECT json_agg(json_build_object('status', e.status, 'location', e.location, 'note', e.note,
          'piece', (SELECT pc.piece_code FROM public.shipment_pieces pc WHERE pc.id = e.piece_id), 'at', e.created_at)
        ORDER BY e.created_at DESC) FROM public.tracking_events e WHERE e.shipment_id = s.id), '[]'::json))
  FROM public.shipments s
  WHERE s.tracking_number = upper(trim(_tracking))
     OR EXISTS (SELECT 1 FROM public.shipment_pieces pc WHERE pc.shipment_id = s.id AND pc.piece_code = upper(trim(_tracking)))
  LIMIT 1
$$;

-- Tighten shipment visibility: owner, admin, network, or staff scoped to origin/destination pincode
DROP POLICY "own shipments read" ON public.shipments;
CREATE POLICY "own shipments read" ON public.shipments FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'network')
  OR public.can_access_pincode(auth.uid(), sender_pincode) OR public.can_access_pincode(auth.uid(), receiver_pincode));
DROP POLICY "staff shipments update" ON public.shipments;
CREATE POLICY "staff shipments update" ON public.shipments FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'network')
  OR public.can_access_pincode(auth.uid(), sender_pincode));