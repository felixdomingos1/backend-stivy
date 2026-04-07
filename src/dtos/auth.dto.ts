// dtos/auth.dto.ts
export interface RegisterUserDto {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  tipo: 'fazedor' | 'apreciador';
  tipo_fazedor?: 'agencia' | 'estilista' | 'maquiador' | 'fotografo' | 'modelo_freelancer';
}

export interface LoginDto {
  email: string;
  senha: string;
}

export interface AuthResponseDto {
  success: boolean;
  message: string;
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    telefone?: string;
    tipo: string;
    foto_perfil?: string;
    status_aprovacao?: string;
    tipo_fazedor?: string;
  };
}

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetDto {
  token: string;
  nova_senha: string;
}
