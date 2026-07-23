import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { AppService } from './app.service.js';
import { UsersService } from './users/users.service.js';
import { MailService } from './mail/mail.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('errand-profiles')
  async getErrandProfiles() {
    return this.usersService.findAllErrands();
  }

  @Post('contact')
  @HttpCode(200)
  async submitContactForm(
    @Body() body: { firstName: string; lastName: string; email: string; subject: string; message: string }
  ) {
    const { firstName, lastName, email, subject, message } = body;
    await this.mailService.sendContactEmail(firstName, lastName, email, subject, message);
    return { success: true, message: 'Message sent successfully' };
  }

  @Get('debug-sentry')
  debugSentry() {
    throw new Error('My first Sentry error!');
  }
}
