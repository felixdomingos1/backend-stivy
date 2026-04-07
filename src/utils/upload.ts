import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  quality?: number;
  width?: number;
  height?: number;
}

export class UploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_PATH || './uploads';
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'perfil'),
      path.join(this.uploadDir, 'servicos'),
      path.join(this.uploadDir, 'eventos'),
      path.join(this.uploadDir, 'portfolio')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async saveFile(
    file: Express.Multer.File,
    folder: string = '',
    options: UploadOptions = {}
  ): Promise<string> {
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Tipo de arquivo não suportado. Use: ${allowedTypes.join(', ')}`);
    }

    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error(`Arquivo muito grande. Máximo ${maxSize / 1024 / 1024}MB`);
    }

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, folder, filename);

    // Processar imagem
    let buffer = file.buffer;
    if (options.width || options.height || options.quality) {
      let sharpInstance = sharp(file.buffer);

      if (options.width || options.height) {
        sharpInstance = sharpInstance.resize(options.width, options.height, {
          fit: 'cover',
          withoutEnlargement: true
        });
      }

      if (options.quality) {
        sharpInstance = sharpInstance.jpeg({ quality: options.quality });
      }

      buffer = await sharpInstance.toBuffer();
    }

    await fs.promises.writeFile(filePath, buffer);

    return filename;
  }

  async saveMultipleFiles(
    files: Express.Multer.File[],
    folder: string = '',
    options: UploadOptions = {}
  ): Promise<string[]> {
    const promises = files.map(file => this.saveFile(file, folder, options));
    return await Promise.all(promises);
  }

  async deleteFile(filename: string, folder: string = ''): Promise<void> {
    const filePath = path.join(this.uploadDir, folder, filename);

    try {
      await fs.promises.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async deleteMultipleFiles(filenames: string[], folder: string = ''): Promise<void> {
    const promises = filenames.map(filename => this.deleteFile(filename, folder));
    await Promise.all(promises);
  }

  getPublicUrl(filename: string, folder: string = ''): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${folder}${filename}`;
  }

  async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: { width?: number; height?: number; quality?: number } = {}
  ): Promise<void> {
    let sharpInstance = sharp(inputPath);

    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: 'cover',
        withoutEnlargement: true
      });
    }

    if (options.quality) {
      sharpInstance = sharpInstance.jpeg({ quality: options.quality });
    }

    await sharpInstance.toFile(outputPath);
  }
}

export const uploadService = new UploadService();
