export interface CreateEventoDto {
  titulo: string;
  descricao?: string;
  local?: string;
  latitude?: number;
  longitude?: number;
  data_inicio: Date;
  data_fim: Date;
  tipo_evento: string;
  valor_ingresso?: number;
  imagem_url?: string;
  imagem_public_id?: string;
  banner_url?: string;
  banner_public_id?: string;
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
  latitude?: number | null;
  longitude?: number | null;
  data_inicio?: Date;
  data_fim?: Date;
  tipo_evento?: string;
  valor_ingresso?: number;
  status?: string;
}
