import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { uploadSingle, handleUploadError } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import { createStoryValidation, storyIdValidation, visualizarStoryValidation } from '../validations/story.validation';
import { StoryController } from '../controller/story.controller';

const router = Router();
const storyController = new StoryController();

router.use(autenticar);

router.post('/',
  uploadSingle,
  handleUploadError,
  createStoryValidation,
  validate,
  storyController.criarStory.bind(storyController)
);

router.get('/',
  storyController.listarStories.bind(storyController)
);

router.get('/meus',
  storyController.meusStories.bind(storyController)
);

router.post('/:id/visualizar',
  visualizarStoryValidation,
  validate,
  storyController.visualizarStory.bind(storyController)
);

router.post('/:id/curtir',
  storyIdValidation,
  validate,
  storyController.curtirStory.bind(storyController)
);

router.delete('/:id/curtir',
  storyIdValidation,
  validate,
  storyController.descurtirStory.bind(storyController)
);

router.delete('/:id',
  storyIdValidation,
  validate,
  storyController.deletarStory.bind(storyController)
);

export default router;
