-- First admin bootstrap: only works while no admin exists
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'An admin already exists. Ask them to grant you a role.'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (caller, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.staff_scopes (user_id, role, created_by) VALUES (caller, 'admin', caller);
  INSERT INTO public.audit_logs (actor, action, entity, entity_id) VALUES (caller, 'claim_first_admin', 'user_roles', caller::text);
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff(_u uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _u) $$;

-- Account type chosen at signup (customer-facing only; never a staff role)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name text;

-- Staff lookup by phone (staff only) for allocation/transfer
CREATE OR REPLACE FUNCTION public.find_user_by_phone(_phone text)
RETURNS TABLE(user_id uuid, full_name text, phone text, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.phone,
    coalesce((SELECT array_agg(r.role::text) FROM public.user_roles r WHERE r.user_id = p.id), '{}')
  FROM public.profiles p
  WHERE p.phone_verified AND right(regexp_replace(p.phone,'\D','','g'),10) = right(regexp_replace(_phone,'\D','','g'),10)
  LIMIT 1;
END $$;
GRANT EXECUTE ON FUNCTION public.find_user_by_phone(text) TO authenticated;

-- Staff directory: admin sees all staff, others see themselves + people they granted
CREATE OR REPLACE FUNCTION public.staff_directory()
RETURNS TABLE(user_id uuid, full_name text, phone text, roles text[], states text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, p.full_name, p.phone,
    (SELECT array_agg(DISTINCT r.role::text) FROM public.user_roles r WHERE r.user_id = p.id),
    (SELECT array_agg(DISTINCT s.state) FILTER (WHERE s.state IS NOT NULL) FROM public.staff_scopes s WHERE s.user_id = p.id AND s.revoked_at IS NULL)
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id)
    AND (public.has_role(auth.uid(),'admin') OR p.id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.staff_scopes s WHERE s.user_id = p.id AND s.created_by = auth.uid()))
$$;
GRANT EXECUTE ON FUNCTION public.staff_directory() TO authenticated;

-- Transfer an allocation to another holder (same level), keeps history
CREATE OR REPLACE FUNCTION public.transfer_pincode(_allocation_id uuid, _new_holder uuid, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid(); a public.pincode_allocations%ROWTYPE; new_id uuid;
BEGIN
  SELECT * INTO a FROM public.pincode_allocations WHERE id = _allocation_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active allocation not found'; END IF;
  IF NOT (public.has_role(caller,'admin') OR a.assigned_by = caller) THEN RAISE EXCEPTION 'Not allowed to transfer this allocation'; END IF;
  IF NOT public.has_role(_new_holder, a.holder_role) THEN RAISE EXCEPTION 'New holder does not have the % role', a.holder_role; END IF;
  UPDATE public.pincode_allocations SET status = 'transferred', effective_to = now() WHERE id = a.id;
  INSERT INTO public.pincode_allocations (pincode, holder_user_id, holder_role, assigned_by, note)
    VALUES (a.pincode, _new_holder, a.holder_role, caller, coalesce(_note, 'transfer')) RETURNING id INTO new_id;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta)
    VALUES (caller, 'transfer_pincode', 'pincode_allocations', new_id::text, jsonb_build_object('pincode', a.pincode, 'from', a.holder_user_id, 'to', _new_holder));
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.transfer_pincode(uuid, uuid, text) TO authenticated;

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount numeric,
  min_order numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons read active" ON public.coupons FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "coupons admin insert" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "coupons admin update" ON public.coupons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id),
  user_id uuid NOT NULL,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id),
  discount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions read" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS pickup_lat double precision;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS pickup_lng double precision;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS dims jsonb;

