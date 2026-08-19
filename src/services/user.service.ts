// backend/src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos/user.dto';
import { compararSenha, hashSenha } from '../utils/bcrypt';
import { ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import prisma from '../config/database'; // ✅ Importar diretamente

export class UserService {
  private notificacaoRepository: NotificacaoRepository;

  constructor(
    private userRepository: UserRepository,
    private fazedorRepository: FazedorRepository
  ) {
    this.notificacaoRepository = new NotificacaoRepository();
  }

  async pegarTodos(): Promise<any[]> {
    const users = await this.userRepository.findAll();
    return users.map(user => ({
      id: user.id_usuario,
      nome: user.nome,
      email: user.email,
      perfil: {
        telefone: user.telefone,
        foto: user.foto_perfil,
        status: user.status,
        tipo: user.tipo,
      },
      fazedor: user.fazedor,
      favoritos: user.favoritos,
      notificacoes: user.notificacoes,
      requisicoes: user.requisicoes,
      eventos: user.eventosParticipados,
      stories: user.stories,
      estatisticas: user._count,
    }));
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorWithDetails(userId);

    return {
      usuario: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        tipo: user.tipo,
        foto_perfil: user.foto_perfil,
        bio: (user as any).bio,
        data_cadastro: user.data_cadastro,
        email_verificado: (user as any).email_verificado,
        status: user.status
      },
      fazedor: fazedor ? {
        id: fazedor.id_fazedor,
        tipo_fazedor: fazedor.tipo_fazedor,
        status_aprovacao: fazedor.status_aprovacao,
        avaliacao_media: fazedor.avaliacao_media,
        total_avaliacoes: fazedor.total_avaliacoes,
        biografia: fazedor.biografia,
        instagram: fazedor.instagram,
        facebook: fazedor.facebook,
        website: fazedor.website,
        ...(fazedor.agencia && { agencia: fazedor.agencia }),
        ...(fazedor.modeloFreelancer && { modelo: fazedor.modeloFreelancer }),
        ...(fazedor.estilista && { estilista: fazedor.estilista }),
        ...(fazedor.maquiador && { maquiador: fazedor.maquiador }),
        ...(fazedor.fotografo && { fotografo: fazedor.fotografo })
      } : null
    };
  }

  async getFazedorByUserId(userId: string): Promise<any> {
    return await this.fazedorRepository.findFazedorByUserId(userId);
  }

  // ✅ CORRIGIDO - Usar prisma importado diretamente
  async getMeusServicos(fazedorId: string): Promise<any[]> {
    try {
      const servicos = await prisma.servico.findMany({
        where: { id_fazedor: fazedorId },
        include: {
          fazedor: {
            include: {
              usuario: {
                select: {
                  nome: true,
                  foto_perfil: true,
                  email: true
                }
              }
            }
          },
          imagens: {
            orderBy: { ordem: 'asc' }
          }
        },
        orderBy: { data_criacao: 'desc' }
      });
      return servicos;
    } catch (error) {
      logger.error('Erro ao buscar serviços:', error);
      return [];
    }
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const updatedUser = await this.userRepository.updateUser(userId, {
      nome: dto.nome,
      telefone: dto.telefone,
      foto_perfil: dto.foto_perfil,
      foto_perfil_public_id: dto.foto_perfil_public_id ? dto.foto_perfil_public_id : "",
      bio: dto.bio
    });

    // ✅ Atualizar dados de modelo freelancer se o usuário for um
    const fazedor = await this.fazedorRepository.findFazedorByUserId(userId);
    if (fazedor && fazedor.tipo_fazedor === 'modelo_freelancer' && fazedor.modeloFreelancer) {
      const modeloData: any = {};
      if (dto.nome_artistico !== undefined) modeloData.nome_artistico = dto.nome_artistico;
      if (dto.altura !== undefined) modeloData.altura = dto.altura ? parseFloat(String(dto.altura).replace(',', '.')) : null;
      if (dto.peso !== undefined) modeloData.peso = dto.peso ? parseFloat(String(dto.peso).replace(',', '.')) : null;
      if (dto.busto !== undefined) modeloData.busto = dto.busto ? parseInt(dto.busto) : null;
      if (dto.cintura !== undefined) modeloData.cintura = dto.cintura ? parseInt(dto.cintura) : null;
      if (dto.quadril !== undefined) modeloData.quadril = dto.quadril ? parseInt(dto.quadril) : null;
      if (dto.sapato !== undefined) modeloData.sapato = dto.sapato ? parseInt(dto.sapato) : null;
      if (dto.roupa !== undefined) modeloData.roupa = dto.roupa ? parseInt(dto.roupa) : null;
      if (dto.cabelo !== undefined) modeloData.cabelo = dto.cabelo;
      if (dto.olhos !== undefined) modeloData.olhos = dto.olhos;
      if (dto.idade !== undefined) modeloData.idade = dto.idade ? parseInt(dto.idade) : null;
      if (dto.nacionalidade !== undefined) modeloData.nacionalidade = dto.nacionalidade;
      if (dto.experiencia !== undefined) modeloData.experiencia = dto.experiencia;
      if (dto.habilidades !== undefined) modeloData.habilidades = dto.habilidades;
      if (dto.status_modelo !== undefined) modeloData.status = dto.status_modelo;

      if (Object.keys(modeloData).length > 0) {
        await prisma.modeloFreelancer.update({
          where: { id_fazedor: fazedor.id_fazedor },
          data: modeloData
        });
      }
    }

    logger.info(`Perfil atualizado para usuário: ${user.email}`);

    return {
      id: updatedUser.id_usuario,
      nome: updatedUser.nome,
      email: updatedUser.email,
      telefone: updatedUser.telefone,
      tipo: updatedUser.tipo,
      foto_perfil: updatedUser.foto_perfil,
      bio: (updatedUser as any).bio,
      data_cadastro: updatedUser.data_cadastro
    };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(
      (await this.userRepository.findById(userId))?.email || ''
    );

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const isPasswordValid = await compararSenha(dto.senha_atual, user.senha_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Senha atual incorreta');
    }

    const hashedPassword = await hashSenha(dto.nova_senha);
    await this.userRepository.updatePassword(userId, hashedPassword);
    logger.info(`Senha atualizada para usuário: ${user.email}`);
  }

  async updateFotoPerfil(userId: string, fotoUrl: string, publicId: string): Promise<any> {
    try {
      const updatedUser = await this.userRepository.update(userId, {
        foto_perfil: fotoUrl,
        foto_perfil_public_id: publicId
      });

      return {
        foto_perfil_url: updatedUser.foto_perfil,
        foto_perfil_public_id: updatedUser.foto_perfil_public_id
      };
    } catch (error: any) {
      throw new Error(`Erro ao atualizar foto de perfil: ${error.message}`);
    }
  }

  async listFavoritos(userId: string): Promise<any[]> {
    const favoritos = await this.userRepository.listFavoritos(userId);

    return favoritos.map(fav => ({
      id: fav.id_favorito,
      fazedor: {
        id: fav.fazedor.id_fazedor,
        nome: fav.fazedor.usuario.nome,
        email: fav.fazedor.usuario.email,
        tipo_fazedor: fav.fazedor.tipo_fazedor,
        avaliacao_media: fav.fazedor.avaliacao_media,
        foto_perfil: fav.fazedor.usuario.foto_perfil,
        status_aprovacao: fav.fazedor.status_aprovacao
      },
      data_adicao: fav.data_adicao
    }));
  }

  async addFavorito(userId: string, fazedorId: string): Promise<void> {
    const fazedor = await this.fazedorRepository.findFazedorById(fazedorId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const isFav = await this.userRepository.isFavorito(userId, fazedorId);
    if (isFav) {
      throw new ValidationError('Fazedor já está nos favoritos');
    }

    await this.userRepository.addFavorito(userId, fazedorId);

    const user = await this.userRepository.findById(userId);
    logger.info(`Favorito adicionado: usuário ${user?.email} -> fazedor ${fazedorId}`);
  }

  async removeFavorito(userId: string, fazedorId: string): Promise<void> {
    const isFav = await this.userRepository.isFavorito(userId, fazedorId);
    if (!isFav) {
      throw new ValidationError('Fazedor não está nos favoritos');
    }

    await this.userRepository.removeFavorito(userId, fazedorId);

    const user = await this.userRepository.findById(userId);
    logger.info(`Favorito removido: usuário ${user?.email} -> fazedor ${fazedorId}`);
  }

  async getEstatisticas(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const favoritos = await this.userRepository.listFavoritos(userId);
    const fazedor = await this.fazedorRepository.findFazedorByUserId(userId);

    const [totalSeguidores, totalSeguindo] = await Promise.all([
      this.userRepository.countSeguidores(userId),
      this.userRepository.countSeguindo(userId),
    ]);

    let estatisticas = {
      total_favoritos: favoritos.length,
      total_servicos: 0,
      total_seguidores: totalSeguidores,
      total_seguindo: totalSeguindo,
      total_avaliacoes: 0,
      avaliacao_media: 0,
      data_cadastro: user.data_cadastro,
    };

    if (fazedor) {
      const [servicos, totalAvaliacoes, aggregate] = await Promise.all([
        prisma.servico.count({ where: { id_fazedor: fazedor.id_fazedor } }),
        prisma.avaliacao.count({ where: { id_avaliado: fazedor.id_fazedor } }),
        prisma.avaliacao.aggregate({
          where: { id_avaliado: fazedor.id_fazedor },
          _avg: { nota: true },
        }),
      ]);
      estatisticas.total_servicos = servicos;
      estatisticas.total_avaliacoes = totalAvaliacoes;
      estatisticas.avaliacao_media = aggregate._avg.nota ?? 0;
    }

    return estatisticas;
  }

  async followUser(seguidorId: string, seguidoId: string): Promise<void> {
    if (seguidorId === seguidoId) {
      throw new ValidationError('Não podes seguir a ti mesmo');
    }

    const seguido = await this.userRepository.findById(seguidoId);
    if (!seguido) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const isFollowing = await this.userRepository.isFollowing(seguidorId, seguidoId);
    if (isFollowing) {
      throw new ValidationError('Já segues este usuário');
    }

    await this.userRepository.followUser(seguidorId, seguidoId);

    const seguidor = await this.userRepository.findById(seguidorId);
    if (seguidor) {
      await this.notificacaoRepository.create({
        id_usuario: seguidoId,
        titulo: 'Novo seguidor',
        mensagem: `${seguidor.nome} começou a seguir-te`,
        tipo: 'sistema',
        link: `/perfil/${seguidorId}`,
      });
    }

    logger.info(`Usuário ${seguidorId} seguiu ${seguidoId}`);
  }

  async unfollowUser(seguidorId: string, seguidoId: string): Promise<void> {
    const isFollowing = await this.userRepository.isFollowing(seguidorId, seguidoId);
    if (!isFollowing) {
      throw new ValidationError('Não segues este usuário');
    }

    await this.userRepository.unfollowUser(seguidorId, seguidoId);
    logger.info(`Usuário ${seguidorId} deixou de seguir ${seguidoId}`);
  }

  async getMySeguidores(userId: string): Promise<any[]> {
    return this.userRepository.getSeguidores(userId);
  }

  async getMySeguindo(userId: string): Promise<any[]> {
    return this.userRepository.getSeguindo(userId);
  }

  async getUserSeguidores(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.userRepository.getSeguidores(userId);
  }

  async verificarSeguindo(seguidorId: string, seguidoId: string): Promise<boolean> {
    return this.userRepository.isFollowing(seguidorId, seguidoId);
  }

  async contarSeguidores(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.userRepository.countSeguidores(userId);
  }

  async contarSeguindo(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.userRepository.countSeguindo(userId);
  }
}
