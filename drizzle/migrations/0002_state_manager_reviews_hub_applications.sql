CREATE OR REPLACE FUNCTION public.manages_state(_user uuid, _state text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user,'state_director') OR EXISTS (
    SELECT 1 FROM public.staff_scopes s WHERE s.user_id=_user AND s.revoked_at IS NULL
      AND s.role IN ('state_manager','state_director') AND lower(coalesce(s.state,'')) = lower(coalesce(_state,'')));
$$;
CREATE POLICY "state managers read apps" ON public.point_applications FOR SELECT TO authenticated USING (public.manages_state(auth.uid(), state));
CREATE POLICY "state managers update apps" ON public.point_applications FOR UPDATE TO authenticated USING (public.manages_state(auth.uid(), state));