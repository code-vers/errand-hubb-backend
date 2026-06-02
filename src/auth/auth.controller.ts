import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterErrandDto } from './dto/register-errand.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/client')
  @UseInterceptors(FileInterceptor('profileImage', multerOptions('profiles')))
  registerClient(
    @Body() dto: RegisterClientDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('--- Register Client ---');
    console.log('Body:', dto);
    console.log('File:', file);
    const profileImage = file ? `/media/profiles/${file.filename}` : undefined;
    return this.authService.registerClient(dto, profileImage);
  }

  @Post('register/errand')
  @UseInterceptors(FileInterceptor('profileImage', multerOptions('profiles')))
  registerErrand(
    @Body() dto: RegisterErrandDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('--- Register Errand ---');
    console.log('Body:', dto);
    console.log('File:', file);
    const profileImage = file ? `/media/profiles/${file.filename}` : undefined;
    return this.authService.registerErrand(dto, profileImage);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
