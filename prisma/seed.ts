import { hashSenha } from '../src/utils/bcrypt';
import prisma from '../src/config/database';

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminSenha = await hashSenha('admin123');

  await prisma.usuario.upsert({
    where: { email: 'admin@stivy.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@stivy.com',
      senha_hash: adminSenha,
      telefone: '999999999',
      tipo: 'fazedor',
      status: 'ativo',
      fazedor: {
        create: {
          tipo_fazedor: 'agencia',
          status_aprovacao: 'aprovado'
        }
      }
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
