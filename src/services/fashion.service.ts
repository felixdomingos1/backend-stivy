import { FAZEDOR_TIPOS } from '../utils/fazedor-tipos';
import { ServicoRepository, ServicoFilters } from '../repositories/servico.repository';
import { FazedorRepository, FazedorFilters } from '../repositories/fazedor.repository';
import { AvaliacaoRepository } from '../repositories/avaliacao.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { CreateServicoDto, UpdateServicoDto } from '../dtos/fashion.dto';
import { ValidationError, NotFoundError } from '../utils/errors';
import { ForbiddenError, toNumber, haversineKm, boundingBox } from './authorization.service';

/** Converte decimais do fazedor em number e acrescenta o objecto `contatos` (contrato). */
export const formatFazedorPublico = (f: any) => {
  if (!f) return f;
  return {
    ...f,
    latitude: toNumber(f.latitude),
    longitude: toNumber(f.longitude),
    avaliacao_media: toNumber(f.avaliacao_media) ?? 0,
    total_avaliacoes: f.total_avaliacoes ?? 0,
    contatos: {
      whatsapp: f.whatsapp ?? null,
      telefone: f.telefone_publico ?? null,
      email: f.email_publico ?? null,
      instagram: f.instagram ?? null,
      facebook: f.facebook ?? null,
      website: f.website ?? null
    }
  };
};

const formatServico = (s: any) => s ? { ...s, valor: toNumber(s.valor) } : s;
import logger from '../utils/logger';
import prisma from '../config/database';

export class FashionService {
  private notificacaoRepository: NotificacaoRepository;

  constructor(
    private servicoRepository: ServicoRepository,
    private fazedorRepository: FazedorRepository,
    private avaliacaoRepository: AvaliacaoRepository
  ) {
    this.notificacaoRepository = new NotificacaoRepository();
  }

  /** Aceita id_fazedor OU id_usuario (compatibilidade com o app). */
  private async resolverFazedorId(id: string): Promise<{ id_fazedor: string; id_usuario: string } | null> {
    return await prisma.fazedor.findFirst({
      where: { OR: [{ id_fazedor: id }, { id_usuario: id }] },
      select: { id_fazedor: true, id_usuario: true }
    });
  }

  async createServico(fazedorId: string, dto: CreateServicoDto): Promise<any> {
    logger.info('Criando serviço:', { fazedorId, dto });

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const servico = await this.servicoRepository.create({
      id_fazedor: fazedor.id_fazedor,
      titulo: dto.titulo,
      descricao: dto.descricao,
      categoria: dto.categoria,
      valor: dto.valor,
      tempo_estimado: dto.tempo_estimado,
      imagem_url: dto.imagem_url,
      imagem_public_id: dto.imagem_public_id
    });

    logger.info(`Serviço criado: ${servico.titulo} - Fazedor: ${fazedor.id_fazedor}`);
    return servico;
  }