-- Payments (demo gateway until real keys)
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  provider text NOT NULL DEFAULT 'razorpay_demo',
  mode text NOT NULL DEFAULT 'demo',
  method text,
  provider_ref text,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments read" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Notification outbox (sent once an email provider/domain is configured)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  channel text NOT NULL DEFAULT 'email',
  recipient text,
  kind text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.notify_point_application() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifications (user_id, recipient, kind, subject, body, meta)
  VALUES (NEW.user_id, NEW.email, 'point_application', 'We received your DropBox Point application ' || NEW.reference,
    'Hi ' || NEW.full_name || ', your application for ' || NEW.business_name || ' (' || NEW.city || ') is under review.',
    jsonb_build_object('reference', NEW.reference));
  INSERT INTO public.notifications (kind, subject, body, meta, recipient)
  VALUES ('admin_new_application', 'New Point application ' || NEW.reference,
    NEW.business_name || ' — ' || NEW.city || ', ' || NEW.state || ' ' || NEW.pincode, jsonb_build_object('application_id', NEW.id), 'admins');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_point_application AFTER INSERT ON public.point_applications FOR EACH ROW EXECUTE FUNCTION public.notify_point_application();

CREATE OR REPLACE FUNCTION public.notify_tracking_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.shipments%ROWTYPE; em text;
BEGIN
  SELECT * INTO s FROM public.shipments WHERE id = NEW.shipment_id;
  SELECT email INTO em FROM auth.users WHERE id = s.user_id;
  INSERT INTO public.notifications (user_id, recipient, kind, subject, body, meta)
  VALUES (s.user_id, em, 'shipment_update', 'Shipment ' || s.tracking_number || ': ' || replace(NEW.status,'_',' '),
    'Your parcel ' || s.sender_city || ' → ' || s.receiver_city || ' is now ' || replace(NEW.status,'_',' ') || coalesce(' at ' || NEW.location, '') || '.',
    jsonb_build_object('awb', s.tracking_number, 'status', NEW.status));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_tracking_event AFTER INSERT ON public.tracking_events FOR EACH ROW EXECUTE FUNCTION public.notify_tracking_event();

-- Scoped staff can read tracking events in their pincode scope
DROP POLICY IF EXISTS "events read" ON public.tracking_events;
CREATE POLICY "events read" ON public.tracking_events FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.shipments s WHERE s.id = tracking_events.shipment_id AND (
    s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'network')
    OR public.can_access_pincode(auth.uid(), s.sender_pincode) OR public.can_access_pincode(auth.uid(), s.receiver_pincode))));

-- Role-scoped dashboard summary
CREATE OR REPLACE FUNCTION public.dashboard_summary()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH vis AS (
    SELECT s.* FROM public.shipments s
    WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'network')
      OR public.can_access_pincode(auth.uid(), s.sender_pincode) OR public.can_access_pincode(auth.uid(), s.receiver_pincode)
  )
  SELECT json_build_object(
    'shipments', (SELECT count(*) FROM vis),
    'today', (SELECT count(*) FROM vis WHERE created_at::date = now()::date),
    'revenue', (SELECT coalesce(sum(price),0) FROM vis WHERE status <> 'cancelled'),
    'by_status', (SELECT coalesce(json_object_agg(status, n),'{}'::json) FROM (SELECT status, count(*) n FROM vis GROUP BY status) x),
    'last7', (SELECT coalesce(json_agg(json_build_object('d', d, 'n', n) ORDER BY d),'[]'::json) FROM (
        SELECT g::date d, (SELECT count(*) FROM vis WHERE created_at::date = g::date) n
        FROM generate_series(now()::date - 6, now()::date, interval '1 day') g) y),
    'pincodes', (SELECT count(*) FROM public.pincode_allocations WHERE holder_user_id = auth.uid() AND status = 'active'),
    'delegated', (SELECT count(*) FROM public.pincode_allocations WHERE assigned_by = auth.uid() AND status = 'active'),
    'team', (SELECT count(DISTINCT user_id) FROM public.staff_scopes WHERE created_by = auth.uid() AND revoked_at IS NULL),
    'applications', CASE WHEN public.has_role(auth.uid(),'admin') THEN (SELECT count(*) FROM public.point_applications WHERE status = 'submitted') ELSE 0 END,
    'users', CASE WHEN public.has_role(auth.uid(),'admin') THEN (SELECT count(*) FROM public.profiles) ELSE 0 END
  )
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_summary() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;