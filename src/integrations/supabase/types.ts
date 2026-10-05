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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_rate_limits: {
        Row: {
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      event_members: {
        Row: {
          event_id: string
          family_id: string
          joined_at: string
        }
        Insert: {
          event_id: string
          family_id: string
          joined_at?: string
        }
        Update: {
          event_id?: string
          family_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_family_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          kind?: string
          name?: string
          owner_family_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_family_id?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          family_id: string
          last_seen: string
          name: string
          role: string
        }
        Insert: {
          family_id: string
          last_seen?: string
          name: string
          role?: string
        }
        Update: {
          family_id?: string
          last_seen?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_memberships: {
        Row: {
          created_at: string
          family_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_product_history: {
        Row: {
          category: string
          count: number
          family_id: string
          last_used: string
          name: string
        }
        Insert: {
          category?: string
          count?: number
          family_id: string
          last_used?: string
          name: string
        }
        Update: {
          category?: string
          count?: number
          family_id?: string
          last_used?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_product_history_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          added_by: string
          archived: boolean
          category: string
          completed: boolean
          created_at: string
          expiry_date: string | null
          family_id: string
          id: string
          name: string
          notes: string
          out_of_stock: boolean
          quantity: number
          stock_status: string
          store_id: string | null
          unit: string
        }
        Insert: {
          added_by?: string
          archived?: boolean
          category?: string
          completed?: boolean
          created_at?: string
          expiry_date?: string | null
          family_id: string
          id?: string
          name: string
          notes?: string
          out_of_stock?: boolean
          quantity?: number
          stock_status?: string
          store_id?: string | null
          unit?: string
        }
        Update: {
          added_by?: string
          archived?: boolean
          category?: string
          completed?: boolean
          created_at?: string
          expiry_date?: string | null
          family_id?: string
          id?: string
          name?: string
          notes?: string
          out_of_stock?: boolean
          quantity?: number
          stock_status?: string
          store_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      join_attempts: {
        Row: {
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      online_order_items: {
        Row: {
          category: string
          id: string
          name: string
          notes: string
          order_id: string
          quantity: number
          unit: string
        }
        Insert: {
          category?: string
          id?: string
          name: string
          notes?: string
          order_id: string
          quantity?: number
          unit?: string
        }
        Update: {
          category?: string
          id?: string
          name?: string
          notes?: string
          order_id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      online_orders: {
        Row: {
          family_id: string
          id: string
          ordered_at: string
          received_at: string | null
          status: string
          store_id: string
        }
        Insert: {
          family_id: string
          id?: string
          ordered_at?: string
          received_at?: string | null
          status?: string
          store_id: string
        }
        Update: {
          family_id?: string
          id?: string
          ordered_at?: string
          received_at?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string
          family_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          display_name?: string
          family_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          family_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_default: boolean
          is_online_only: boolean
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_default?: boolean
          is_online_only?: boolean
          name: string
          url?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_default?: boolean
          is_online_only?: boolean
          name?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ai_quota: { Args: { _limit?: number }; Returns: boolean }
      create_online_order: { Args: { _store_id: string }; Returns: string }
      is_family_member: { Args: { _fid: string }; Returns: boolean }
      join_event: {
        Args: { _event_id: string; _family_id: string }
        Returns: string
      }
      join_family: { Args: { _id: string; _name: string }; Returns: undefined }
      merge_family_items: {
        Args: { _from: string; _to: string }
        Returns: number
      }
      receive_online_order: { Args: { _order_id: string }; Returns: number }
      record_family_purchase: {
        Args: { _category: string; _family_id: string; _name: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
