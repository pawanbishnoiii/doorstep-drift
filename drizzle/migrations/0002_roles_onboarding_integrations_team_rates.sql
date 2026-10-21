ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text, ADD COLUMN IF NOT EXISTS age int, ADD COLUMN IF NOT EXISTS address text, ADD COLUMN IF NOT EXISTS pincode text, ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision, ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

CREATE TABLE public.integration_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  admin_alert_email text,
  smtp_provider text NOT NULL DEFAULT 'gmail',
  smtp_host text, smtp_port int, smtp_user text, smtp_from text,
  payment_provider text NOT NULL DEFAULT 'none', payment_key_id text, payment_live boolean NOT NULL DEFAULT false,
  otp_provider text NOT NULL DEFAULT 'screen', otp_sender_id text,
  whatsapp_number text, whatsapp_enabled boolean NOT NULL DEFAULT false,
  webhook_url text, api_enabled boolean NOT NULL DEFAULT false,
  alert_on_booking boolean NOT NULL DEFAULT true, alert_on_application boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations admin read" ON public.integration_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "integrations admin insert" ON public.integration_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "integrations admin update" ON public.integration_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.integration_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.state_rates (
  state text NOT NULL, service text NOT NULL,
  base numeric NOT NULL CHECK (base >= 0), per_kg numeric NOT NULL CHECK (per_kg >= 0),
  active boolean NOT NULL DEFAULT true, set_by uuid, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (state, service)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.state_rates TO authenticated;
GRANT SELECT ON public.state_rates TO anon;
GRANT ALL ON public.state_rates TO service_role;
ALTER TABLE public.state_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "state rates read" ON public.state_rates FOR SELECT USING (true);
CREATE POLICY "state rates write" ON public.state_rates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.manages_state(auth.uid(), state));
CREATE POLICY "state rates update" ON public.state_rates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.manages_state(auth.uid(), state));
CREATE POLICY "state rates delete" ON public.state_rates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.manages_state(auth.uid(), state));

CREATE OR REPLACE FUNCTION public.scan_bag_code(_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bags%ROWTYPE; m public.manifests%ROWTYPE; c text := upper(trim(coalesce(_code,'')));
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO b FROM public.bags WHERE bag_code=c OR seal_no=c OR plastic_bag_code=c LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  IF NOT public.can_access_bag(b.id) THEN RAISE EXCEPTION 'Bag outside your scope'; END IF;
  IF b.manifest_id IS NOT NULL THEN SELECT * INTO m FROM public.manifests WHERE id=b.manifest_id; END IF;
  RETURN jsonb_build_object('found', true, 'bag_id', b.id, 'bag_code', b.bag_code, 'status', b.status, 'seal_no', b.seal_no, 'plastic_bag_code', b.plastic_bag_code,
    'matched', CASE WHEN b.bag_code=c THEN 'bag' WHEN b.seal_no=c THEN 'seal' ELSE 'plastic' END,
    'manifest_id', b.manifest_id, 'manifest_code', m.manifest_code, 'manifest_status', m.status);
END $$;
GRANT EXECUTE ON FUNCTION public.scan_bag_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_plastic_bag(_bag_id uuid, _code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text := upper(trim(coalesce(_code,'')));
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF NOT public.can_access_bag(_bag_id) THEN RAISE EXCEPTION 'Bag outside your scope'; END IF;
  IF length(c) < 3 THEN RAISE EXCEPTION 'Plastic bag code required'; END IF;
  IF EXISTS (SELECT 1 FROM public.bags WHERE plastic_bag_code=c AND id<>_bag_id) THEN RAISE EXCEPTION 'Plastic bag code already used'; END IF;
  UPDATE public.bags SET plastic_bag_code=c WHERE id=_bag_id AND status='open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bag must be open'; END IF;
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, meta) VALUES (auth.uid(), 'set_plastic_bag', 'bags', _bag_id::text, jsonb_build_object('code', c));
END $$;
GRANT EXECUTE ON FUNCTION public.set_plastic_bag(uuid, text) TO authenticated;