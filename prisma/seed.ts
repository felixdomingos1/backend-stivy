import { hashSenha } from '../src/utils/bcrypt';
import prisma from '../src/config/database';

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminSenha = await hashSenha('sistem123!@#');

  await prisma.usuario.upsert({
    where: { email: 'superadmin@stivy.com' },
    update: {},
    create: {
      nome: 'Stivy Admin',
      email: 'superadmin@stivy.com',
      senha_hash: adminSenha,
      telefone: '999999999',
      tipo: 'sistem_admin',
      status: 'ativo',
    }
  });

  console.log('✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
