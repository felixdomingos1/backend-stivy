export interface UpdateUserDto {
  nome?: string;
  telefone?: string;
  foto_perfil?: string;
  bio?: string;
  foto_perfil_public_id?: string;

  nome_artistico?: string;
  altura?: string;
  peso?: string;
  busto?: string;
  cintura?: string;
  quadril?: string;
  sapato?: string;
  roupa?: string;
  cabelo?: string;
  olhos?: string;
  idade?: string;
  nacionalidade?: string;
  experiencia?: string;
  habilidades?: string;
  status_modelo?: string;
}

export interface UpdatePasswordDto {
  senha_atual: string;
  nova_senha: string;
}

export interface FavoritoDto {
  id_fazedor: string;
}

export interface UserProfileResponseDto {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: string;
  foto_perfil?: string;
  bio?: string;
  data_cadastro: Date;
  email_verificado: boolean;
  status: string;
}

export interface FavoritoResponseDto {
  id: string;
  fazedor: {
    id: string;
    nome: string;
    email: string;
    tipo_fazedor: string;
    avaliacao_media?: string;
    foto_perfil?: string;
  };
  data_adicao: Date;
}
