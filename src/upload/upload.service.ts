import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/gzip',
    'text/plain',
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/javascript',
  ];

  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder?: string) {
    if (!file) throw new BadRequestException('No file provided');

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`,
      );
    }

    const isImage = file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';
    const uploadFolder = folder ? `ets-platform/${folder}` : 'ets-platform';

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: uploadFolder, resource_type: resourceType },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });

    return {
      url: result.secure_url,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  async uploadMultiple(files: Express.Multer.File[], folder?: string) {
    const results: any[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file, folder);
      results.push(result);
    }
    return results;
  }
}
