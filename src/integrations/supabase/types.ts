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
      auth_nonces: {
        Row: {
          created_at: string
          expires_at: string
          nonce: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          nonce: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          nonce?: string
          wallet_address?: string
        }
        Relationships: []
      }
      capital_locks: {
        Row: {
          investment_id: string
          unlock_at: string
          unlocked_at: string | null
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          investment_id: string
          unlock_at: string
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          investment_id?: string
          unlock_at?: string
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_locks_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: true
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_state: {
        Row: {
          last_claim_at: string | null
          user_id: string
        }
        Insert: {
          last_claim_at?: string | null
          user_id: string
        }
        Update: {
          last_claim_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          block_number: number | null
          created_at: string
          from_address: string | null
          id: string
          investment_id: string | null
          note: string | null
          package_amount: number
          status: string
          to_address: string | null
          tx_hash: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          block_number?: number | null
          created_at?: string
          from_address?: string | null
          id?: string
          investment_id?: string | null
          note?: string | null
          package_amount: number
          status?: string
          to_address?: string | null
          tx_hash: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          block_number?: number | null
          created_at?: string
          from_address?: string | null
          id?: string
          investment_id?: string | null
          note?: string | null
          package_amount?: number
          status?: string
          to_address?: string | null
          tx_hash?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          activated_at: string
          amount: number
          cap_amount: number
          earned_passive: number
          id: string
          status: Database["public"]["Enums"]["investment_status"]
          user_id: string
        }
        Insert: {
          activated_at?: string
          amount: number
          cap_amount: number
          earned_passive?: number
          id?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id: string
        }
        Update: {
          activated_at?: string
          amount?: number
          cap_amount?: number
          earned_passive?: number
          id?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          meta: Json
          ref_investment_id: string | null
          ref_user_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          meta?: Json
          ref_investment_id?: string | null
          ref_user_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          meta?: Json
          ref_investment_id?: string | null
          ref_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          joined_at: string
          sponsor_code: string
          sponsor_id: string | null
          updated_at: string
          username: string
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          joined_at?: string
          sponsor_code: string
          sponsor_id?: string | null
          updated_at?: string
          username: string
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          sponsor_code?: string
          sponsor_id?: string | null
          updated_at?: string
          username?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_levels: {
        Row: {
          active: boolean
          direct_min: number
          level: number
          self_invest_min: number
          team_invest_min: number
          team_min: number
          weekly_amount: number
        }
        Insert: {
          active?: boolean
          direct_min: number
          level: number
          self_invest_min: number
          team_invest_min: number
          team_min: number
          weekly_amount: number
        }
        Update: {
          active?: boolean
          direct_min?: number
          level?: number
          self_invest_min?: number
          team_invest_min?: number
          team_min?: number
          weekly_amount?: number
        }
        Relationships: []
      }
      salary_payouts: {
        Row: {
          amount: number
          id: string
          level: number
          paid_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          amount: number
          id?: string
          level: number
          paid_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          amount?: number
          id?: string
          level?: number
          paid_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          announcement: string | null
          capital_lock_days: number
          claim_interval_hours: number
          daily_pct: number
          demo_deposit_mode: boolean
          deposit_min_confirmations: number
          deposit_token_contract: string
          deposit_wallet_address: string | null
          id: number
          l1_pct: number
          l2_pct: number
          l3_pct: number
          maintenance_mode: boolean
          min_directs_for_all_levels: number
          updated_at: string
        }
        Insert: {
          announcement?: string | null
          capital_lock_days?: number
          claim_interval_hours?: number
          daily_pct?: number
          demo_deposit_mode?: boolean
          deposit_min_confirmations?: number
          deposit_token_contract?: string
          deposit_wallet_address?: string | null
          id?: number
          l1_pct?: number
          l2_pct?: number
          l3_pct?: number
          maintenance_mode?: boolean
          min_directs_for_all_levels?: number
          updated_at?: string
        }
        Update: {
          announcement?: string | null
          capital_lock_days?: number
          claim_interval_hours?: number
          daily_pct?: number
          demo_deposit_mode?: boolean
          deposit_min_confirmations?: number
          deposit_token_contract?: string
          deposit_wallet_address?: string | null
          id?: number
          l1_pct?: number
          l2_pct?: number
          l3_pct?: number
          maintenance_mode?: boolean
          min_directs_for_all_levels?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["withdrawal_kind"]
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["withdrawal_kind"]
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["withdrawal_kind"]
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_by_level: {
        Args: { _level: number; _user_id: string }
        Returns: {
          earnings: number
          id: string
          investment: number
          joined_at: string
          username: string
          wallet_address: string
        }[]
      }
      get_user_stats: {
        Args: { _user_id: string }
        Returns: {
          available_balance: number
          direct_income: number
          direct_partners: number
          last_24h_earnings: number
          passive_income: number
          salary_income: number
          team_income: number
          total_claimed: number
          total_earnings: number
          total_investment: number
          total_team: number
        }[]
      }
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
      investment_status: "active" | "capped"
      ledger_kind:
        | "package_activation"
        | "deposit"
        | "passive"
        | "direct_commission"
        | "level_commission"
        | "salary"
        | "claim_debit"
        | "withdrawal_hold"
        | "withdrawal_refund"
        | "capital_withdrawal"
        | "reinvest"
      withdrawal_kind: "income" | "capital"
      withdrawal_status: "pending" | "approved" | "rejected"
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
      investment_status: ["active", "capped"],
      ledger_kind: [
        "package_activation",
        "deposit",
        "passive",
        "direct_commission",
        "level_commission",
        "salary",
        "claim_debit",
        "withdrawal_hold",
        "withdrawal_refund",
        "capital_withdrawal",
        "reinvest",
      ],
      withdrawal_kind: ["income", "capital"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
