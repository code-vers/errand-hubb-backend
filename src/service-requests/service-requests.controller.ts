import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubscriptionGuard } from '../auth/guards/subscription.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  // ─── Client Endpoints ─────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  create(@Request() req: any, @Body() dto: CreateServiceRequestDto) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.create(userId, dto);
  }

  @Get('my-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  findMyRequests(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.findMyRequests(userId);
  }

  @Get('my-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  findMyRequestById(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.findMyRequestById(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.remove(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  changeStatus(
    @Param('id') id: string,
    @Request() req: any,
    @Body('status') status: string,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.changeStatus(id, userId, status);
  }

  @Get(':id/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  getConversations(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.getConversationsForRequest(id, userId);
  }

  // ─── Errand Provider Endpoints ────────────────────────────────────

  @Get('available')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  findAvailable(
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('urgencyLevel') urgencyLevel?: string,
  ) {
    return this.serviceRequestsService.findAvailable({
      categoryId,
      city,
      search,
      minBudget,
      maxBudget,
      page,
      limit,
      urgencyLevel,
    });
  }

  @Get('available/:id')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  findAvailableById(@Param('id') id: string) {
    return this.serviceRequestsService.findAvailableById(id);
  }

  @Post(':id/contact')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
  @Roles('errand')
  contactClient(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.contactClient(id, userId);
  }

  @Get(':id/check-contact')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
  @Roles('errand')
  checkContact(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.checkContact(id, userId);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllAdmin(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.serviceRequestsService.findAllAdmin({
      search,
      status,
      categoryId,
      page,
      limit,
    });
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminChangeStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.serviceRequestsService.adminChangeStatus(id, status);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminRemove(@Param('id') id: string) {
    return this.serviceRequestsService.adminRemove(id);
  }
}
