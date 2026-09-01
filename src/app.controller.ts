import { Controller, Get, Post, Body, HttpCode, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { UsersService } from './users/users.service.js';
import { MailService } from './mail/mail.service.js';

class ContactFormDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  subject!: string;
  message!: string;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check and greeting message' })
  @ApiResponse({ status: 200, description: 'Service is healthy and reachable' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('errand-profiles')
  @ApiOperation({ summary: 'List and filter public errand provider profiles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for name or skills' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Category name or ID filter' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'City location filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of errand providers' })
  async getErrandProfiles(@Query() query: any) {
    return this.usersService.findAllErrands(query);
  }

  @Post('contact')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit public contact inquiry form' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'subject', 'message'],
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john@example.com' },
        subject: { type: 'string', example: 'Platform Inquiry' },
        message: { type: 'string', example: 'Hello, I have a question about service listings.' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Inquiry email sent successfully' })
  async submitContactForm(
    @Body() body: ContactFormDto,
  ) {
    const { firstName, lastName, email, subject, message } = body;
    await this.mailService.sendContactEmail(firstName, lastName, email, subject, message);
    return { success: true, message: 'Message sent successfully' };
  }

  @Get('debug-sentry')
  @ApiOperation({ summary: 'Trigger test error for Sentry logging verification' })
  @ApiResponse({ status: 500, description: 'Triggers intentional Sentry error' })
  debugSentry() {
    throw new Error('My first Sentry error!');
  }
}
