import { Controller, Get, Body, Patch, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.findOneById(req.user.sub);
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('profileImage', multerOptions('profiles')))
  updateProfile(
    @Request() req: any,
    @Body() updateData: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('--- Update Profile ---');
    console.log('Body:', updateData);
    console.log('File:', file);
    
    const userId = req.user.sub;
    const data = { ...updateData };
    
    if (file) {
      data.profileImage = `/media/profiles/${file.filename}`;
    }

    // Handle nested profile data if present
    const { firstName, lastName, profileImage, ...profileData } = data;
    
    return this.usersService.updateFullProfile(userId, {
      firstName,
      lastName,
      profileImage,
      profile: Object.keys(profileData).length > 0 ? profileData : undefined,
    });
  }
}
