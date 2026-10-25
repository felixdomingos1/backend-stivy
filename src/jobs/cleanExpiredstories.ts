import cron from 'node-cron';
import { StoryRepository } from '../repositories/story.repository';
import { cloudinaryService } from '../services/cloudinary.service';
import logger from '../utils/logger';

const storyRepository = new StoryRepository();
let started = false;

/** Remove stories expirados (BD + media no Cloudinary). Devolve o nº de stories removidos. */
export const cleanExpiredStories = async (): Promise<number> => {
  const expirados = await storyRepository.findExpired(500);
  if (expirados.length === 0) return 0;

  await Promise.all(
    expirados.map(story =>
      cloudinaryService
        .deleteFile(story.midia_public_id, story.tipo === 'video' ? 'video' : 'image')
        .catch(err => logger.warn(`Falha ao apagar media do story ${story.id_story}:`, err?.message ?? err))
    )
  );

  return await storyRepository.deleteByIds(expirados.map(s => s.id_story));
};

/** Agenda a limpeza horária (idempotente). */
export const startCleanExpiredStoriesJob = (): void => {
  if (started) return;
  started = true;
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await cleanExpiredStories();
      if (count > 0) {
        logger.info(`${count} stories expirados foram removidos`);
      }
    } catch (error) {
      logger.error('Erro ao limpar stories expirados:', error);
    }
  });
  logger.info('Job de limpeza de stories expirados agendado (de hora a hora)');
};
