import cron from 'node-cron';
import { StoryRepository } from '../repositories/story.repository';
import logger from '../utils/logger';

const storyRepository = new StoryRepository();

cron.schedule('0 * * * *', async () => {
  try {
    const count = await storyRepository.deleteExpiredStories();
    if (count > 0) {
      logger.info(`${count} stories expirados foram removidos`);
    }
  } catch (error) {
    logger.error('Erro ao limpar stories expirados:', error);
  }
});
