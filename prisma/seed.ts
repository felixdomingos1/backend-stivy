import { hashSenha } from '../src/utils/bcrypt';
import prisma from '../src/config/database';
import { v4 as uuid } from 'uuid';

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar dados existentes (ordem inversa das dependências)
  await prisma.notificacao.deleteMany();
  await prisma.seguidor.deleteMany();
  await prisma.mensagem.deleteMany();
  await prisma.conversaParticipante.deleteMany();
  await prisma.conversa.deleteMany();
  await prisma.storyCurtida.deleteMany();
  await prisma.storyVisualizacao.deleteMany();
  await prisma.story.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.favorito.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.eventoParticipante.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.servicoCompartilhamento.deleteMany();
  await prisma.servicoReacao.deleteMany();
  await prisma.servicoComentario.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.fazedor.deleteMany();
  await prisma.usuario.deleteMany();
  console.log('🗑️ Dados existentes limpos');

  const adminSenha = await hashSenha('sistem123!@#');
  const userSenha = await hashSenha('teste123');

  // 1. Admin
  await prisma.usuario.upsert({
    where: { email: 'superadmin@stivy.com' },
    update: {
      nome: 'Stivy Admin',
      senha_hash: adminSenha,
      telefone: '999999999',
      tipo: 'sistem_admin',
      status: 'ativo',
      email_verificado: true,
    },
    create: {
      nome: 'Stivy Admin',
      email: 'superadmin@stivy.com',
      senha_hash: adminSenha,
      telefone: '999999999',
      tipo: 'sistem_admin',
      status: 'ativo',
      email_verificado: true,
    }
  });
  console.log('✅ Admin criado');

  // 2. Fazedores (vários tipos)
  const fazedoresData = [
    { nome: 'Ana Silva', email: 'ana@stivy.com', tipo: 'estilista', bio: 'Estilista especializada em moda africana contemporânea.', instagram: '@anastilo' },
    { nome: 'João Santos', email: 'joao@stivy.com', tipo: 'fotografo', bio: 'Fotógrafo de moda e eventos há 10 anos.', instagram: '@joaofoto' },
    { nome: 'Maria Costa', email: 'maria@stivy.com', tipo: 'maquiador', bio: 'Maquiadora profissional para passarela e ensaios.', instagram: '@mariamake' },
    { nome: 'Luma Ferreira', email: 'luma@stivy.com', tipo: 'modelo_freelancer', bio: 'Modelo freelancer com experiência em passarela e catálogo.', instagram: '@lumamodelo' },
    { nome: 'Carla Mendes', email: 'carla@stivy.com', tipo: 'agencia', bio: 'Agência de modelos e talentos.', instagram: '@agenciacarla' },
    { nome: 'Pedro Lucas', email: 'pedro@stivy.com', tipo: 'videografo', bio: 'Videógrafo especializado em desfiles e eventos.', instagram: '@pedrovideo' },
    { nome: 'Beatriz Lima', email: 'beatriz@stivy.com', tipo: 'designer', bio: 'Designer de moda com foco em estampas exclusivas.', instagram: '@beadesigner' },
    { nome: 'Rui Almeida', email: 'rui@stivy.com', tipo: 'cabeleireiro', bio: 'Cabeleireiro para passarela e editoriais.', instagram: '@ruicabelos' },
  ];

  const fazedores = [];
  for (const f of fazedoresData) {
    const idUsuario = uuid();
    const idFazedor = uuid();
    await prisma.usuario.upsert({
      where: { email: f.email },
      update: {
        nome: f.nome,
        senha_hash: userSenha,
        tipo: 'fazedor',
        status: 'ativo',
        email_verificado: true,
      },
      create: {
        id_usuario: idUsuario,
        nome: f.nome,
        email: f.email,
        senha_hash: userSenha,
        telefone: '923456789',
        tipo: 'fazedor',
        status: 'ativo',
        email_verificado: true,
        foto_perfil: null,
      }
    });
    const usuario = await prisma.usuario.findUnique({ where: { email: f.email } });
    await prisma.fazedor.upsert({
      where: { id_usuario: usuario!.id_usuario },
      update: {
        tipo_fazedor: f.tipo as any,
        biografia: f.bio,
        instagram: f.instagram,
        status_aprovacao: 'aprovado',
      },
      create: {
        id_fazedor: idFazedor,
        id_usuario: usuario!.id_usuario,
        tipo_fazedor: f.tipo as any,
        biografia: f.bio,
        instagram: f.instagram,
        status_aprovacao: 'aprovado',
        avaliacao_media: (3 + Math.random() * 2).toFixed(2) as any,
        total_avaliacoes: Math.floor(Math.random() * 20) + 1,
      }
    });
    const fazedor = await prisma.fazedor.findUnique({ where: { id_usuario: usuario!.id_usuario } });
    fazedores.push({ idFazedor: fazedor!.id_fazedor, idUsuario: usuario!.id_usuario, tipo: f.tipo, nome: f.nome });
  }
  console.log(`✅ ${fazedores.length} fazedores criados`);

  // 3. Apreciadores
  for (let i = 1; i <= 3; i++) {
    const email = `cliente${i}@stivy.com`;
    await prisma.usuario.upsert({
      where: { email },
      update: { nome: `Cliente ${i}`, senha_hash: userSenha },
      create: {
        nome: `Cliente ${i}`,
        email,
        senha_hash: userSenha,
        telefone: `92345678${i}`,
        tipo: 'apreciador',
        status: 'ativo',
        email_verificado: true,
      }
    });
  }
  console.log('✅ 3 apreciadores criados');

  // 4. Serviços para cada fazedor
  const servicosData = [
    { titulo: 'Coleção Verão 2026', descricao: 'Criação de coleção completa para temporada de verão.', valor: 150000, categoria: 'Moda' },
    { titulo: 'Consultoria de Estilo', descricao: 'Consultoria personalizada para desenvolvimento de imagem.', valor: 35000, categoria: 'Moda' },
    { titulo: 'Book de Fotos', descricao: 'Ensaio fotográfico profissional para portfolio.', valor: 80000, categoria: 'Fotografia' },
    { titulo: 'Cobertura de Eventos', descricao: 'Cobertura fotográfica completa para eventos de moda.', valor: 120000, categoria: 'Fotografia' },
    { titulo: 'Maquiagem para Passarela', descricao: 'Maquiagem profissional para desfiles e eventos.', valor: 25000, categoria: 'Beleza' },
    { titulo: 'Maquiagem Social', descricao: 'Maquiagem para festas e eventos sociais.', valor: 15000, categoria: 'Beleza' },
    { titulo: 'Produção de Desfile', descricao: 'Produção completa para desfiles de moda.', valor: 200000, categoria: 'Eventos' },
    { titulo: 'Filmagem de Eventos', descricao: 'Filmagem profissional em 4K para eventos.', valor: 100000, categoria: 'Eventos' },
    { titulo: 'Design de Estampas', descricao: 'Criação de estampas exclusivas para coleções.', valor: 45000, categoria: 'Design' },
    { titulo: 'Penteados para Passarela', descricao: 'Penteados profissionais para desfiles e editoriais.', valor: 20000, categoria: 'Beleza' },
    { titulo: 'Catálogo de Moda', descricao: 'Criação de catálogo completo para marca de moda.', valor: 180000, categoria: 'Fotografia' },
    { titulo: 'Assessoria de Imagem', descricao: 'Pacote completo de assessoria de imagem pessoal.', valor: 50000, categoria: 'Moda' },
    { titulo: 'Direção de Arte', descricao: 'Direção de arte para ensaios e campanhas.', valor: 90000, categoria: 'Design' },
    { titulo: 'Figurino para Eventos', descricao: 'Criação e aluguer de figurinos para eventos especiais.', valor: 75000, categoria: 'Moda' },
  ];

  const servicosCriados = [];
  for (let i = 0; i < servicosData.length; i++) {
    const f = fazedores[i % fazedores.length];
    const seed = (i + 1) * 10;
    const servico = await prisma.servico.create({
      data: {
        id_fazedor: f.idFazedor,
        titulo: servicosData[i].titulo,
        descricao: servicosData[i].descricao,
        categoria: servicosData[i].categoria,
        valor: servicosData[i].valor,
        status: 'ativo',
        imagem_url: `https://picsum.photos/seed/${seed}/400/400`,
        tempo_estimado: `${Math.floor(Math.random() * 5) + 1} dias`,
      }
    });
    servicosCriados.push(servico);
  }
  console.log(`✅ ${servicosCriados.length} serviços criados`);

  // 5. Eventos
  const eventosData = [
    { titulo: 'Luanda Fashion Week 2026', descricao: 'A maior semana de moda de Luanda.', tipo: 'desfile', vagas: 500, local: 'BAIA DE LUANDA' },
    { titulo: 'Workshop de Maquiagem', descricao: 'Aprenda técnicas avançadas de maquiagem.', tipo: 'workshop', vagas: 30, local: 'Centro de Convenções' },
    { titulo: 'Casting para Modelos', descricao: 'Seleção de modelos para nova coleção.', tipo: 'casting', vagas: 100, local: 'Hotel Palma' },
    { titulo: 'Concurso de Estilistas', descricao: 'Concurso para novos talentos da moda.', tipo: 'concurso', vagas: 50, local: 'ISPTEC' },
    { titulo: 'Feira de Moda Angolana', descricao: 'Exposição de marcas e designers angolanos.', tipo: 'outro', vagas: 200, local: 'Pavilhão Multiúsos' },
    { titulo: 'Workshop de Fotografia', descricao: 'Técnicas de fotografia de moda.', tipo: 'workshop', vagas: 25, local: 'Estúdio Criativo' },
  ];

  for (let i = 0; i < eventosData.length; i++) {
    const f = fazedores[i % fazedores.length];
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() + 15 + i * 20);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 2);

    await prisma.evento.create({
      data: {
        id_organizador: f.idFazedor,
        titulo: eventosData[i].titulo,
        descricao: eventosData[i].descricao,
        local: eventosData[i].local,
        tipo_evento: eventosData[i].tipo as any,
        vagas_disponiveis: eventosData[i].vagas,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'ativo',
        valor_ingresso: i % 2 === 0 ? Math.floor(Math.random() * 5000) + 1000 : 0,
      }
    });
  }
  console.log(`✅ ${eventosData.length} eventos criados`);

  // 6. Stories
  for (let i = 0; i < 5; i++) {
    const f = fazedores[i % fazedores.length];
    const expira = new Date();
    expira.setHours(expira.getHours() + 24);

    const placeholderId = uuid();
    await prisma.story.create({
      data: {
        id_usuario: f.idUsuario,
        midia_url: '',
        midia_public_id: `seed_${placeholderId}`,
        tipo: 'imagem',
        texto: `Story do ${f.nome}`,
        expira_em: expira,
      }
    });
  }
  console.log('✅ 5 stories criados');

  // 7. Seguidores (algumas relações)
  for (let i = 0; i < fazedores.length; i++) {
    for (let j = i + 1; j < fazedores.length; j++) {
      if (Math.random() > 0.5) {
        await prisma.seguidor.upsert({
          where: {
            id_seguidor_usuario_id_seguido: {
              id_seguidor_usuario: fazedores[i].idUsuario,
              id_seguido: fazedores[j].idUsuario,
            }
          },
          update: {},
          create: {
            id_seguidor_usuario: fazedores[i].idUsuario,
            id_seguido: fazedores[j].idUsuario,
          }
        });
      }
    }
  }
  console.log('✅ Relações de seguidor criadas');

  // 8. Algumas notificações de exemplo
  const primeiroFazedor = fazedores[0];
  await prisma.notificacao.create({
    data: {
      id_usuario: primeiroFazedor.idUsuario,
      titulo: 'Bem-vindo ao Stivy!',
      mensagem: 'Seu perfil foi aprovado. Comece a explorar oportunidades.',
      tipo: 'sistema',
      lida: false,
    }
  });
  await prisma.notificacao.create({
    data: {
      id_usuario: primeiroFazedor.idUsuario,
      titulo: 'Nova solicitação',
      mensagem: 'Você recebeu uma nova solicitação de serviço.',
      tipo: 'requisicao',
      lida: false,
    }
  });
  console.log('✅ Notificações criadas');

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
