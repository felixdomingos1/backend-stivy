import { Prisma } from '@prisma/client';

/**
 * Campos públicos de um utilizador (seguro para expor a qualquer pessoa).
 * NUNCA incluir senha_hash, códigos OTP/reset, tentativas ou tokens.
 */
export const usuarioPublicoSelect = {
  id_usuario: true,
  nome: true,
  foto_perfil: true,
  tipo: true,
  banner_url: true,
} satisfies Prisma.UsuarioSelect;

/**
 * Campos do próprio utilizador (perfil privado / admin).
 * Continua sem dados sensíveis (senha, códigos, tentativas, tokens).
 */
export const usuarioPrivadoSelect = {
  ...usuarioPublicoSelect,
  email: true,
  telefone: true,
  status: true,
  email_verificado: true,
  data_cadastro: true,
  ultimo_acesso: true,
} satisfies Prisma.UsuarioSelect;

export type UsuarioPublico = Prisma.UsuarioGetPayload<{ select: typeof usuarioPublicoSelect }>;
export type UsuarioPrivado = Prisma.UsuarioGetPayload<{ select: typeof usuarioPrivadoSelect }>;
