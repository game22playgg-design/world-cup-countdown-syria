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
      bracket_slots: {
        Row: {
          flag: string | null
          name_ar: string | null
          slot_id: string
          updated_at: string
        }
        Insert: {
          flag?: string | null
          name_ar?: string | null
          slot_id: string
          updated_at?: string
        }
        Update: {
          flag?: string | null
          name_ar?: string | null
          slot_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_reminders: {
        Row: {
          match_id: string
          sent_at: string
        }
        Insert: {
          match_id: string
          sent_at?: string
        }
        Update: {
          match_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      match_results: {
        Row: {
          advance_pick: string | null
          away_score: number
          finished_at: string
          highlights_url: string | null
          home_score: number
          match_id: string
          updated_at: string
        }
        Insert: {
          advance_pick?: string | null
          away_score: number
          finished_at?: string
          highlights_url?: string | null
          home_score: number
          match_id: string
          updated_at?: string
        }
        Update: {
          advance_pick?: string | null
          away_score?: number
          finished_at?: string
          highlights_url?: string | null
          home_score?: number
          match_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      points_notifications: {
        Row: {
          match_id: string
          points: number
          sent_at: string
          user_id: string
        }
        Insert: {
          match_id: string
          points: number
          sent_at?: string
          user_id: string
        }
        Update: {
          match_id?: string
          points?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          advance_pick: string | null
          away_score: number
          home_score: number
          id: string
          locked_at: string
          match_id: string
          points: number | null
          user_id: string
        }
        Insert: {
          advance_pick?: string | null
          away_score: number
          home_score: number
          id?: string
          locked_at?: string
          match_id: string
          points?: number | null
          user_id: string
        }
        Update: {
          advance_pick?: string | null
          away_score?: number
          home_score?: number
          id?: string
          locked_at?: string
          match_id?: string
          points?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bonus_points: number
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          username: string
        }
        Insert: {
          bonus_points?: number
          created_at?: string
          email?: string | null
          id: string
          is_admin?: boolean
          username: string
        }
        Update: {
          bonus_points?: number
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      top_scorers: {
        Row: {
          country_ar: string | null
          country_flag: string | null
          created_at: string
          goals: number
          id: string
          name_ar: string
          name_en: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          country_ar?: string | null
          country_flag?: string | null
          created_at?: string
          goals?: number
          id?: string
          name_ar: string
          name_en?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          country_ar?: string | null
          country_flag?: string | null
          created_at?: string
          goals?: number
          id?: string
          name_ar?: string
          name_en?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          exact_count: number | null
          finished_count: number | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calc_points: {
        Args: { aa: number; ah: number; pa: number; ph: number }
        Returns: number
      }
      calc_points_v2: {
        Args: {
          a_adv: string
          aa: number
          ah: number
          p_adv: string
          pa: number
          ph: number
        }
        Returns: number
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
