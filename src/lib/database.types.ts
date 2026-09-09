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
      blog_posts: {
        Row: {
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      composite_generation_attempts: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string
        }
        Relationships: []
      }
      composite_photos: {
        Row: {
          combo_key: string
          construction: string
          cover: string
          created_at: string
          error_message: string | null
          extras: string[]
          image_path: string | null
          pool_type: string
          shape: string
          status: string
          updated_at: string
        }
        Insert: {
          combo_key: string
          construction: string
          cover?: string
          created_at?: string
          error_message?: string | null
          extras?: string[]
          image_path?: string | null
          pool_type: string
          shape: string
          status?: string
          updated_at?: string
        }
        Update: {
          combo_key?: string
          construction?: string
          cover?: string
          created_at?: string
          error_message?: string | null
          extras?: string[]
          image_path?: string | null
          pool_type?: string
          shape?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dealer_service_areas: {
        Row: {
          city: string | null
          created_at: string
          dealer_id: string
          id: string
          state: string | null
          zip_code: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          dealer_id: string
          id?: string
          state?: string | null
          zip_code: string
        }
        Update: {
          city?: string | null
          created_at?: string
          dealer_id?: string
          id?: string
          state?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_service_areas_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      dealers: {
        Row: {
          business_name: string
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          primary_zip: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          business_name: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          primary_zip?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_name?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          primary_zip?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      fun_features: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      lead_fun_features: {
        Row: {
          feature_id: string
          lead_id: string
        }
        Insert: {
          feature_id: string
          lead_id: string
        }
        Update: {
          feature_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_fun_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "fun_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_fun_features_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget_range: string | null
          construction: string | null
          cover: string | null
          created_at: string
          dealer_id: string | null
          email: string
          filtration: string | null
          heater: string | null
          id: string
          matched_at: string | null
          name: string
          phone: string | null
          pool_size: string | null
          pool_type: string | null
          shape: string | null
          status: string
          timeline: string | null
          zip_code: string | null
        }
        Insert: {
          budget_range?: string | null
          construction?: string | null
          cover?: string | null
          created_at?: string
          dealer_id?: string | null
          email: string
          filtration?: string | null
          heater?: string | null
          id?: string
          matched_at?: string | null
          name: string
          phone?: string | null
          pool_size?: string | null
          pool_type?: string | null
          shape?: string | null
          status?: string
          timeline?: string | null
          zip_code?: string | null
        }
        Update: {
          budget_range?: string | null
          construction?: string | null
          cover?: string | null
          created_at?: string
          dealer_id?: string | null
          email?: string
          filtration?: string | null
          heater?: string | null
          id?: string
          matched_at?: string | null
          name?: string
          phone?: string | null
          pool_size?: string | null
          pool_type?: string | null
          shape?: string | null
          status?: string
          timeline?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_render_attempts: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string
        }
        Relationships: []
      }
      pool_renders: {
        Row: {
          combo_key: string
          construction: string
          cover: string
          created_at: string
          error_message: string | null
          extras: string[]
          image_path: string | null
          pool_type: string
          shape: string
          size: string
          status: string
          updated_at: string
        }
        Insert: {
          combo_key: string
          construction: string
          cover?: string
          created_at?: string
          error_message?: string | null
          extras?: string[]
          image_path?: string | null
          pool_type: string
          shape: string
          size?: string
          status?: string
          updated_at?: string
        }
        Update: {
          combo_key?: string
          construction?: string
          cover?: string
          created_at?: string
          error_message?: string | null
          extras?: string[]
          image_path?: string | null
          pool_type?: string
          shape?: string
          size?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
