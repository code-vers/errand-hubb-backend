import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Request,
  Res,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterErrandDto } from './dto/register-errand.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { TwoFactorVerifyDto } from './dto/two-factor.dto.js';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer-options.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'gallery', maxCount: 5 },
      ],
      multerOptions('profiles'),
    ),
  )
  registerErrand(
    @Body() dto: RegisterErrandDto,
    @UploadedFiles()
    files?: {
      profileImage?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    console.log('--- Register Errand ---');
    const profileImage =
      files?.profileImage && files.profileImage[0]
        ? `/media/profiles/${files.profileImage[0].filename}`
        : undefined;
    const gallery = files?.gallery
      ? files.gallery.map((file) => `/media/profiles/${file.filename}`)
      : [];
    return this.authService.registerErrand(dto, profileImage, gallery);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, req);

    if (result && 'accessToken' in result) {
      // Set cookie
      response.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('verify-2fa-login')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorLogin(
    @Body() dto: TwoFactorVerifyDto & { userId: string },
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyTwoFactorLogin(
      dto.userId,
      dto.code,
      req,
    );

    if (result && 'accessToken' in result) {
      // Set cookie
      response.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('login-activity')
  getLoginActivity(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getLoginActivity(userId, req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('security-logs')
  getSecurityLogs(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getSecurityLogs(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa')
  generateTwoFactor(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.generateTwoFactorSecret(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  enableTwoFactor(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.enableTwoFactor(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  disableTwoFactor(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.disableTwoFactor(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 requests per 15 minutes
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    console.log('HIt korsa');
    return this.authService.forgotPassword(dto.email);
  }

  @UseGuards(ThrottlerGuard)
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
