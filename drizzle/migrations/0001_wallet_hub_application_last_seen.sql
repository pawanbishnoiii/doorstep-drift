ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz, ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.point_applications ADD COLUMN IF NOT EXISTS district text, ADD COLUMN IF NOT EXISTS whatsapp text, ADD COLUMN IF NOT EXISTS age integer, ADD COLUMN IF NOT EXISTS gender text, ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE public.bags ADD COLUMN IF NOT EXISTS plastic_bag_code text;

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL,
  ref text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin wallet read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'state_director'));
CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.wallet_balance(_user uuid DEFAULT auth.uid()) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(sum(amount),0) FROM public.wallet_transactions
  WHERE user_id = _user AND (_user = auth.uid() OR public.has_role(auth.uid(),'admin'));
$$;

CREATE OR REPLACE FUNCTION public.wallet_topup(_amount numeric, _ref text DEFAULT NULL) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Wallet is for partners only'; END IF;
  IF _amount < 100 OR _amount > 100000 THEN RAISE EXCEPTION 'Top-up between ₹100 and ₹1,00,000'; END IF;
  INSERT INTO public.wallet_transactions(user_id,amount,kind,ref,note) VALUES (auth.uid(),_amount,'topup',_ref,'Wallet top-up (demo payment)');
  RETURN public.wallet_balance(auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.wallet_on_shipment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bal numeric;
BEGIN
  IF public.has_role(NEW.user_id,'point') THEN
    SELECT coalesce(sum(amount),0) INTO bal FROM public.wallet_transactions WHERE user_id=NEW.user_id;
    IF bal < NEW.price THEN RAISE EXCEPTION 'Insufficient wallet balance (₹%). Please add money to your wallet.', bal; END IF;
    INSERT INTO public.wallet_transactions(user_id,amount,kind,ref,note) VALUES (NEW.user_id,-NEW.price,'booking',NEW.tracking_number,'Parcel booking');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wallet_on_shipment AFTER INSERT ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.wallet_on_shipment();

CREATE OR REPLACE FUNCTION public.wallet_on_commission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.wallet_transactions(user_id,amount,kind,ref,note) VALUES (NEW.point_user_id,NEW.amount,'commission',NEW.shipment_id::text,'Commission earned');
  RETURN NEW;
END $$;
CREATE TRIGGER wallet_on_commission AFTER INSERT ON public.point_commissions FOR EACH ROW EXECUTE FUNCTION public.wallet_on_commission();

CREATE OR REPLACE FUNCTION public.touch_last_seen() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.admin_users() RETURNS TABLE(user_id uuid, full_name text, phone text, city text, last_seen_at timestamptz, created_at timestamptz, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'state_director')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.phone, p.city, p.last_seen_at, p.created_at,
    coalesce(array_agg(r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}')
  FROM public.profiles p LEFT JOIN public.user_roles r ON r.user_id=p.id
  GROUP BY p.id ORDER BY p.last_seen_at DESC NULLS LAST LIMIT 1000;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
EXCEPTION WHEN others THEN NULL; END $$;