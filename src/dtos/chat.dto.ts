export interface CreateConversationDto {
  tipo: 'direct' | 'grupo';
  titulo?: string;
  participantes: string[];
}

export interface SendMessageDto {
  conteudo: string;
  tipo?: string;
}

export interface ConversationResponse {
  id_conversa: string;
  tipo: string;
  titulo?: string;
  criada_em: Date;
  atualizada_em: Date;
  ultima_mensagem?: MessageResponse;
  participantes: ParticipantResponse[];
}

export interface MessageResponse {
  id_mensagem: string;
  id_conversa: string;
  id_remetente: string;
  conteudo: string;
  tipo: string;
  lida: boolean;
  created_at: Date;
  remetente: {
    id_usuario: string;
    nome: string;
    foto_perfil: string | null;
  };
}

export interface ParticipantResponse {
  id_participante: string;
  id_usuario: string;
  ultima_leitura: Date | null;
  joined_em: Date;
  usuario: {
    id_usuario: string;
    nome: string;
    foto_perfil: string | null;
  };
}

export interface UnreadCountResponse {
  total: number;
  conversas: {
    id_conversa: string;
    quantidade: number;
  }[];
}
