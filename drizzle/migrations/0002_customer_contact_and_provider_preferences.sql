ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text, ADD COLUMN IF NOT EXISTS last_name text, ADD COLUMN IF NOT EXISTS whatsapp text, ADD COLUMN IF NOT EXISTS contact_email text;
CREATE TABLE public.courier_provider_settings (provider text PRIMARY KEY CHECK (provider IN ('ekart','delhivery','shiprocket','shadowfax','tezsender')), enabled boolean NOT NULL DEFAULT false, account_label text, environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.courier_provider_settings TO authenticated;
GRANT ALL ON public.courier_provider_settings TO service_role;
ALTER TABLE public.courier_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages provider preferences" ON public.courier_provider_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));