import { ServicoDenunciaService } from '../../../services/servico-denuncia.service';
import { ServicoDenunciaRepository } from '../../../repositories/servico-denuncia.repository';
import { ServicoRepository } from '../../../repositories/servico.repository';
import { NotFoundError, ValidationError } from '../../../utils/errors';

describe('ServicoDenunciaService', () => {
  let service: ServicoDenunciaService;
  let denunciaRepository: jest.Mocked<ServicoDenunciaRepository>;
  let servicoRepository: jest.Mocked<ServicoRepository>;

  const donoId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440001';
  const servicoId = '770e8400-e29b-41d4-a716-446655440002';

  const servico = { id_servico: servicoId, fazedor: { usuario: { id_usuario: donoId } } } as any;

  beforeEach(() => {
    denunciaRepository = { upsert: jest.fn() } as any;
    servicoRepository = { findById: jest.fn() } as any;
    service = new ServicoDenunciaService(denunciaRepository, servicoRepository);
  });

  it('regista a denúncia de um serviço de outro utilizador', async () => {
    servicoRepository.findById.mockResolvedValue(servico);
    denunciaRepository.upsert.mockResolvedValue({ id_denuncia: 'd1' });

    const data = { id_servico: servicoId, id_usuario: userId, motivo: 'spam' as const };
    await expect(service.create(data)).resolves.toEqual({ id_denuncia: 'd1' });
    expect(denunciaRepository.upsert).toHaveBeenCalledWith(data);
  });

  it('lança NotFoundError se o serviço não existir', async () => {
    servicoRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({ id_servico: servicoId, id_usuario: userId, motivo: 'falso' })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(denunciaRepository.upsert).not.toHaveBeenCalled();
  });

  it('impede o dono de denunciar a própria publicação', async () => {
    servicoRepository.findById.mockResolvedValue(servico);

    await expect(
      service.create({ id_servico: servicoId, id_usuario: donoId, motivo: 'outro' })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(denunciaRepository.upsert).not.toHaveBeenCalled();
  });
});
