export interface CreateServicoDto {
  titulo: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  tempo_estimado?: string;
  imagem_url?: string;
  imagem_public_id?: string;
}

export interface UpdateServicoDto {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  tempo_estimado?: string;
  status?: string;
  imagem_url?: string;
  imagem_public_id?: string;
}

export interface AvaliarFazedorDto {
  nota: number;
  comentario?: string;
}
