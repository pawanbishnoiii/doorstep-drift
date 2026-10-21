CREATE SEQUENCE IF NOT EXISTS public.seal_code_seq START 100001;
CREATE TABLE public.seal_codes (
  code text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('seal','plastic')),
  batch_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_bag_id uuid
);
GRANT SELECT ON public.seal_codes TO authenticated;
GRANT ALL ON public.seal_codes TO service_role;
ALTER TABLE public.seal_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read seal codes" ON public.seal_codes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.generate_seal_codes(_kind text, _count integer)
RETURNS TABLE(code text, batch_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _batch uuid := gen_random_uuid(); _prefix text; i integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only Admin can generate codes'; END IF;
  IF _kind NOT IN ('seal','plastic') THEN RAISE EXCEPTION 'Unknown code type'; END IF;
  IF _count < 1 OR _count > 2000 THEN RAISE EXCEPTION 'Choose between 1 and 2000 codes'; END IF;
  _prefix := CASE WHEN _kind = 'seal' THEN 'GXS' ELSE 'GXP' END;
  FOR i IN 1.._count LOOP
    INSERT INTO public.seal_codes(code, kind, batch_id, created_by)
    VALUES (_prefix || lpad(nextval('public.seal_code_seq')::text, 8, '0'), _kind, _batch, auth.uid());
  END LOOP;
  INSERT INTO public.audit_logs(actor, action, entity, entity_id, meta)
  VALUES (auth.uid(), 'generate_codes', 'seal_codes', _batch::text, jsonb_build_object('kind', _kind, 'count', _count));
  RETURN QUERY SELECT s.code, s.batch_id FROM public.seal_codes s WHERE s.batch_id = _batch ORDER BY s.code;
END $$;
REVOKE ALL ON FUNCTION public.generate_seal_codes(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_seal_codes(text, integer) TO authenticated;