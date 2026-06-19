import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { cloudinaryService } from '../services/cloudinary.service';

const storage = multer.memoryStorage();

const fileFilter = (_: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  console.log('📁 Arquivo recebido:', file.mimetype);
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou GIF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
    files: 10
  }
});

export const uploadFotoPerfil = upload.single('foto_perfil');
export const uploadFotosServico = upload.array('fotos', 5);
export const uploadFotosEvento = upload.array('fotos', 10);
export const uploadPortfolio = upload.array('portfolio', 20);
export const uploadSingle = upload.single('imagem');
export const uploadMultiple = upload.array('imagens', 10);

export const handleUploadError = (
  err: any,
  _: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo muito grande. Máximo 5MB.'
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Número máximo de arquivos excedido.'
      });
    }

    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  return next();
};
export const processUpload = async (
  file: Express.Multer.File,
  folder: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
) => {
  if (!file) return null;

  const result = await cloudinaryService.uploadBuffer(file.buffer, {
    folder,
    width: options?.width,
    height: options?.height,
    quality: options?.quality || 90
  });

  return {
    public_id: result.public_id,
    url: result.secure_url,
    thumbnail: cloudinaryService.getThumbnailUrl(result.public_id)
  };
};

export const processMultipleUploads = async (
  files: Express.Multer.File[],
  folder: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
) => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(file => processUpload(file, folder, options));
  return await Promise.all(uploadPromises);
};
