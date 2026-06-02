import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterErrandDto } from './dto/register-errand.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { Response } from 'express';

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
    const profileImage = file ? `/media/profiles/${file.filename}` : undefined;
    return this.authService.registerErrand(dto, profileImage);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set cookie
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    console.log('HIt korsa');
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    console.log(
      'DEBUG: change-password controller called. User Payload:',
      req.user,
    );
    const userId = req.user?.sub || req.user?.id;
    return this.authService.changePassword(userId, dto);
  }
}
