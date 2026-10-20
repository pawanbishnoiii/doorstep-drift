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
          pincode: string
          state: string
          tier: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean
          city: string
          pincode: string
          state: string
          tier?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean
          city?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      shipment_pieces: {
        Row: {
          contents: string | null
          created_at: string
          id: string
          piece_code: string
          seq_no: number
          shipment_id: string
          total: number
          weight_kg: number | null
        }
        Insert: {
          contents?: string | null
          created_at?: string
          id?: string
          piece_code: string
          seq_no: number
          shipment_id: string
          total: number
          weight_kg?: number | null
        }
        Update: {
          contents?: string | null
          created_at?: string
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
          created_at: string
          declared_value: number | null
          id: string
          origin_point_id: string | null
          payment_method: string
          payment_status: string
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
          created_at?: string
          declared_value?: number | null
          id?: string
          origin_point_id?: string | null
          payment_method?: string
          payment_status?: string
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
          created_at?: string
          declared_value?: number | null
          id?: string
          origin_point_id?: string | null
          payment_method?: string
          payment_status?: string
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
      next_awb: { Args: never; Returns: string }
      next_piece_code: { Args: never; Returns: string }
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
      track_shipment: { Args: { _tracking: string }; Returns: Json }
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
