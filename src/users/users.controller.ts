import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { Throttle } from '@nestjs/throttler';

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
  @UseInterceptors(FileInterceptor('profileImage', multerOptions('profiles')))
  async updateProfile(
    @Request() req: any,
    @Body() updateDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user?.id || req.user?.sub;
    console.log('CONTROLLER: Updating profile for ID:', userId);

    let profileImage: string | undefined;
    if (file) {
      profileImage = `/media/profiles/${file.filename}`;
    }

    const { firstName, lastName, ...profileData } = updateDto;

    const user = await this.usersService.updateFullProfile(userId, {
      firstName,
      lastName,
      profileImage,
      profile: Object.keys(profileData).length > 0 ? profileData : undefined,
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
}
