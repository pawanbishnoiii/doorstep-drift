ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text, ADD COLUMN IF NOT EXISTS district text;
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE OR REPLACE FUNCTION public.audit_row_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id text; _meta jsonb;
BEGIN
  IF TG_TABLE_NAME = 'shipments' AND TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN RETURN NEW; END IF;
  _id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'provider', to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'provider');
  IF TG_TABLE_NAME = 'shipments' THEN
    _meta := jsonb_build_object('awb', NEW.tracking_number, 'from', OLD.status, 'to', NEW.status, 'payment', NEW.payment_status);
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    _meta := jsonb_build_object('user', COALESCE(NEW.user_id, OLD.user_id), 'role', COALESCE(NEW.role, OLD.role));
  ELSIF TG_TABLE_NAME = 'courier_provider_settings' THEN
    _meta := jsonb_build_object('provider', NEW.provider, 'enabled', NEW.enabled, 'environment', NEW.environment);
  ELSE
    _meta := '{}'::jsonb;
  END IF;
  INSERT INTO public.audit_logs(actor, action, entity, entity_id, meta) VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, _id, _meta);
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS audit_shipments ON public.shipments;
CREATE TRIGGER audit_shipments AFTER UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_roles ON public.user_roles;
CREATE TRIGGER audit_roles AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_providers ON public.courier_provider_settings;
CREATE TRIGGER audit_providers AFTER INSERT OR UPDATE ON public.courier_provider_settings FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_integrations ON public.integration_settings;
CREATE TRIGGER audit_integrations AFTER UPDATE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();