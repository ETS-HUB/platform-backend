import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private uploadDir: string;
  private baseUrl: string;

  private readonly allowedMimeTypes = [
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/gzip',
    // Code/text
    'text/plain',
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/javascript',
  ];

  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.baseUrl =
      this.configService.get<string>('UPLOAD_BASE_URL') ||
      'http://localhost:3000/uploads';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, folder?: string) {
    if (!file) throw new BadRequestException('No file provided');

    // Validate mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed`,
      );
    }

    // Validate size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`,
      );
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${random}${ext}`;

    // Create subfolder if specified
    const targetDir = folder
      ? path.join(this.uploadDir, folder)
      : this.uploadDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write file
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const url = folder
      ? `${this.baseUrl}/${folder}/${fileName}`
      : `${this.baseUrl}/${fileName}`;

    return {
      url,
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
