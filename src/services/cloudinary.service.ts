import cloudinary, { CloudinaryUploadResult } from '../config/cloudinary';
import { Readable } from 'stream';

export interface UploadOptions {
  folder?: string;
  quality?: number;
  width?: number;
  height?: number;
  crop?: string;
  tags?: string[];
  transformation?: any[];
  resource_type?:any
}

export class CloudinaryService {
  private readonly defaultOptions: UploadOptions = {
    folder: 'general',
    quality: 90,
    crop: 'limit'
  };

  async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: uploadOptions.folder,
          quality: uploadOptions.quality,
          width: uploadOptions.width,
          height: uploadOptions.height,
          crop: uploadOptions.crop,
          tags: uploadOptions.tags,
          transformation: uploadOptions.transformation
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadBase64(
    base64String: string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64String,
        {
          folder: uploadOptions.folder,
          quality: uploadOptions.quality,
          width: uploadOptions.width,
          height: uploadOptions.height,
          crop: uploadOptions.crop,
          tags: uploadOptions.tags
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      );
    });
  }

  async uploadMultipleBuffers(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult[]> {
    const promises = files.map(file => this.uploadBuffer(file.buffer, options));
    return await Promise.all(promises);
  }

  async deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async deleteMultipleFiles(publicIds: string[]): Promise<void> {
    const promises = publicIds.map(publicId => this.deleteFile(publicId));
    await Promise.all(promises);
  }

  async updateImage(
    oldPublicId: string | null,
    newBuffer: Buffer,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (oldPublicId) {
      await this.deleteFile(oldPublicId);
    }
    return await this.uploadBuffer(newBuffer, options);
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    crop?: string;
    effect?: string;
  } = {}): string {
    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.crop) transformations.push(`c_${options.crop}`);
    if (options.effect) transformations.push(`e_${options.effect}`);

    const transformationString = transformations.join(',');

    return cloudinary.url(publicId, {
      transformation: transformationString,
      secure: true
    });
  }

  getThumbnailUrl(publicId: string, size: number = 200): string {
    return this.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: 'thumb',
      quality: 80
    });
  }

  extractPublicIdFromUrl(url: string): string | null {
    try {
      // Padrão: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
      const matches = url.match(/\/upload\/v\d+\/(.+)\.\w+$/);
      if (matches && matches[1]) {
        return matches[1];
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
