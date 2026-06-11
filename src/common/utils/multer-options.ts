import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { config } from '../../config/config.js';

export const multerOptions = (dest: string) => ({
  storage: diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = join(config.MEDIA_ROOT, dest);
      console.log(`MULTER: Uploading to ${uploadPath}`);
      
      try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
          console.log(`MULTER: Creating directory ${uploadPath}`);
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        // Test write permissions
        const testFile = join(uploadPath, '.test-write');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        
        callback(null, uploadPath);
      } catch (error: any) {
        console.error(`MULTER ERROR: Failed to prepare directory ${uploadPath}:`, error.message);
        callback(new InternalServerErrorException(`Upload directory error: ${error.message}`), uploadPath);
      }
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
      console.log(`MULTER: Generated filename ${fileName}`);
      callback(null, fileName);
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
