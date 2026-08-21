import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import { config } from '../../config/config.js';

export const multerOptions = (dest: string) => ({
  limits: {
    fileSize: dest === 'chat' ? 100 * 1024 * 1024 : 10 * 1024 * 1024,
  },
  storage: diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = join(config.MEDIA_ROOT, dest);

      try {
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      } catch (error: any) {
        callback(
          new InternalServerErrorException(
            `Upload directory error: ${error.message}`,
          ),
          uploadPath,
        );
      }
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
      callback(null, fileName);
    },
  }),
  fileFilter: (req: any, file: any, callback: any) => {
    // Allow images, audio, video, and common documents for chat
    if (dest === 'chat') {
      const chatAllowedRegex =
        /\.(jpg|jpeg|png|gif|webp|svg|mp3|wav|m4a|ogg|webm|aac|flac|mp4|mov|avi|mkv|flv|wmv|m4v|pdf|doc|docx|txt|xls|xlsx|csv|ppt|pptx|zip|rar)$/i;

      if (!file.originalname.match(chatAllowedRegex)) {
        return callback(
          new BadRequestException(
            'Unsupported file type! Please upload a valid image, video, audio, or document file.',
          ),
          false,
        );
      }
    } else {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return callback(
          new BadRequestException('Only image files are allowed!'),
          false,
        );
      }
    }
    callback(null, true);
  },
});

