import { hashSenha } from '../src/utils/bcrypt';
import prisma from '../src/config/database';

async function main() {
  console.log('🌱 Iniciando seed...');
  const adminSenha = await hashSenha('sistem123!@#');
  await prisma.usuario.upsert({
    where: { email: 'superadmin@stivy.com' },
    update: {
      nome: 'Stivy Admin',
      senha_hash: adminSenha,
      telefone: '999999999',
      tipo: 'sistem_admin',
      status: 'ativo',
      email_verificado: true,
      email_verification_code: null,
      email_verification_expira: null,
      verification_attempts: 0
    },
    create: {
      nome: 'Stivy Admin',
      email: 'superadmin@stivy.com',
      senha_hash: adminSenha,
      telefone: '999999999',
      tipo: 'sistem_admin',
      status: 'ativo',
      email_verificado: true,
      email_verification_code: null,
      email_verification_expira: null,
      verification_attempts: 0
    }
  });

  console.log('✅ Admin criado e verificado!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