  async getFazedorByUserId(userId: string): Promise<any> {
    try {
      const fazedor = await this.fazedorRepository.findFazedorByUserId(userId);
      if (!fazedor) {
        throw new NotFoundError('Fazedor não encontrado');
      }
      return fazedor;
    } catch (error) {
      throw error;
    }
  }
  async getServicoById(id: string): Promise<any> {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }
    return formatServico(servico);
  }

  async listServicos(filters: ServicoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [servicos, total] = await Promise.all([
      this.servicoRepository.findAll(filters, skip, limit),
      this.servicoRepository.count(filters)
    ]);

    return {
      data: servicos.map(formatServico),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateServico(id: string, fazedorUserId: string, dto: UpdateServicoDto): Promise<any> {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
      throw new ForbiddenError('Você não tem permissão para editar este serviço');
    }

    // Allowlist explícita
    const updated = await this.servicoRepository.update(id, {
      titulo: dto.titulo,
      descricao: dto.descricao,
      categoria: dto.categoria,
      valor: dto.valor === undefined ? undefined : (toNumber(dto.valor) ?? undefined),
      tempo_estimado: dto.tempo_estimado,
      status: dto.status,
      imagem_url: dto.imagem_url,
      imagem_public_id: dto.imagem_public_id
    });
    logger.info(`Serviço atualizado: ${id}`);
    return formatServico(updated);
  }

  async deleteServico(id: string, fazedorUserId: string): Promise<void> {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
      throw new ForbiddenError('Você não tem permissão para excluir este serviço');
    }

    await this.servicoRepository.delete(id);
    logger.info(`Serviço excluído: ${id}`);
  }

  async getFazedorById(id: string): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorWithDetails(id)
      ?? await this.fazedorRepository.findFazedorByIdWithDetails(id);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }
    const [estatisticas, servicos] = await Promise.all([
      this.avaliacaoRepository.getEstatisticas(fazedor.id_fazedor),
      this.servicoRepository.findByFazedor(fazedor.id_fazedor)
    ]);

    return {
      ...formatFazedorPublico(fazedor),
      estatisticas,
      servicos: servicos.map(formatServico)
    };
  }

  /** Fazedores perto de (lat,lng) dentro de raio_km, ordenados por distância. Sem lat/lng: todos com coordenadas. */
  async listFazedoresProximos(params: { lat: number | null; lng: number | null; raio: number; tipo_fazedor?: string; limit: number }): Promise<any[]> {
    const limit = Math.min(Math.max(params.limit || 100, 1), 300);
    const box = params.lat !== null && params.lng !== null ? boundingBox(params.lat, params.lng, params.raio) : undefined;
    const rows = await this.fazedorRepository.findComCoordenadas(box, params.tipo_fazedor, box ? 2000 : limit);

    const items = rows.map(f => {
      const latitude = toNumber(f.latitude)!;
      const longitude = toNumber(f.longitude)!;
      const base: any = {
        id_fazedor: f.id_fazedor,
        id_usuario: f.id_usuario,
        nome: f.usuario.nome,
        foto_perfil: f.usuario.foto_perfil,
        tipo_fazedor: f.tipo_fazedor,
        cidade: f.cidade,
        provincia: f.provincia,
        endereco: f.endereco,
        latitude,
        longitude,
        avaliacao_media: toNumber(f.avaliacao_media) ?? 0,
        total_avaliacoes: f.total_avaliacoes ?? 0
      };
      if (box) {
        base.distancia_km = Math.round(haversineKm(params.lat!, params.lng!, latitude, longitude) * 100) / 100;
      }
      return base;
    });

    if (!box) return items.slice(0, limit);
    return items
      .filter(i => i.distancia_km <= params.raio)
      .sort((a, b) => a.distancia_km - b.distancia_km)
      .slice(0, limit);
  }

  async listFazedores(filters: FazedorFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [fazedores, total] = await Promise.all([
      this.fazedorRepository.findAll(filters, skip, limit),
      this.fazedorRepository.count(filters)
    ]);

    return {
      data: fazedores.map(formatFazedorPublico),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getServicosDoFazedor(id: string): Promise<any[]> {
    const fazedor = await this.resolverFazedorId(id);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }
    const servicos = await this.servicoRepository.findByFazedor(fazedor.id_fazedor);
    return servicos.map(formatServico);
  }

  /** `idFazedorOuUsuario` aceita id_fazedor ou id_usuario do fazedor. Uma avaliação por utilizador (actualiza se já existir). */
  async avaliarFazedor(avaliadorUserId: string, idFazedorOuUsuario: string, nota: number, comentario?: string): Promise<any> {
    const notaNum = Number(nota);
    if (!Number.isInteger(notaNum) || notaNum < 1 || notaNum > 5) {
      throw new ValidationError('Nota deve ser um inteiro entre 1 e 5');
    }

    if (!idFazedorOuUsuario) {
      throw new ValidationError('id_fazedor é obrigatório');
    }

    const fazedor = await this.resolverFazedorId(idFazedorOuUsuario);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    if (fazedor.id_usuario === avaliadorUserId) {
      throw new ForbiddenError('Não pode avaliar o seu próprio perfil');
    }

    const { avaliacao, criada } = await this.avaliacaoRepository.upsert({
      id_avaliador: avaliadorUserId,
      id_avaliado: fazedor.id_fazedor,
      nota: notaNum,
      comentario
    });

    const avaliador = await prisma.usuario.findUnique({
      where: { id_usuario: avaliadorUserId },
      select: { nome: true },
    });
    await this.notificacaoRepository.createSafe({
      id_usuario: fazedor.id_usuario,
      titulo: criada ? 'Nova avaliação' : 'Avaliação atualizada',
      mensagem: `${avaliador?.nome ?? 'Alguém'} avaliou o seu perfil com ${notaNum} estrela${notaNum > 1 ? 's' : ''}`,
      tipo: 'avaliacao',
      link: `/fazedor/${fazedor.id_fazedor}`,
      id_ator: avaliadorUserId
    });

    logger.info(`Avaliação ${criada ? 'criada' : 'atualizada'}: ${avaliadorUserId} -> ${fazedor.id_fazedor} (${notaNum})`);
    return { ...avaliacao, atualizada: !criada };
  }

  async getAvaliacoesDoFazedor(id: string, page: number = 1, limit: number = 20): Promise<any> {
    const fazedor = await this.resolverFazedorId(id);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const skip = (page - 1) * limit;
    const [avaliacoes, total] = await Promise.all([
      this.avaliacaoRepository.findByAvaliado(fazedor.id_fazedor, {}, skip, limit),
      this.avaliacaoRepository.countByAvaliado(fazedor.id_fazedor)
    ]);

    return {
      data: avaliacoes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getEstatisticasFazedor(fazedorUserId: string): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const [estatisticasAvaliacoes, estatisticasServicos] = await Promise.all([
      this.avaliacaoRepository.getEstatisticas(fazedor.id_fazedor),
      this.servicoRepository.getEstatisticas(fazedor.id_fazedor)
    ]);

    return {
      avaliacoes: estatisticasAvaliacoes,
      servicos: estatisticasServicos,
      perfil: {
        tipo: fazedor.tipo_fazedor,
        status_aprovacao: fazedor.status_aprovacao,
        data_cadastro: (fazedor.usuario as any)?.data_cadastro
      }
    };
  }

  async getCategoriasServicos(): Promise<string[]> {
    return await this.servicoRepository.getCategorias();
  }

  async getTiposFazedores(): Promise<string[]> {
    return FAZEDOR_TIPOS;
  }

  async search(
    query: string,
    tipo: string = 'todos',
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const result: any = {};

    if (!query || !query.trim()) {
      throw new ValidationError('Termo de pesquisa é obrigatório');
    }

    const searchTerm = query.trim();

    if (tipo === 'servicos' || tipo === 'todos') {
      const whereServicos: any = {
        OR: [
          { titulo: { contains: searchTerm } },
          { descricao: { contains: searchTerm } },
          { categoria: { contains: searchTerm } },
        ],
      };

      const [servicos, totalServicos] = await Promise.all([
        prisma.servico.findMany({
          where: whereServicos,
          skip: tipo === 'servicos' ? skip : 0,
          take: tipo === 'servicos' ? limit : 5,
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: { nome: true, foto_perfil: true },
                },
              },
            },
            imagens: {
              where: { is_principal: true },
              take: 1,
            },
          },
          orderBy: { data_criacao: 'desc' },
        }),
        prisma.servico.count({ where: whereServicos }),
      ]);

      result.servicos = { data: servicos, total: totalServicos };
    }

    if (tipo === 'fazedores' || tipo === 'todos') {
      // `tipo_fazedor` é um enum no Prisma — `contains` não é suportado.
      // Filtramos por igualdade quando o termo corresponder a um tipo válido.
      const enumValues = FAZEDOR_TIPOS as string[];
      const termoLower = searchTerm.toLowerCase();
      const tiposCorrespondentes = enumValues.filter(
        (t) => t.includes(termoLower) || termoLower.includes(t)
      );

      const whereFazedores: any = {
        OR: [
          { usuario: { nome: { contains: searchTerm } } },
          { biografia: { contains: searchTerm } },
          ...(tiposCorrespondentes.length > 0
            ? [{ tipo_fazedor: { in: tiposCorrespondentes } }]
            : []),
        ],
      };

      const [fazedores, totalFazedores] = await Promise.all([
        prisma.fazedor.findMany({
          where: whereFazedores,
          skip: tipo === 'fazedores' ? skip : 0,
          take: tipo === 'fazedores' ? limit : 5,
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
              },
            },
            agencia: { select: { nome_agencia: true } },
            modeloFreelancer: { select: { nome_artistico: true } },
          },
          orderBy: { avaliacao_media: 'desc' },
        }),
        prisma.fazedor.count({ where: whereFazedores }),
      ]);

result.fazedores = { data: fazedores, total: totalFazedores };
      }

    if (tipo === 'eventos' || tipo === 'todos') {
      const whereEventos: any = {
        OR: [
          { titulo: { contains: searchTerm } },
          { descricao: { contains: searchTerm } },
          { local: { contains: searchTerm } },
        ],
      };

      const [eventos, totalEventos] = await Promise.all([
        prisma.evento.findMany({
          where: whereEventos,
          skip: tipo === 'eventos' ? skip : 0,
          take: tipo === 'eventos' ? limit : 5,
          include: {
            organizador: {
              include: {
                usuario: {
                  select: { nome: true, foto_perfil: true },
                },
              },
            },
          },
          orderBy: { data_inicio: 'desc' },
        }),
        prisma.evento.count({ where: whereEventos }),
      ]);

      result.eventos = { data: eventos, total: totalEventos };
    }

    if (tipo !== 'todos') {
      const dataKey = tipo;
      const items = result[dataKey]?.data || [];
      const total = result[dataKey]?.total || 0;
      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return {
      ...result,
      page,
      limit,
    };
  }
}
