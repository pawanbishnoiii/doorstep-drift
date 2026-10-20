-- Pincode master data (CSV import target)
CREATE TABLE public.pincodes (
  pincode text PRIMARY KEY,
  city text NOT NULL,
  state text NOT NULL,
  tier text,
  zone text,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.pincodes TO authenticated;
GRANT ALL ON public.pincodes TO service_role;
ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read pincodes" ON public.pincodes FOR SELECT TO authenticated USING (true);

-- Staff scope assignments (who manages which state / point)
CREATE TABLE public.staff_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  state text,
  point_id uuid REFERENCES public.point_applications(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
GRANT SELECT ON public.staff_scopes TO authenticated;
GRANT ALL ON public.staff_scopes TO service_role;
ALTER TABLE public.staff_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scope read" ON public.staff_scopes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Pincode allocation storage (history kept; rows are released, never deleted)
CREATE TABLE public.pincode_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode text NOT NULL REFERENCES public.pincodes(pincode),
  holder_user_id uuid NOT NULL,
  holder_role app_role NOT NULL,
  status text NOT NULL DEFAULT 'active',
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  assigned_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pincode_allocations TO authenticated;
GRANT ALL ON public.pincode_allocations TO service_role;
ALTER TABLE public.pincode_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocation read" ON public.pincode_allocations FOR SELECT TO authenticated
  USING (holder_user_id = auth.uid() OR assigned_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- Only one active primary Point per pincode
CREATE UNIQUE INDEX one_active_point_per_pincode ON public.pincode_allocations (pincode)
  WHERE status = 'active' AND holder_role = 'point';
-- Only one active holder per pincode per role level
CREATE UNIQUE INDEX one_active_holder_per_pincode_role ON public.pincode_allocations (pincode, holder_role)
  WHERE status = 'active';

-- AWB + piece ID sequence (server-side, never reused)
CREATE SEQUENCE public.awb_seq START 1;
CREATE OR REPLACE FUNCTION public.next_awb() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ SELECT 'DBX' || lpad(nextval('public.awb_seq')::text, 10, '0') $$;
CREATE OR REPLACE FUNCTION public.next_piece_code() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ SELECT 'DBXP' || lpad(nextval('public.awb_seq')::text, 11, '0') $$;

-- One piece row per physical parcel, linked to its master AWB shipment
CREATE TABLE public.shipment_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id),
  piece_code text NOT NULL UNIQUE,
  seq_no integer NOT NULL,
  total integer NOT NULL,
  weight_kg numeric,
  contents text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shipment_pieces TO authenticated;
GRANT ALL ON public.shipment_pieces TO service_role;
ALTER TABLE public.shipment_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pieces read" ON public.shipment_pieces FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_pieces.shipment_id
    AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'network')
      OR public.has_role(auth.uid(), 'point') OR public.has_role(auth.uid(), 'state_director')
      OR public.has_role(auth.uid(), 'state_manager') OR public.has_role(auth.uid(), 'area_manager'))));
CREATE POLICY "pieces insert" ON public.shipment_pieces FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_pieces.shipment_id AND s.user_id = auth.uid()));

-- Label print/reprint log
CREATE TABLE public.label_prints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id uuid NOT NULL REFERENCES public.shipment_pieces(id),
  printed_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.label_prints TO authenticated;
GRANT ALL ON public.label_prints TO service_role;
ALTER TABLE public.label_prints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "label prints read" ON public.label_prints FOR SELECT TO authenticated USING (
  printed_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "label prints insert" ON public.label_prints FOR INSERT TO authenticated WITH CHECK (
  printed_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.shipment_pieces p JOIN public.shipments s ON s.id = p.shipment_id
    WHERE p.id = label_prints.piece_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'network') OR public.has_role(auth.uid(), 'point'))));

-- Audit log for staff/admin actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated
  USING (actor = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Piece-level scan events
ALTER TABLE public.tracking_events ADD COLUMN piece_id uuid REFERENCES public.shipment_pieces(id);

-- Booking fields: payment mode/status, origin Point snapshot, piece count
ALTER TABLE public.shipments ADD COLUMN pieces_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.shipments ADD COLUMN payment_method text NOT NULL DEFAULT 'cash_on_pickup';
ALTER TABLE public.shipments ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.shipments ADD COLUMN origin_point_id uuid REFERENCES public.point_applications(id);
ALTER TABLE public.shipments ADD COLUMN routing_snapshot jsonb NOT NULL DEFAULT '{}';