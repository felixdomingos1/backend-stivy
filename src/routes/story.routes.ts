import { Router } from 'express';
import { param } from 'express-validator';
import multer from 'multer';
import { autenticar } from '../middleware/auth.middleware';
import { handleUploadError } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import { comentarStoryValidation, createStoryValidation, storyIdValidation, visualizarStoryValidation } from '../validations/story.validation';
import { StoryController } from '../controller/story.controller';
import { autenticacaoOpcional } from '../services/authorization.service';

const router = Router();
const storyController = new StoryController();

// Upload próprio dos stories: aceita imagens e vídeos curtos (campo `imagem` ou `midia`).
const STORY_MIMES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'
];
const storyUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_STORY_FILE_SIZE || String(30 * 1024 * 1024), 10),
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (STORY_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP, GIF, MP4, MOV ou WEBM.'));
    }
  }
}).fields([{ name: 'imagem', maxCount: 1 }, { name: 'midia', maxCount: 1 }]);

const normalizarFicheiroStory = (req: any, _res: any, next: any) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  req.file = files?.imagem?.[0] ?? files?.midia?.[0];
  next();
};

// Público com autenticação opcional (para calcular ja_visualizou / curti)
router.get('/',
  autenticacaoOpcional,
  storyController.listarStories.bind(storyController)
);

router.use(autenticar);

router.post('/',
  storyUpload,
  handleUploadError,
  normalizarFicheiroStory,
  createStoryValidation,
  validate,
  storyController.criarStory.bind(storyController)
);

router.get('/meus',
  storyController.meusStories.bind(storyController)
);

router.get('/:id/visualizacoes',
  storyIdValidation,
  validate,
  storyController.listarVisualizacoes.bind(storyController)
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

router.get('/:id/comentarios',
  storyIdValidation,
  validate,
  storyController.listarComentarios.bind(storyController)
);

router.post('/:id/comentarios',
  comentarStoryValidation,
  validate,
  storyController.comentarStory.bind(storyController)
);

router.delete('/comentarios/:id',
  param('id').isUUID().withMessage('ID de comentário inválido'),
  validate,
  storyController.apagarComentario.bind(storyController)
);

router.delete('/:id',
  storyIdValidation,
  validate,
  storyController.deletarStory.bind(storyController)
);

export default router;
