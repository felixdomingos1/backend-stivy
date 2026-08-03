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

export interface VerifyEmailDto {
  userId: string;
  codigo: string;
}

export interface ResendOTPDto {
  email: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface VerifyPasswordResetOtpDto {
  email: string;
  codigo: string;
}

export interface ResetPasswordWithOtpDto {
  email: string;
  codigo: string;
  nova_senha: string;
}

export interface AuthResponseDto {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string;
  requiresVerification?: boolean;
  resetToken?: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    tipo: string;
    foto_perfil?: string;
    email_verificado?: boolean;
    status_aprovacao?: string;
    tipo_fazedor?: string;
  };
}
export interface LoginDto {
  email: string;
  senha: string;
}

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetDto {
  token: string;
  nova_senha: string;
}
