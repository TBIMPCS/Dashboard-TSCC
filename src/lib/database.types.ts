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
      attachments: {
        Row: {
          case_id: string
          created_at: string
          id: string
          name: string
          path: string
          size: number
          uploaded_by: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          name: string
          path: string
          size: number
          uploaded_by?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          name?: string
          path?: string
          size?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_notes: {
        Row: {
          date: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          note: string
          user_id?: string
        }
        Update: {
          date?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          body: string
          case_id: string
          created_at: string
          id: string
          next_status: string
          previous_status: string
          visibility: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name: string
          body?: string
          case_id: string
          created_at?: string
          id?: string
          next_status?: string
          previous_status?: string
          visibility?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          next_status?: string
          previous_status?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activity_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_comments: {
        Row: {
          author_id: string
          author_name: string
          body: string
          case_id: string
          created_at: string
          id: string
          visibility: string
        }
        Insert: {
          author_id?: string
          author_name?: string
          body: string
          case_id: string
          created_at?: string
          id?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_internal: {
        Row: {
          case_id: string
          internal_note: string
          legacy_source: Json | null
        }
        Insert: {
          case_id: string
          internal_note?: string
          legacy_source?: Json | null
        }
        Update: {
          case_id?: string
          internal_note?: string
          legacy_source?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "case_internal_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          actual_handling_hours: number | null
          additional_info: string
          category: string
          channel: string
          closure_date: string | null
          closure_reason: string
          collaborator_ids: string[]
          collaborator_names: string[]
          complexity: string
          contact: string
          counterpart: string
          created_at: string
          created_by: string | null
          customer_name: string
          description: string
          draft_reason: string
          escalation_reason: string
          escalation_status: string
          follow_up_date: string | null
          id: string
          involvement: string
          is_draft: boolean
          lifecycle: string
          primary_pic_id: string | null
          primary_pic_name: string
          priority: string
          product: string
          raw_category: string
          reference_no: string
          region: string
          reopened: boolean
          requester_id: string | null
          requester_name: string
          requester_unit: string
          resolution_summary: string
          segment: string
          source_batch: string | null
          subcategory: string
          subject: string
          supporting_unit: string
          ticket: string
          updated_at: string
          waiting_hours: number
          waiting_since: string | null
        }
        Insert: {
          actual_handling_hours?: number | null
          additional_info?: string
          category?: string
          channel?: string
          closure_date?: string | null
          closure_reason?: string
          collaborator_ids?: string[]
          collaborator_names?: string[]
          complexity?: string
          contact?: string
          counterpart?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          description?: string
          draft_reason?: string
          escalation_reason?: string
          escalation_status?: string
          follow_up_date?: string | null
          id?: string
          involvement?: string
          is_draft?: boolean
          lifecycle?: string
          primary_pic_id?: string | null
          primary_pic_name?: string
          priority?: string
          product?: string
          raw_category?: string
          reference_no?: string
          region?: string
          reopened?: boolean
          requester_id?: string | null
          requester_name?: string
          requester_unit?: string
          resolution_summary?: string
          segment?: string
          source_batch?: string | null
          subcategory?: string
          subject?: string
          supporting_unit?: string
          ticket?: string
          updated_at?: string
          waiting_hours?: number
          waiting_since?: string | null
        }
        Update: {
          actual_handling_hours?: number | null
          additional_info?: string
          category?: string
          channel?: string
          closure_date?: string | null
          closure_reason?: string
          collaborator_ids?: string[]
          collaborator_names?: string[]
          complexity?: string
          contact?: string
          counterpart?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          description?: string
          draft_reason?: string
          escalation_reason?: string
          escalation_status?: string
          follow_up_date?: string | null
          id?: string
          involvement?: string
          is_draft?: boolean
          lifecycle?: string
          primary_pic_id?: string | null
          primary_pic_name?: string
          priority?: string
          product?: string
          raw_category?: string
          reference_no?: string
          region?: string
          reopened?: boolean
          requester_id?: string | null
          requester_name?: string
          requester_unit?: string
          resolution_summary?: string
          segment?: string
          source_batch?: string | null
          subcategory?: string
          subject?: string
          supporting_unit?: string
          ticket?: string
          updated_at?: string
          waiting_hours?: number
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_primary_pic_id_fkey"
            columns: ["primary_pic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration: {
        Row: {
          id: boolean
          value: Json
        }
        Insert: {
          id?: boolean
          value: Json
        }
        Update: {
          id?: boolean
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          language: string
          npp: string
          phone: string
          region: string
          role: string
          unit: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          language?: string
          npp?: string
          phone?: string
          region?: string
          role?: string
          unit?: string
          username?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          language?: string
          npp?: string
          phone?: string
          region?: string
          role?: string
          unit?: string
          username?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          case_id: string
          completed: boolean
          due_at: string
          id: string
          note: string
          owner_id: string
        }
        Insert: {
          case_id: string
          completed?: boolean
          due_at: string
          id?: string
          note?: string
          owner_id?: string
        }
        Update: {
          case_id?: string
          completed?: boolean
          due_at?: string
          id?: string
          note?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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

