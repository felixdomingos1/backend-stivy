import bcrypt from 'bcryptjs';

export const hashSenha = async (senha: string): Promise<string> => {
  const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
  return await bcrypt.hash(senha, saltRounds);
};

export const compararSenha = async (senha: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(senha, hash);
};
