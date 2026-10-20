CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  insert into public.profiles (id, full_name, avatar_url, account_type, business_name)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'account_type' in ('personal','business','point_partner') then new.raw_user_meta_data->>'account_type' else 'personal' end,
    new.raw_user_meta_data->>'business_name')
  on conflict (id) do nothing;
  return new;
end $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO public.profiles (id, full_name)
  SELECT u.id, u.raw_user_meta_data->>'full_name' FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
CREATE POLICY "admin read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));