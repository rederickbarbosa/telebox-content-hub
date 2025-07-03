export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      [_ in never]: never
    }
    Enums: {
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
