import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = uploadDir;

    if (file.fieldname === 'foto_perfil') {
      folder = path.join(uploadDir, 'perfil');
    } else if (file.fieldname === 'foto_servico') {
      folder = path.join(uploadDir, 'servicos');
    } else if (file.fieldname === 'foto_evento') {
      folder = path.join(uploadDir, 'eventos');
    } else if (file.fieldname === 'portfolio') {
      folder = path.join(uploadDir, 'portfolio');
    }

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou GIF.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
    files: 5
  }
});

export const uploadFotoPerfil = upload.single('foto_perfil');
export const uploadFotosServico = upload.array('fotos', 5);
export const uploadFotosEvento = upload.array('fotos', 10);
export const uploadPortfolio = upload.array('portfolio', 20);

// Middleware para tratar erros de upload
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Número máximo de arquivos excedido.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
};

// Função para deletar arquivo
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Função para gerar URL pública
export const getPublicUrl = (filename: string, folder: string = ''): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const uploadPath = process.env.UPLOAD_PATH || '/uploads';
  return `${baseUrl}${uploadPath}/${folder}${filename}`;
};
