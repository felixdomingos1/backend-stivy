// services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos/user.dto';
import { compararSenha, hashSenha } from '../utils/bcrypt';
import { ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private fazedorRepository: FazedorRepository
  ) { }

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
        // Dados específicos por tipo
        ...(fazedor.agencia && { agencia: fazedor.agencia }),
        ...(fazedor.modeloFreelancer && { modelo: fazedor.modeloFreelancer }),
        ...(fazedor.estilista && { estilista: fazedor.estilista }),
        ...(fazedor.maquiador && { maquiador: fazedor.maquiador }),
        ...(fazedor.fotografo && { fotografo: fazedor.fotografo })
      } : null
    };
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
      bio: dto.bio
    });

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

    // Verificar senha atual
    const isPasswordValid = await compararSenha(dto.senha_atual, user.senha_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Senha atual incorreta');
    }

    // Hash da nova senha
    const hashedPassword = await hashSenha(dto.nova_senha);

    // Atualizar senha
    await this.userRepository.updatePassword(userId, hashedPassword);

    logger.info(`Senha atualizada para usuário: ${user.email}`);
  }

  async updateFotoPerfil(userId: string, fotoUrl: string): Promise<{ foto_perfil: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    await this.userRepository.updateFotoPerfil(userId, fotoUrl);

    logger.info(`Foto de perfil atualizada para usuário: ${user.email}`);

    return { foto_perfil: fotoUrl };
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
    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    // Verificar se já é favorito
    const isFav = await this.userRepository.isFavorito(userId, fazedorId);
    if (isFav) {
      throw new ValidationError('Fazedor já está nos favoritos');
    }

    await this.userRepository.addFavorito(userId, fazedorId);

    const user = await this.userRepository.findById(userId);
    logger.info(`Favorito adicionado: usuário ${user?.email} -> fazedor ${fazedorId}`);
  }

  async removeFavorito(userId: string, fazedorId: string): Promise<void> {
    // Verificar se é favorito
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

    let estatisticas = {
      total_favoritos: favoritos.length,
      data_cadastro: user.data_cadastro,
      dias_membro: Math.floor((Date.now() - user.data_cadastro.getTime()) / (1000 * 60 * 60 * 24))
    };

    // Se for fazedor, adiciona estatísticas específicas
    if (fazedor) {
      const servicos = await this.prisma?.servico.count({
        where: { id_fazedor: fazedor.id_fazedor }
      });

      const eventos = await this.prisma?.evento.count({
        where: { id_organizador: fazedor.id_fazedor }
      });

      const avaliacoes = await this.prisma?.avaliacao.count({
        where: { id_avaliado: fazedor.id_fazedor }
      });

      estatisticas = {
        ...estatisticas,
        // total_servicos: servicos || 0,
        // total_eventos: eventos || 0,
        // total_avaliacoes: avaliacoes || 0,
        // avaliacao_media: fazedor.avaliacao_media,
        // status_aprovacao: fazedor.status_aprovacao
      };
    }

    return estatisticas;
  }

  private get prisma() {
    return require('../config/database').default;
  }
}
