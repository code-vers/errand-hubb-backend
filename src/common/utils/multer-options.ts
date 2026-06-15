import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import { config } from '../../config/config.js';

export const multerOptions = (dest: string) => ({
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
    // Allow images and audio for chat
    if (dest === 'chat') {
      if (
        !file.originalname.match(
          /\.(jpg|jpeg|png|gif|webp|mp3|wav|m4a|ogg|webm)$/,
        )
      ) {
        return callback(
          new BadRequestException(
            'Only images and audio files are allowed for chat!',
          ),
          false,
        );
      }
    } else {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return callback(
          new BadRequestException('Only image files are allowed!'),
          false,
        );
      }
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
