import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

export const multerOptions = (dest: string) => ({
  storage: diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = join(process.cwd(), 'media', dest);
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req: any, file: any, callback: any) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return callback(new BadRequestException('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
