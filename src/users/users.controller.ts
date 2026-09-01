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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile, ratings summary, and active subscription info' })
  @ApiResponse({ status: 200, description: 'Current user profile with full details' })
  @ApiResponse({ status: 404, description: 'Current user record not found' })
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
  @ApiOperation({ summary: 'Update profile details, avatar, and gallery images' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'gallery', maxCount: 1000 },
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

    if (profileUpdateData.categoryIds && typeof profileUpdateData.categoryIds === 'string') {
      try {
        profileUpdateData.categoryIds = JSON.parse(profileUpdateData.categoryIds);
      } catch (e) {
        profileUpdateData.categoryIds = [profileUpdateData.categoryIds];
      }
    }

    let parsedYoutubeLinks: string[] = [];
    if (profileUpdateData.youtubeLinks) {
      if (typeof profileUpdateData.youtubeLinks === 'string') {
        try {
          parsedYoutubeLinks = JSON.parse(profileUpdateData.youtubeLinks);
        } catch (e) {
          parsedYoutubeLinks = [profileUpdateData.youtubeLinks];
        }
      } else if (Array.isArray(profileUpdateData.youtubeLinks)) {
        parsedYoutubeLinks = profileUpdateData.youtubeLinks;
      }
    }
    if (profileUpdateData.youtubeLink1) parsedYoutubeLinks.push(profileUpdateData.youtubeLink1);
    if (profileUpdateData.youtubeLink2) parsedYoutubeLinks.push(profileUpdateData.youtubeLink2);
    if (profileUpdateData.youtubeLink3) parsedYoutubeLinks.push(profileUpdateData.youtubeLink3);
    if (profileUpdateData.youtubeLink && !parsedYoutubeLinks.includes(profileUpdateData.youtubeLink)) {
      parsedYoutubeLinks.unshift(profileUpdateData.youtubeLink);
    }
    if (parsedYoutubeLinks.length > 0 || profileUpdateData.youtubeLinks !== undefined || profileUpdateData.youtubeLink !== undefined) {
      parsedYoutubeLinks = parsedYoutubeLinks
        .map((l) => (typeof l === 'string' ? l.trim() : ''))
        .filter((l) => l.length > 0)
        .slice(0, 3);
      profileUpdateData.youtubeLinks = parsedYoutubeLinks;
      profileUpdateData.youtubeLink = parsedYoutubeLinks[0] || null;
    }
    delete profileUpdateData.youtubeLink1;
    delete profileUpdateData.youtubeLink2;
    delete profileUpdateData.youtubeLink3;

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
  @ApiOperation({ summary: 'Send email confirmation code to initiate account deletion' })
  @ApiResponse({ status: 200, description: 'Confirmation code sent to registered email' })
  async requestDeleteAccount(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.usersService.requestDeleteAccount(userId);
  }

  @Post('delete-account-permanently')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete account using password and verification code' })
  @ApiResponse({ status: 200, description: 'Account permanently deleted' })
  @ApiResponse({ status: 400, description: 'Invalid code or password incorrect' })
  async deleteAccount(@Request() req: any, @Body() dto: DeleteAccountDto) {
    const userId = req.user?.id || req.user?.sub;
    return this.usersService.deleteAccount(userId, dto.password, dto.code);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get list of all registered users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAllUsersForAdmin() {
    return this.usersService.findAllUsersForAdmin();
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Update active/suspended status of a user' })
  @ApiParam({ name: 'id', description: 'Target user ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['active', 'suspended', 'inactive'], example: 'active' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.usersService.updateUserStatus(id, status);
  }
}
