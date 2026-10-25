import { DenunciaMotivo, DenunciaStatus } from '@prisma/client';
import { ServicoDenunciaRepository } from '../repositories/servico-denuncia.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { NotFoundError, ValidationError } from '../utils/errors';

export const DENUNCIA_MOTIVOS = Object.values(DenunciaMotivo);
export const DENUNCIA_STATUS = Object.values(DenunciaStatus);

export class ServicoDenunciaService {
  constructor(
    private denunciaRepository: ServicoDenunciaRepository,
    private servicoRepository: ServicoRepository
  ) { }

  async create(data: {
    id_servico: string;
    id_usuario: string;
    motivo: DenunciaMotivo;
    descricao?: string;
  }): Promise<any> {
    const servico = await this.servicoRepository.findById(data.id_servico);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }
    if (servico.fazedor?.usuario?.id_usuario === data.id_usuario) {
      throw new ValidationError('Não podes denunciar a tua própria publicação');
    }

    return await this.denunciaRepository.upsert(data);
  }
}
