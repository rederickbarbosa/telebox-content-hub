export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_home_settings: {
        Row: {
          channel_carousel_enabled: boolean | null
          created_at: string | null
          feature_1_description: string | null
          feature_1_title: string | null
          feature_2_description: string | null
          feature_2_title: string | null
          feature_3_description: string | null
          feature_3_title: string | null
          featured_channels_ids: string[] | null
          features_subtitle: string | null
          features_title: string | null
          hero_description: string | null
          id: string
          stats_canais_label: string | null
          stats_filmes_label: string | null
          stats_qualidade_descricao: string | null
          stats_qualidade_label: string | null
          stats_series_label: string | null
          updated_at: string | null
        }
        Insert: {
          channel_carousel_enabled?: boolean | null
          created_at?: string | null
          feature_1_description?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_title?: string | null
          featured_channels_ids?: string[] | null
          features_subtitle?: string | null
          features_title?: string | null
          hero_description?: string | null
          id?: string
          stats_canais_label?: string | null
          stats_filmes_label?: string | null
          stats_qualidade_descricao?: string | null
          stats_qualidade_label?: string | null
          stats_series_label?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_carousel_enabled?: boolean | null
          created_at?: string | null
          feature_1_description?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_title?: string | null
          featured_channels_ids?: string[] | null
          features_subtitle?: string | null
          features_title?: string | null
          hero_description?: string | null
          id?: string
          stats_canais_label?: string | null
          stats_filmes_label?: string | null
          stats_qualidade_descricao?: string | null
          stats_qualidade_label?: string | null
          stats_series_label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_plans: {
        Row: {
          created_at: string | null
          duration_months: number
          features: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          order_position: number | null
          original_price: number | null
          price: number
          savings: number | null
          updated_at: string | null
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string | null
          duration_months: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          order_position?: number | null
          original_price?: number | null
          price: number
          savings?: number | null
          updated_at?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string | null
          duration_months?: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          order_position?: number | null
          original_price?: number | null
          price?: number
          savings?: number | null
          updated_at?: string | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      apps: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          destaque: boolean | null
          download_url: string | null
          id: string
          logo_url: string | null
          nome: string
          plataforma: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          destaque?: boolean | null
          download_url?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plataforma: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          destaque?: boolean | null
          download_url?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plataforma?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      catalogo_m3u: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          grupo: string | null
          id: string
          metadata: Json | null
          nome: string
          qualidade: string | null
          regiao: string | null
          tipo: string
          tvg_id: string | null
          tvg_logo: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          grupo?: string | null
          id?: string
          metadata?: Json | null
          nome: string
          qualidade?: string | null
          regiao?: string | null
          tipo: string
          tvg_id?: string | null
          tvg_logo?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          grupo?: string | null
          id?: string
          metadata?: Json | null
          nome?: string
          qualidade?: string | null
          regiao?: string | null
          tipo?: string
          tvg_id?: string | null
          tvg_logo?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      catalogo_m3u_live: {
        Row: {
          ano: number | null
          ativo: boolean | null
          backdrop_url: string | null
          classificacao: number | null
          created_at: string | null
          descricao: string | null
          grupo: string | null
          id: string
          import_uuid: string | null
          logo: string | null
          nome: string
          poster_url: string | null
          qualidade: string | null
          tipo: string | null
          tmdb_id: number | null
          tvg_id: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          backdrop_url?: string | null
          classificacao?: number | null
          created_at?: string | null
          descricao?: string | null
          grupo?: string | null
          id?: string
          import_uuid?: string | null
          logo?: string | null
          nome: string
          poster_url?: string | null
          qualidade?: string | null
          tipo?: string | null
          tmdb_id?: number | null
          tvg_id?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          backdrop_url?: string | null
          classificacao?: number | null
          created_at?: string | null
          descricao?: string | null
          grupo?: string | null
          id?: string
          import_uuid?: string | null
          logo?: string | null
          nome?: string
          poster_url?: string | null
          qualidade?: string | null
          tipo?: string | null
          tmdb_id?: number | null
          tvg_id?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      conteudos: {
        Row: {
          ano: number | null
          backdrop_url: string | null
          classificacao: number | null
          created_at: string
          descricao: string | null
          disponivel: boolean | null
          generos: string[] | null
          id: string
          m3u_url: string | null
          nome: string
          nome_original: string | null
          pais: string | null
          poster_url: string | null
          tipo: string
          tmdb_id: number | null
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          backdrop_url?: string | null
          classificacao?: number | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean | null
          generos?: string[] | null
          id?: string
          m3u_url?: string | null
          nome: string
          nome_original?: string | null
          pais?: string | null
          poster_url?: string | null
          tipo: string
          tmdb_id?: number | null
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          backdrop_url?: string | null
          classificacao?: number | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean | null
          generos?: string[] | null
          id?: string
          m3u_url?: string | null
          nome?: string
          nome_original?: string | null
          pais?: string | null
          poster_url?: string | null
          tipo?: string
          tmdb_id?: number | null
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          canal_nome: string | null
          conteudo_id: string | null
          created_at: string | null
          data_envio: string | null
          id: string
          mensagem: string
          status: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          canal_nome?: string | null
          conteudo_id?: string | null
          created_at?: string | null
          data_envio?: string | null
          id?: string
          mensagem: string
          status?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          canal_nome?: string | null
          conteudo_id?: string | null
          created_at?: string | null
          data_envio?: string | null
          id?: string
          mensagem?: string
          status?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          foto_url: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"] | null
          time_favorito: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          foto_url?: string | null
          id?: string
          nome: string
          role?: Database["public"]["Enums"]["user_role"] | null
          time_favorito?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          time_favorito?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programacao: {
        Row: {
          canal_id: string | null
          canal_nome: string
          categoria: string | null
          created_at: string
          fim: string
          id: string
          inicio: string
          programa_descricao: string | null
          programa_nome: string
        }
        Insert: {
          canal_id?: string | null
          canal_nome: string
          categoria?: string | null
          created_at?: string
          fim: string
          id?: string
          inicio: string
          programa_descricao?: string | null
          programa_nome: string
        }
        Update: {
          canal_id?: string | null
          canal_nome?: string
          categoria?: string | null
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          programa_descricao?: string | null
          programa_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacao_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "conteudos"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          level: string
          message: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          level?: string
          message: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          level?: string
          message?: string
        }
        Relationships: []
      }
      tmdb_pending: {
        Row: {
          conteudo_id: string | null
          created_at: string | null
          id: string
          nome: string
          processed_at: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          conteudo_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          processed_at?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          conteudo_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          processed_at?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: []
      }
      user_content_status: {
        Row: {
          conteudo_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo_id: string
          created_at?: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_status_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_m3u: {
        Args: { current_import_uuid: string }
        Returns: undefined
      }
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      prune_catalogo: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_admin_setting: {
        Args: { key: string; value: string; description_text?: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "user" | "admin"
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
      user_role: ["user", "admin"],
    },
  },
} as const
