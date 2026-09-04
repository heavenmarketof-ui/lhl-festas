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
      contrato_parcelas: {
        Row: {
          contrato_cliente: string
          contrato_id: string
          created_at: string
          id: string
          lancamento_id: string | null
          numero: number
          observacoes: string | null
          pago_em: string | null
          status: string
          total: number
          updated_at: string
          valor: number
          valor_pago: number | null
          vencimento: string | null
        }
        Insert: {
          contrato_cliente?: string
          contrato_id: string
          created_at?: string
          id?: string
          lancamento_id?: string | null
          numero: number
          observacoes?: string | null
          pago_em?: string | null
          status?: string
          total: number
          updated_at?: string
          valor?: number
          valor_pago?: number | null
          vencimento?: string | null
        }
        Update: {
          contrato_cliente?: string
          contrato_id?: string
          created_at?: string
          id?: string
          lancamento_id?: string | null
          numero?: number
          observacoes?: string | null
          pago_em?: string | null
          status?: string
          total?: number
          updated_at?: string
          valor?: number
          valor_pago?: number | null
          vencimento?: string | null
        }
        Relationships: []
      }
      heaven_leads: {
        Row: {
          atuacao: string[] | null
          cidade: string | null
          created_at: string
          data_proximo_acompanhamento: string | null
          data_ultimo_contato: string | null
          dificuldade: string | null
          email: string
          empresa: string
          estado: string | null
          id: string
          instagram: string | null
          nome: string
          notificacao_email_erro: string | null
          notificacao_email_status: string | null
          observacoes: string | null
          organizacao_hoje: string | null
          origem: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          atuacao?: string[] | null
          cidade?: string | null
          created_at?: string
          data_proximo_acompanhamento?: string | null
          data_ultimo_contato?: string | null
          dificuldade?: string | null
          email: string
          empresa: string
          estado?: string | null
          id?: string
          instagram?: string | null
          nome: string
          notificacao_email_erro?: string | null
          notificacao_email_status?: string | null
          observacoes?: string | null
          organizacao_hoje?: string | null
          origem?: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          atuacao?: string[] | null
          cidade?: string | null
          created_at?: string
          data_proximo_acompanhamento?: string | null
          data_ultimo_contato?: string | null
          dificuldade?: string | null
          email?: string
          empresa?: string
          estado?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          notificacao_email_erro?: string | null
          notificacao_email_status?: string | null
          observacoes?: string | null
          organizacao_hoje?: string | null
          origem?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cidade_uf: string
          cpf: string
          created_at: string
          email: string
          endereco: string
          id: string
          modalidade: string
          nome: string
          plano: string
          rg: string
          status: Database["public"]["Enums"]["order_status"]
          telefone: string
          tema: string
          updated_at: string
        }
        Insert: {
          cidade_uf: string
          cpf: string
          created_at?: string
          email: string
          endereco: string
          id?: string
          modalidade: string
          nome: string
          plano: string
          rg: string
          status?: Database["public"]["Enums"]["order_status"]
          telefone: string
          tema: string
          updated_at?: string
        }
        Update: {
          cidade_uf?: string
          cpf?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          modalidade?: string
          nome?: string
          plano?: string
          rg?: string
          status?: Database["public"]["Enums"]["order_status"]
          telefone?: string
          tema?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_financeiras: {
        Row: {
          autorizado_em: string | null
          autorizado_por: string | null
          autorizado_por_email: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          cancelado_por_email: string | null
          categoria: string
          conta: string
          created_at: string
          criado_por: string | null
          criado_por_email: string | null
          data_prevista: string | null
          descricao: string
          editado_em: string | null
          editado_por: string | null
          editado_por_email: string | null
          forma_pagamento: string
          fornecedor: string | null
          id: string
          itens: Json
          lancado_em: string | null
          lancamento_id: string | null
          observacoes: string | null
          ordem_producao: string | null
          origem: string
          origem_item_id: string | null
          pedido_cliente: string | null
          pedido_id: string | null
          recusa_motivo: string | null
          recusado_em: string | null
          recusado_por: string | null
          recusado_por_email: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          autorizado_em?: string | null
          autorizado_por?: string | null
          autorizado_por_email?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          cancelado_por_email?: string | null
          categoria?: string
          conta?: string
          created_at?: string
          criado_por?: string | null
          criado_por_email?: string | null
          data_prevista?: string | null
          descricao?: string
          editado_em?: string | null
          editado_por?: string | null
          editado_por_email?: string | null
          forma_pagamento?: string
          fornecedor?: string | null
          id?: string
          itens?: Json
          lancado_em?: string | null
          lancamento_id?: string | null
          observacoes?: string | null
          ordem_producao?: string | null
          origem?: string
          origem_item_id?: string | null
          pedido_cliente?: string | null
          pedido_id?: string | null
          recusa_motivo?: string | null
          recusado_em?: string | null
          recusado_por?: string | null
          recusado_por_email?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          autorizado_em?: string | null
          autorizado_por?: string | null
          autorizado_por_email?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          cancelado_por_email?: string | null
          categoria?: string
          conta?: string
          created_at?: string
          criado_por?: string | null
          criado_por_email?: string | null
          data_prevista?: string | null
          descricao?: string
          editado_em?: string | null
          editado_por?: string | null
          editado_por_email?: string | null
          forma_pagamento?: string
          fornecedor?: string | null
          id?: string
          itens?: Json
          lancado_em?: string | null
          lancamento_id?: string | null
          observacoes?: string | null
          ordem_producao?: string | null
          origem?: string
          origem_item_id?: string | null
          pedido_cliente?: string | null
          pedido_id?: string | null
          recusa_motivo?: string | null
          recusado_em?: string | null
          recusado_por?: string | null
          recusado_por_email?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      solicitacoes_financeiras_eventos: {
        Row: {
          acao: string
          ator: string | null
          ator_email: string | null
          created_at: string
          detalhe: string | null
          id: string
          solicitacao_id: string
        }
        Insert: {
          acao: string
          ator?: string | null
          ator_email?: string | null
          created_at?: string
          detalhe?: string | null
          id?: string
          solicitacao_id: string
        }
        Update: {
          acao?: string
          ator?: string | null
          ator_email?: string | null
          created_at?: string
          detalhe?: string | null
          id?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_financeiras_eventos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_financeiras"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      order_status: "pendente" | "em_andamento" | "concluido" | "cancelado"
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
      app_role: ["admin", "user"],
      order_status: ["pendente", "em_andamento", "concluido", "cancelado"],
    },
  },
} as const
