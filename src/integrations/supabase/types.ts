export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          cash_on_pickup: boolean
          id: boolean
          updated_at: string
        }
        Insert: {
          cash_on_pickup?: boolean
          id?: boolean
          updated_at?: string
        }
        Update: {
          cash_on_pickup?: boolean
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      bag_items: {
        Row: {
          added_by: string
          bag_id: string
          created_at: string
          id: string
          piece_id: string
        }
        Insert: {
          added_by: string
          bag_id: string
          created_at?: string
          id?: string
          piece_id: string
        }
        Update: {
          added_by?: string
          bag_id?: string
          created_at?: string
          id?: string
          piece_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bag_items_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bag_items_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "shipment_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      bags: {
        Row: {
          bag_code: string
          created_at: string
          created_by: string
          destination: string
          id: string
          manifest_id: string | null
          seal_no: string | null
          sealed_at: string | null
          status: string
        }
        Insert: {
          bag_code: string
          created_at?: string
          created_by: string
          destination: string
          id?: string
          manifest_id?: string | null
          seal_no?: string | null
          sealed_at?: string | null
          status?: string
        }
        Update: {
          bag_code?: string
          created_at?: string
          created_by?: string
          destination?: string
          id?: string
          manifest_id?: string | null
          seal_no?: string | null
          sealed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bags_manifest_fk"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount: number
          id: string
          shipment_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount: number
          id?: string
          shipment_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount?: number
          id?: string
          shipment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_discount: number | null
          max_uses: number | null
          min_order: number
          per_user_limit: number
          starts_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number
          per_user_limit?: number
          starts_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number
          per_user_limit?: number
          starts_at?: string
          used_count?: number
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          checked_at: string
          details: Json
          id: string
          latency_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          details?: Json
          id?: string
          latency_ms?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          details?: Json
          id?: string
          latency_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      label_prints: {
        Row: {
          created_at: string
          id: string
          piece_id: string
          printed_by: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          piece_id: string
          printed_by: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          piece_id?: string
          printed_by?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_prints_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "shipment_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      manifests: {
        Row: {
          created_at: string
          created_by: string
          from_location: string
          id: string
          manifest_code: string
          received_at: string | null
          received_by: string | null
          status: string
          to_location: string
          vehicle_no: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          from_location: string
          id?: string
          manifest_code: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_location: string
          vehicle_no?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          from_location?: string
          id?: string
          manifest_code?: string
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_location?: string
          vehicle_no?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          error: string | null
          id: string
          kind: string
          meta: Json
          recipient: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          meta?: Json
          recipient?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          meta?: Json
          recipient?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          mode: string
          provider: string
          provider_ref: string | null
          shipment_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          mode?: string
          provider?: string
          provider_ref?: string | null
          shipment_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          mode?: string
          provider?: string
          provider_ref?: string | null
          shipment_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      pincode_allocations: {
        Row: {
          assigned_by: string
          created_at: string
          effective_from: string
          effective_to: string | null
          holder_role: Database["public"]["Enums"]["app_role"]
          holder_user_id: string
          id: string
          note: string | null
          pincode: string
          status: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          holder_role: Database["public"]["Enums"]["app_role"]
          holder_user_id: string
          id?: string
          note?: string | null
          pincode: string
          status?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          holder_role?: Database["public"]["Enums"]["app_role"]
          holder_user_id?: string
          id?: string
          note?: string | null
          pincode?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pincode_allocations_pincode_fkey"
            columns: ["pincode"]
            isOneToOne: false
            referencedRelation: "pincodes"
            referencedColumns: ["pincode"]
          },
        ]
      }
      pincodes: {
        Row: {
          active: boolean
          city: string
          hub_name: string | null
          pincode: string
          state: string
          tier: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean
          city: string
          hub_name?: string | null
          pincode: string
          state: string
          tier?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean
          city?: string
          hub_name?: string | null
          pincode?: string
          state?: string
          tier?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      point_applications: {
        Row: {
          address: string
          business_name: string
          business_type: string
          city: string
          created_at: string
          daily_capacity: number | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          pincode: string
          reference: string
          space_sqft: number | null
          state: string
          status: string
          user_id: string | null
        }
        Insert: {
          address: string
          business_name: string
          business_type: string
          city: string
          created_at?: string
          daily_capacity?: number | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          pincode: string
          reference?: string
          space_sqft?: number | null
          state: string
          status?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          business_name?: string
          business_type?: string
          city?: string
          created_at?: string
          daily_capacity?: number | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          pincode?: string
          reference?: string
          space_sqft?: number | null
          state?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      point_commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          point_user_id: string
          rate: number
          settled_at: string | null
          settled_by: string | null
          shipment_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          point_user_id: string
          rate: number
          settled_at?: string | null
          settled_by?: string | null
          shipment_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          point_user_id?: string
          rate?: number
          settled_at?: string | null
          settled_by?: string | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_commissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: true
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          business_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean
          updated_at: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          created_at: string
          id: string
          kind: string
          pickup_at: string | null
          reason: string
          requested_by: string
          restocking_status: string
          return_awb: string | null
          shipment_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          pickup_at?: string | null
          reason: string
          requested_by: string
          restocking_status?: string
          return_awb?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          pickup_at?: string | null
          reason?: string
          requested_by?: string
          restocking_status?: string
          return_awb?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      service_rates: {
        Row: {
          active: boolean
          base: number
          per_kg: number
          service: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base?: number
          per_kg?: number
          service: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base?: number
          per_kg?: number
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipment_pieces: {
        Row: {
          box_preset: string | null
          contents: string | null
          created_at: string
          dims: Json | null
          id: string
          piece_code: string
          seq_no: number
          shipment_id: string
          total: number
          weight_kg: number | null
        }
        Insert: {
          box_preset?: string | null
          contents?: string | null
          created_at?: string
          dims?: Json | null
          id?: string
          piece_code: string
          seq_no: number
          shipment_id: string
          total: number
          weight_kg?: number | null
        }
        Update: {
          box_preset?: string | null
          contents?: string | null
          created_at?: string
          dims?: Json | null
          id?: string
          piece_code?: string
          seq_no?: number
          shipment_id?: string
          total?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_pieces_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          contents: string | null
          coupon_code: string | null
          created_at: string
          declared_value: number | null
          dims: Json | null
          discount: number
          id: string
          origin_point_id: string | null
          payment_method: string
          payment_status: string
          pickup_lat: number | null
          pickup_lng: number | null
          pieces_count: number
          price: number
          receiver_address: string
          receiver_city: string
          receiver_name: string
          receiver_phone: string
          receiver_pincode: string
          routing_snapshot: Json
          sender_address: string
          sender_city: string
          sender_name: string
          sender_phone: string
          sender_pincode: string
          service: string
          status: string
          tracking_number: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          contents?: string | null
          coupon_code?: string | null
          created_at?: string
          declared_value?: number | null
          dims?: Json | null
          discount?: number
          id?: string
          origin_point_id?: string | null
          payment_method?: string
          payment_status?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pieces_count?: number
          price: number
          receiver_address: string
          receiver_city: string
          receiver_name: string
          receiver_phone: string
          receiver_pincode: string
          routing_snapshot?: Json
          sender_address: string
          sender_city: string
          sender_name: string
          sender_phone: string
          sender_pincode: string
          service?: string
          status?: string
          tracking_number: string
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          contents?: string | null
          coupon_code?: string | null
          created_at?: string
          declared_value?: number | null
          dims?: Json | null
          discount?: number
          id?: string
          origin_point_id?: string | null
          payment_method?: string
          payment_status?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pieces_count?: number
          price?: number
          receiver_address?: string
          receiver_city?: string
          receiver_name?: string
          receiver_phone?: string
          receiver_pincode?: string
          routing_snapshot?: Json
          sender_address?: string
          sender_city?: string
          sender_name?: string
          sender_phone?: string
          sender_pincode?: string
          service?: string
          status?: string
          tracking_number?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_origin_point_id_fkey"
            columns: ["origin_point_id"]
            isOneToOne: false
            referencedRelation: "point_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_scopes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          point_id: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          state: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          point_id?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          state?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          point_id?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          state?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_scopes_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "point_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          id: string
          location: string | null
          note: string | null
          piece_id: string | null
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          piece_id?: string | null
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          piece_id?: string | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "shipment_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_piece_to_bag: {
        Args: { _bag_id: string; _code: string }
        Returns: Json
      }
      admin_exists: { Args: never; Returns: boolean }
      allocate_pincode: {
        Args: {
          _holder: string
          _holder_role: Database["public"]["Enums"]["app_role"]
          _note?: string
          _pincode: string
        }
        Returns: string
      }
      can_access_pincode: {
        Args: { _pin: string; _user: string }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: boolean }
      create_bag: { Args: { _destination: string }; Returns: Json }
      create_manifest: {
        Args: {
          _bag_ids: string[]
          _from: string
          _to: string
          _vehicle: string
        }
        Returns: Json
      }
      create_return: {
        Args: { _awb: string; _kind: string; _reason: string }
        Returns: Json
      }
      dashboard_summary: { Args: never; Returns: Json }
      find_user_by_phone: {
        Args: { _phone: string }
        Returns: {
          full_name: string
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      grant_staff_role: {
        Args: {
          _point_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _state?: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_pincodes: { Args: { _rows: Json }; Returns: number }
      is_staff: { Args: { _u: string }; Returns: boolean }
      next_awb: { Args: never; Returns: string }
      next_piece_code: { Args: never; Returns: string }
      receive_manifest: { Args: { _manifest_id: string }; Returns: undefined }
      release_pincode: { Args: { _allocation_id: string }; Returns: undefined }
      scan_piece: {
        Args: {
          _code: string
          _location?: string
          _note?: string
          _status: string
        }
        Returns: Json
      }
      seal_bag: { Args: { _bag_id: string; _seal: string }; Returns: undefined }
      settle_commissions: { Args: { _ids: string[] }; Returns: number }
      staff_directory: {
        Args: never
        Returns: {
          full_name: string
          phone: string
          roles: string[]
          states: string[]
          user_id: string
        }[]
      }
      track_shipment: { Args: { _tracking: string }; Returns: Json }
      transfer_pincode: {
        Args: { _allocation_id: string; _new_holder: string; _note?: string }
        Returns: string
      }
      update_return_status: {
        Args: { _return_id: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "point"
        | "network"
        | "state_director"
        | "state_manager"
        | "area_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "point",
        "network",
        "state_director",
        "state_manager",
        "area_manager",
      ],
    },
  },
} as const
