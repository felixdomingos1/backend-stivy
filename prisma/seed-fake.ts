/**
 * Enche a base de dados com utilizadores fake (fazedores + apreciadores) e dados à volta:
 * serviços, seguidores, favoritos e avaliações. NÃO apaga dados existentes.
 *
 *   npm run seed:fake                    -> 300 utilizadores
 *   npm run seed:fake -- --total=2000
 *   npm run seed:fake -- --limpar        -> remove todos os utilizadores @fake.stivy.ao
 *
 * Todos os fakes têm email "...@fake.stivy.ao" e senha "teste123".
 */
import { PrismaClient, Prisma, FazedorTipo } from '@prisma/client';
import { randomUUID } from 'crypto';
import { hashSenha } from '../src/utils/bcrypt';

const prisma = new PrismaClient();

const DOMINIO = 'fake.stivy.ao';
const SENHA = 'teste123';
const LOTE = 500;

const arg = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}`));
const TOTAL = parseInt(arg('total')?.split('=')[1] ?? '300', 10);

// ---------- dados base ----------
const NOMES_F = ['Ana', 'Maria', 'Luzia', 'Esperança', 'Joana', 'Teresa', 'Isabel', 'Rosa', 'Celestina', 'Domingas', 'Madalena', 'Helena', 'Graça', 'Yola', 'Ngueve', 'Wanda', 'Kiami', 'Nádia', 'Sara', 'Paula', 'Djamila', 'Stélvia', 'Edna', 'Mirela', 'Telma', 'Vânia', 'Lurdes', 'Zuleica', 'Neusa', 'Ruth'];
const NOMES_M = ['João', 'Pedro', 'Manuel', 'António', 'José', 'Francisco', 'Domingos', 'Paulo', 'Mateus', 'Kiluange', 'Ngola', 'Edson', 'Hélder', 'Osvaldo', 'Adilson', 'Wilson', 'Nelson', 'Delfim', 'Mário', 'Rui', 'Félix', 'Ernesto', 'Bruno', 'Celso', 'Kelson', 'Ivan', 'Sérgio', 'Valdemar', 'Gelson', 'Carlos'];
const APELIDOS = ['Silva', 'Santos', 'Costa', 'Ferreira', 'Neto', 'Domingos', 'Capambo', 'Tavares', 'Kiala', 'Mbala', 'Lopes', 'Gomes', 'Cassoma', 'Chipenda', 'Sebastião', 'Mendes', 'Vieira', 'Bento', 'Kambala', 'Muhongo', 'Pascoal', 'Cardoso', 'Firmino', 'Afonso', 'Quissanga', 'Lukamba', 'Miguel', 'Fernandes', 'Kalandula', 'Nzinga'];

const CIDADES = [
  { cidade: 'Luanda', provincia: 'Luanda', lat: -8.8383, lng: 13.2344, peso: 8 },
  { cidade: 'Talatona', provincia: 'Luanda', lat: -8.9147, lng: 13.1856, peso: 4 },
  { cidade: 'Viana', provincia: 'Luanda', lat: -8.9035, lng: 13.3745, peso: 2 },
  { cidade: 'Benguela', provincia: 'Benguela', lat: -12.5763, lng: 13.4055, peso: 2 },
  { cidade: 'Lobito', provincia: 'Benguela', lat: -12.3644, lng: 13.5366, peso: 1 },
  { cidade: 'Huambo', provincia: 'Huambo', lat: -12.7761, lng: 15.7392, peso: 1 },
  { cidade: 'Lubango', provincia: 'Huíla', lat: -14.9172, lng: 13.4925, peso: 1 },
  { cidade: 'Cabinda', provincia: 'Cabinda', lat: -5.5500, lng: 12.2000, peso: 1 },
];

// tipo de fazedor -> categoria e títulos de serviço
const TIPOS: { tipo: FazedorTipo; categoria: string; servicos: string[]; peso: number }[] = [
  { tipo: 'estilista', categoria: 'Estilista', servicos: ['Vestido de gala por medida', 'Coleção cápsula', 'Fato africano por medida', 'Ajustes e costura', 'Consultoria de estilo'], peso: 4 },
  { tipo: 'maquiador', categoria: 'Maquilhagem', servicos: ['Maquilhagem de noiva', 'Maquilhagem social', 'Maquilhagem para ensaio', 'Curso de auto-maquilhagem'], peso: 4 },
  { tipo: 'fotografo', categoria: 'Fotografia', servicos: ['Book fotográfico', 'Ensaio de moda', 'Cobertura de casamento', 'Fotografia de produto', 'Editorial de revista'], peso: 3 },
  { tipo: 'modelo_freelancer', categoria: 'Modelo', servicos: ['Desfile em passarela', 'Campanha publicitária', 'Catálogo de roupa', 'Presença em evento'], peso: 3 },
  { tipo: 'cabeleireiro', categoria: 'Cabelo', servicos: ['Corte e escova', 'Coloração', 'Penteado de festa', 'Tratamento capilar'], peso: 2 },
  { tipo: 'trancista', categoria: 'Tranças', servicos: ['Box braids', 'Nagô', 'Twist', 'Tranças com extensão'], peso: 3 },
  { tipo: 'barbeiro', categoria: 'Barbearia', servicos: ['Corte degradê', 'Barba completa', 'Corte + barba', 'Desenho no cabelo'], peso: 2 },
  { tipo: 'manicure', categoria: 'Unhas', servicos: ['Gel nas unhas', 'Manicure e pedicure', 'Unhas de acrílico', 'Nail art'], peso: 2 },
  { tipo: 'esteticista', categoria: 'Estética', servicos: ['Limpeza de pele', 'Depilação', 'Massagem relaxante', 'Design de sobrancelhas'], peso: 1 },
  { tipo: 'videografo', categoria: 'Vídeo', servicos: ['Vídeo de desfile', 'Reels para marcas', 'Filmagem de evento'], peso: 1 },
  { tipo: 'designer', categoria: 'Design', servicos: ['Design de estampas', 'Identidade visual de marca', 'Lookbook digital'], peso: 1 },
  { tipo: 'produtor_eventos', categoria: 'Eventos', servicos: ['Produção de desfile', 'Organização de lançamento', 'Direção de passarela'], peso: 1 },
  { tipo: 'agencia', categoria: 'Casting', servicos: ['Casting de modelos', 'Agenciamento de talentos', 'Workshop de passarela'], peso: 1 },
];

const BIOS = [
  'Apaixonado(a) pela moda angolana e por criar experiências únicas.',
  'Mais de {anos} anos de experiência. Atendimento ao domicílio.',
  'Trabalho com marcas nacionais e internacionais. Marque já a sua sessão!',
  'Qualidade, pontualidade e muito estilo. Orçamentos por WhatsApp.',
  'Formado(a) em {cidade}. Especialista em eventos e editoriais.',
];
const COMENTARIOS = ['Excelente profissional!', 'Muito pontual e atencioso(a).', 'Superou as expectativas.', 'Recomendo a 100%.', 'Bom trabalho, voltarei.', 'Preço justo e qualidade top.', 'Podia ter sido mais rápido, mas gostei.', null, null];

// ---------- utilitários ----------
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickPeso = <T extends { peso: number }>(arr: T[]): T => {
  let r = Math.random() * arr.reduce((s, x) => s + x.peso, 0);
  for (const x of arr) if ((r -= x.peso) < 0) return x;
  return arr[0];
};
const amostra = <T>(arr: T[], n: number): T[] => {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, Math.min(n, copia.length));
};
const diasAtras = (max: number) => new Date(Date.now() - rand(0, max * 24 * 3600) * 1000);
const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const telefone = () => `9${pick(['2', '3', '4', '5', '9'])}${rand(1000000, 9999999)}`;

async function inserirEmLotes<T>(nome: string, dados: T[], fn: (lote: T[]) => Promise<{ count: number }>) {
  let total = 0;
  for (let i = 0; i < dados.length; i += LOTE) {
    total += (await fn(dados.slice(i, i + LOTE))).count;
  }
  console.log(`✅ ${total} ${nome}`);
}

// ---------- limpar ----------
async function limpar() {
  const { count } = await prisma.usuario.deleteMany({ where: { email: { endsWith: `@${DOMINIO}` } } });
  console.log(`🗑️ ${count} utilizadores fake removidos (com tudo o que lhes pertencia)`);
}

// ---------- gerar ----------
async function gerar() {
  console.log(`🌱 A gerar ${TOTAL} utilizadores fake...`);
  const senhaHash = await hashSenha(SENHA);
  const tag = Date.now().toString(36);

  const usuarios: Prisma.UsuarioCreateManyInput[] = [];
  const fazedores: Prisma.FazedorCreateManyInput[] = [];
  const freelancers: Prisma.ModeloFreelancerCreateManyInput[] = [];
  const estilistas: Prisma.EstilistaCreateManyInput[] = [];
  const maquiadores: Prisma.MaquiadorCreateManyInput[] = [];
  const fotografos: Prisma.FotografoCreateManyInput[] = [];
  const servicos: Prisma.ServicoCreateManyInput[] = [];
  const fazedorInfo: { idFazedor: string; idUsuario: string }[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const feminino = Math.random() < 0.6;
    const primeiro = pick(feminino ? NOMES_F : NOMES_M);
    const apelido = pick(APELIDOS);
    const nome = `${primeiro} ${apelido}`;
    const idUsuario = randomUUID();
    const eFazedor = Math.random() < 0.7;
    const cadastro = diasAtras(180);

    usuarios.push({
      id_usuario: idUsuario,
      nome,
      email: `${slug(primeiro)}.${slug(apelido)}.${tag}${i}@${DOMINIO}`,
      senha_hash: senhaHash,
      telefone: telefone(),
      tipo: eFazedor ? 'fazedor' : 'apreciador',
      status: 'ativo',
      email_verificado: true,
      data_cadastro: cadastro,
      ultimo_acesso: diasAtras(14),
      foto_perfil: `https://randomuser.me/api/portraits/${feminino ? 'women' : 'men'}/${rand(0, 99)}.jpg`,
    });

    if (!eFazedor) continue;

    const t = pickPeso(TIPOS);
    const local = pickPeso(CIDADES);
    const idFazedor = randomUUID();
    const insta = `@${slug(primeiro)}${slug(apelido)}${rand(1, 99)}`;
    fazedorInfo.push({ idFazedor, idUsuario });

    fazedores.push({
      id_fazedor: idFazedor,
      id_usuario: idUsuario,
      tipo_fazedor: t.tipo,
      biografia: pick(BIOS).replace('{anos}', String(rand(2, 15))).replace('{cidade}', local.cidade),
      endereco: `${local.cidade}, ${local.provincia}`,
      instagram: insta,
      whatsapp: telefone(),
      telefone_publico: Math.random() < 0.5 ? telefone() : null,
      status_aprovacao: 'aprovado',
      data_aprovacao: cadastro,
      cidade: local.cidade,
      provincia: local.provincia,
      latitude: (local.lat + (Math.random() - 0.5) * 0.08).toFixed(8),
      longitude: (local.lng + (Math.random() - 0.5) * 0.08).toFixed(8),
      capa_url: `https://picsum.photos/seed/capa${tag}${i}/1200/400`,
      total_avaliacoes: 0,
    });

    if (t.tipo === 'modelo_freelancer') {
      freelancers.push({
        id_fazedor: idFazedor,
        nome_artistico: primeiro,
        altura: (feminino ? 1.65 + Math.random() * 0.17 : 1.75 + Math.random() * 0.17).toFixed(2),
        peso: rand(feminino ? 50 : 65, feminino ? 65 : 85),
        busto: rand(78, 92),
        cintura: rand(58, 72),
        quadril: rand(84, 98),
        sapato: rand(feminino ? 36 : 40, feminino ? 41 : 45),
        cabelo: pick(['Preto', 'Castanho', 'Tranças', 'Afro natural']),
        olhos: pick(['Castanhos', 'Pretos']),
        idade: rand(18, 30),
        nacionalidade: 'Angolana',
        foto_url: `https://randomuser.me/api/portraits/${feminino ? 'women' : 'men'}/${rand(0, 99)}.jpg`,
        cache_medio: rand(15, 120) * 1000,
      });
    } else if (t.tipo === 'estilista') {
      estilistas.push({ id_fazedor: idFazedor, nome_marca: `${apelido} Atelier`, especialidade: pick(['Moda africana', 'Alta-costura', 'Streetwear', 'Noivas']), instagram: insta });
    } else if (t.tipo === 'maquiador') {
      maquiadores.push({ id_fazedor: idFazedor, especialidade: pick(['Noivas', 'Social', 'Artística', 'Editorial']), marcas_preferidas: 'MAC, Fenty Beauty, Huda Beauty' });
    } else if (t.tipo === 'fotografo') {
      fotografos.push({ id_fazedor: idFazedor, especialidade: pick(['Moda', 'Retrato', 'Casamentos', 'Produto']), camera_equipamento: pick(['Canon R6', 'Sony A7 IV', 'Nikon Z6 II']) });
    }

    for (const titulo of amostra(t.servicos, rand(1, 4))) {
      servicos.push({
        id_fazedor: idFazedor,
        titulo,
        descricao: `${titulo} com ${nome}. Atendimento em ${local.cidade} e arredores.`,
        categoria: t.categoria,
        valor: rand(3, 150) * 1000,
        status: 'ativo',
        imagem_url: `https://picsum.photos/seed/${randomUUID().slice(0, 8)}/600/600`,
        tempo_estimado: pick(['1 hora', '2 horas', '1 dia', '3 dias', '1 semana']),
        data_criacao: diasAtras(120),
      });
    }
  }

  // Relações (pares únicos)
  const idsUsuarios = usuarios.map(u => u.id_usuario!);
  const seguidores: Prisma.SeguidorCreateManyInput[] = [];
  const favoritos: Prisma.FavoritoCreateManyInput[] = [];
  const avaliacoes: Prisma.AvaliacaoCreateManyInput[] = [];
  const notas = new Map<string, number[]>();

  for (const id of idsUsuarios) {
    for (const seguido of amostra(idsUsuarios, rand(3, 25))) {
      if (seguido !== id) seguidores.push({ id_seguidor_usuario: id, id_seguido: seguido, data_inicio: diasAtras(90) });
    }
    for (const f of amostra(fazedorInfo, rand(0, 8))) {
      if (f.idUsuario !== id) favoritos.push({ id_usuario: id, id_fazedor: f.idFazedor, data_adicao: diasAtras(90) });
    }
    for (const f of amostra(fazedorInfo, rand(0, 5))) {
      if (f.idUsuario === id) continue;
      const nota = pickPeso([{ v: 5, peso: 5 }, { v: 4, peso: 4 }, { v: 3, peso: 2 }, { v: 2, peso: 1 }, { v: 1, peso: 0.5 }]).v;
      avaliacoes.push({ id_avaliador: id, id_avaliado: f.idFazedor, nota, comentario: pick(COMENTARIOS), data_avaliacao: diasAtras(90) });
      notas.set(f.idFazedor, [...(notas.get(f.idFazedor) ?? []), nota]);
    }
  }

  // Média de avaliações já calculada antes de inserir o fazedor
  for (const f of fazedores) {
    const n = notas.get(f.id_fazedor!) ?? [];
    f.total_avaliacoes = n.length;
    f.avaliacao_media = n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(2) : null;
  }

  await inserirEmLotes('utilizadores', usuarios, d => prisma.usuario.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('fazedores', fazedores, d => prisma.fazedor.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('modelos freelancer', freelancers, d => prisma.modeloFreelancer.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('estilistas', estilistas, d => prisma.estilista.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('maquiadores', maquiadores, d => prisma.maquiador.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('fotógrafos', fotografos, d => prisma.fotografo.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('serviços', servicos, d => prisma.servico.createMany({ data: d }));
  await inserirEmLotes('seguidores', seguidores, d => prisma.seguidor.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('favoritos', favoritos, d => prisma.favorito.createMany({ data: d, skipDuplicates: true }));
  await inserirEmLotes('avaliações', avaliacoes, d => prisma.avaliacao.createMany({ data: d, skipDuplicates: true }));

  console.log(`🎉 Concluído. Login de qualquer fake: <email>@${DOMINIO} / ${SENHA}`);
}

(arg('limpar') ? limpar() : gerar())
  .catch(e => {
    console.error('❌ Erro no seed fake:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
