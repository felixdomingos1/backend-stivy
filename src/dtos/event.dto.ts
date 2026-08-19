export interface CreateEventoDto {
  titulo: string;
  descricao?: string;
  local?: string;
  latitude?: number;
  longitude?: number;
  data_inicio: Date;
  data_fim: Date;
  tipo_evento: string;
  vagas_disponiveis?: number;
  valor_ingresso?: number;
  imagem_url?: string;
  imagem_public_id?: string;
  imagens?: {
    imagem_url: string;
    imagem_public_id: string;
    ordem: number;
    legenda?: string;
  }[];
}

export interface UpdateEventoDto {
  titulo?: string;
  descricao?: string;
  local?: string;
  latitude?: number;
  longitude?: number;
  data_inicio?: Date;
  data_fim?: Date;
  tipo_evento?: string;
  vagas_disponiveis?: number;
  valor_ingresso?: number;
  status?: string;
}
