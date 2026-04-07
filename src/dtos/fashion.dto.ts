export interface CreateServicoDto {
  titulo: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  tempo_estimado?: string;
}

export interface UpdateServicoDto {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  tempo_estimado?: string;
  status?: string;
}

export interface AvaliarFazedorDto {
  nota: number;
  comentario?: string;
}
