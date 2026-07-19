import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { UsersService } from './users/users.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('errand-profiles')
  async getErrandProfiles() {
    return this.usersService.findAllErrands();
  }

  @Get('debug-sentry')
  debugSentry() {
    throw new Error('My first Sentry error!');
  }
}
