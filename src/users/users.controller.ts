import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  NotFoundException,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    console.log('CONTROLLER: Fetching profile for ID:', userId);
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('Current user record not found');
    }
    return user;
  }

  @Patch('profile')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'gallery', maxCount: 5 },
      ],
      multerOptions('profiles'),
    ),
  )
  async updateProfile(
    @Request() req: any,
    @Body() updateDto: UpdateProfileDto,
    @UploadedFiles()
    files?: {
      profileImage?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    const userId = req.user?.id || req.user?.sub;
    console.log('CONTROLLER: Updating profile for ID:', userId);

    let profileImage: string | undefined;
    if (files?.profileImage && files.profileImage[0]) {
      profileImage = `/media/profiles/${files.profileImage[0].filename}`;
    }

    const { firstName, lastName, retainedGallery, ...profileData } = updateDto;

    let profileUpdateData: any = { ...profileData };

    if ((files?.gallery && files.gallery.length > 0) || retainedGallery !== undefined) {
      let parsedRetainedGallery: string[] = [];
      if (retainedGallery) {
        try {
          parsedRetainedGallery = typeof retainedGallery === 'string'
            ? JSON.parse(retainedGallery)
            : retainedGallery;
        } catch (e) {
          parsedRetainedGallery = Array.isArray(retainedGallery) ? retainedGallery : [retainedGallery];
        }
      }
      const newGalleryFiles = files?.gallery
        ? files.gallery.map((file) => `/media/profiles/${file.filename}`)
        : [];
      profileUpdateData.gallery = [...parsedRetainedGallery, ...newGalleryFiles];
    }

    const user = await this.usersService.updateFullProfile(userId, {
      firstName,
      lastName,
      profileImage,
      profile: Object.keys(profileUpdateData).length > 0 ? profileUpdateData : undefined,
    });

    if (!user) {
      throw new NotFoundException('User profile could not be updated');
    }

    return user;
  }

  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 requests per 15 minutes
  @Post('request-delete-account')
  @HttpCode(HttpStatus.OK)
  async requestDeleteAccount(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.usersService.requestDeleteAccount(userId);
  }

  @Post('delete-account-permanently')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: any, @Body() dto: DeleteAccountDto) {
    const userId = req.user?.id || req.user?.sub;
    return this.usersService.deleteAccount(userId, dto.password, dto.code);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllUsersForAdmin() {
    return this.usersService.findAllUsersForAdmin();
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.usersService.updateUserStatus(id, status);
  }
}
