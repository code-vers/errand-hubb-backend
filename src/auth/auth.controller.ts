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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/client')
  @ApiOperation({ summary: 'Register a new Client user with optional avatar image' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201, description: 'Client account registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
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
  @ApiOperation({ summary: 'Register a new Errand Provider with avatar & gallery files' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201, description: 'Errand provider account registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'gallery', maxCount: 1000 },
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
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns accessToken and sets auth cookie' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email' })
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
  @ApiOperation({ summary: 'Complete login with 2FA TOTP code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'code'],
      properties: {
        userId: { type: 'string', example: 'uuid-123' },
        code: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '2FA verified, returns accessToken and sets auth cookie' })
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

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('login-activity')
  @ApiOperation({ summary: 'Get current user login sessions and device activities' })
  @ApiResponse({ status: 200, description: 'List of login activities' })
  getLoginActivity(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getLoginActivity(userId, req);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('security-logs')
  @ApiOperation({ summary: 'Get security audit logs for current user' })
  @ApiResponse({ status: 200, description: 'List of security logs' })
  getSecurityLogs(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getSecurityLogs(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa')
  @ApiOperation({ summary: 'Generate a new 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: 'Secret and QR code data URL' })
  generateTwoFactor(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.generateTwoFactorSecret(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  @ApiOperation({ summary: 'Enable two-factor authentication with TOTP code' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  enableTwoFactor(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.enableTwoFactor(userId, dto.code);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  @ApiOperation({ summary: 'Disable two-factor authentication for current user' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  disableTwoFactor(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.disableTwoFactor(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current user and clear session cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email address using token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: 'verification-token-string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'alice@example.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 requests per 15 minutes
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent if account exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    console.log('HIt korsa');
    return this.authService.forgotPassword(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for logged-in user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect or new password invalid' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    console.log(
      'DEBUG: change-password controller called. User Payload:',
      req.user,
    );
    const userId = req.user?.sub || req.user?.id;
    return this.authService.changePassword(userId, dto);
  }
}
