import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { uploadSingle, handleUploadError } from '../middleware/upload.middleware';
import { StoryController } from '../controller/story.controller';

const router = Router();
const storyController = new StoryController();

router.use(autenticar);

router.post('/',
  uploadSingle,
  handleUploadError,
  storyController.criarStory.bind(storyController)
);

router.get('/',
  storyController.listarStories.bind(storyController)
);

router.get('/meus',
  storyController.meusStories.bind(storyController)
);

router.post('/:id/visualizar',
  storyController.visualizarStory.bind(storyController)
);

router.post('/:id/curtir',
  storyController.curtirStory.bind(storyController)
);

router.delete('/:id/curtir',
  storyController.descurtirStory.bind(storyController)
);

router.delete('/:id',
  storyController.deletarStory.bind(storyController)
);

export default router;
