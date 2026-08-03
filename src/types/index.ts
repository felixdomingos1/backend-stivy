export interface JwtPayload {
  id: string;
  email: string;
  tipo: string;
  isVerified:boolean
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RegisterUserDto {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  tipo: 'fazedor' | 'apreciador';
  tipo_fazedor?: 'agencia' | 'estilista' | 'maquiador' | 'fotografo' | 'modelo_freelancer' | 'videografo' | 'designer' | 'influenciador' | 'criador_conteudo' | 'cabeleireiro' | 'barbeiro' | 'produtor_eventos' | 'publicidade' | 'marketing' | 'desfiles' | 'casting' | 'moda' | 'outros';
}

export interface LoginDto {
  email: string;
  senha: string;
}

export interface CreateServicoDto {
  titulo: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  tempo_estimado?: string;
}

export interface CreateEventoDto {
  titulo: string;
  descricao?: string;
  local?: string;
  latitude?: number;
  longitude?: number;
  data_inicio: Date;
  data_fim: Date;
  tipo_evento: 'desfile' | 'workshop' | 'casting' | 'fashion_week' | 'concurso' | 'outro';
  vagas_disponiveis?: number;
  valor_ingresso?: number;
}
