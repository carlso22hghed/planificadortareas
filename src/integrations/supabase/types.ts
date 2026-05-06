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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      countdowns: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          target_date: string
          target_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          target_date: string
          target_time?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          target_date?: string
          target_time?: string
          user_id?: string
        }
        Relationships: []
      }
      dont_forget: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      nox_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_date: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_date?: string
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_date?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      nox_memory: {
        Row: {
          created_at: string
          id: string
          last_recommendation: Json | null
          memory_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_recommendation?: Json | null
          memory_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_recommendation?: Json | null
          memory_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          custom_role: string | null
          date_of_birth: string | null
          display_name: string
          email: string | null
          id: string
          is_active: boolean
          last_location: string | null
          onboarding_completed: boolean
          role: string
          status: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_role?: string | null
          date_of_birth?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_location?: string | null
          onboarding_completed?: boolean
          role?: string
          status?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_role?: string | null
          date_of_birth?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_location?: string | null
          onboarding_completed?: boolean
          role?: string
          status?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      schedule: {
        Row: {
          content: string
          created_at: string
          day_of_week: number
          id: string
          schedule_name: string
          time_slot: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          day_of_week: number
          id?: string
          schedule_name?: string
          time_slot: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          day_of_week?: number
          id?: string
          schedule_name?: string
          time_slot?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          attachments: string[] | null
          completed: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          estimated_minutes: number | null
          grade: string | null
          home_away: string | null
          id: string
          importance: string | null
          location: string | null
          name: string
          recurrence_rule: string | null
          reminder_date: string | null
          reminder_frequency: number | null
          reminder_time: string | null
          rival: string | null
          sort_order: number
          sport_type: string | null
          study_completed: boolean
          subject: string | null
          template_name: string | null
          type: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          grade?: string | null
          home_away?: string | null
          id?: string
          importance?: string | null
          location?: string | null
          name: string
          recurrence_rule?: string | null
          reminder_date?: string | null
          reminder_frequency?: number | null
          reminder_time?: string | null
          rival?: string | null
          sort_order?: number
          sport_type?: string | null
          study_completed?: boolean
          subject?: string | null
          template_name?: string | null
          type: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          grade?: string | null
          home_away?: string | null
          id?: string
          importance?: string | null
          location?: string | null
          name?: string
          recurrence_rule?: string | null
          reminder_date?: string | null
          reminder_frequency?: number | null
          reminder_time?: string | null
          rival?: string | null
          sort_order?: number
          sport_type?: string | null
          study_completed?: boolean
          subject?: string | null
          template_name?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_description: string
          badge_icon: string
          badge_key: string
          badge_name: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_description?: string
          badge_icon?: string
          badge_key: string
          badge_name: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_description?: string
          badge_icon?: string
          badge_key?: string
          badge_name?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string
          extra_storage_mb: number
          id: string
          level: number
          premium_days_remaining: number
          referral_code: string
          referral_count: number
          tasks_completed_total: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extra_storage_mb?: number
          id?: string
          level?: number
          premium_days_remaining?: number
          referral_code?: string
          referral_count?: number
          tasks_completed_total?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extra_storage_mb?: number
          id?: string
          level?: number
          premium_days_remaining?: number
          referral_code?: string
          referral_count?: number
          tasks_completed_total?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_settings: {
        Row: {
          app_name: string
          context_menu_order: string[]
          created_at: string
          custom_subjects: string[]
          dark_mode: boolean
          design_style: string
          dont_forget_enabled: boolean
          enabled_subjects: string[]
          font_family: string
          grouping_mode: string
          id: string
          nav_position: string
          notes_enabled: boolean
          notification_sound: boolean
          partidos_mode: string
          pomodoro_enabled: boolean
          schedule_tab_enabled: boolean
          school_background: string
          school_name: string
          sport_types: string[]
          tareas_enabled: boolean
          theme: string
          user_id: string
        }
        Insert: {
          app_name?: string
          context_menu_order?: string[]
          created_at?: string
          custom_subjects?: string[]
          dark_mode?: boolean
          design_style?: string
          dont_forget_enabled?: boolean
          enabled_subjects?: string[]
          font_family?: string
          grouping_mode?: string
          id?: string
          nav_position?: string
          notes_enabled?: boolean
          notification_sound?: boolean
          partidos_mode?: string
          pomodoro_enabled?: boolean
          schedule_tab_enabled?: boolean
          school_background?: string
          school_name?: string
          sport_types?: string[]
          tareas_enabled?: boolean
          theme?: string
          user_id: string
        }
        Update: {
          app_name?: string
          context_menu_order?: string[]
          created_at?: string
          custom_subjects?: string[]
          dark_mode?: boolean
          design_style?: string
          dont_forget_enabled?: boolean
          enabled_subjects?: string[]
          font_family?: string
          grouping_mode?: string
          id?: string
          nav_position?: string
          notes_enabled?: boolean
          notification_sound?: boolean
          partidos_mode?: string
          pomodoro_enabled?: boolean
          schedule_tab_enabled?: boolean
          school_background?: string
          school_name?: string
          sport_types?: string[]
          tareas_enabled?: boolean
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_notes: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          reminder_date: string | null
          reminder_frequency: number | null
          reminder_time: string | null
          title: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          reminder_date?: string | null
          reminder_frequency?: number | null
          reminder_time?: string | null
          title: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          reminder_date?: string | null
          reminder_frequency?: number | null
          reminder_time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      written_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          reminder_date: string | null
          reminder_frequency: number | null
          reminder_time: string | null
          title: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          reminder_date?: string | null
          reminder_frequency?: number | null
          reminder_time?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reminder_date?: string | null
          reminder_frequency?: number | null
          reminder_time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_unblock_minor: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
