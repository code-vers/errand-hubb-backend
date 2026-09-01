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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubscriptionGuard } from '../auth/guards/subscription.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Service Requests')
@ApiBearerAuth('JWT-auth')
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  // ─── Client Endpoints ─────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiOperation({ summary: '[Client] Create a new direct service request' })
  @ApiResponse({ status: 201, description: 'Service request created' })
  create(@Request() req: any, @Body() dto: CreateServiceRequestDto) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.create(userId, dto);
  }

  @Get('my-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiOperation({ summary: '[Client] List all requests submitted by the logged-in client' })
  @ApiResponse({ status: 200, description: 'Client service requests list' })
  findMyRequests(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.findMyRequests(userId);
  }

  @Get('my-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiOperation({ summary: '[Client] Get details of a single request owned by logged-in client' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: 'Service request details' })
  findMyRequestById(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.findMyRequestById(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiOperation({ summary: '[Client] Update service request details' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: 'Updated service request' })
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
  @ApiOperation({ summary: '[Client] Delete service request' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: 'Service request removed' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.remove(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiOperation({ summary: '[Client] Change request status (active, completed, cancelled)' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['draft', 'active', 'in_discussion', 'assigned', 'completed', 'cancelled'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
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
  @ApiOperation({ summary: '[Client] Get conversation threads linked to this request' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: 'Linked conversation list' })
  getConversations(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.getConversationsForRequest(id, userId);
  }

  // ─── Errand Provider Endpoints ────────────────────────────────────

  @Get('available')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: '[Errander] Browse available client service requests (Subscription required)' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'minBudget', required: false, type: String })
  @ApiQuery({ name: 'maxBudget', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'urgencyLevel', required: false, enum: ['low', 'normal', 'urgent', 'emergency'] })
  @ApiResponse({ status: 200, description: 'Available service requests list' })
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
  @ApiOperation({ summary: '[Errander] View details of an available request (Subscription required)' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: 'Available service request details' })
  findAvailableById(@Param('id') id: string) {
    return this.serviceRequestsService.findAvailableById(id);
  }

  @Post(':id/contact')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
  @Roles('errand')
  @ApiOperation({ summary: '[Errander] Initiate contact conversation with client for a service request' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 201, description: 'Conversation started or existing conversation returned' })
  contactClient(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.contactClient(id, userId);
  }

  @Get(':id/check-contact')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
  @Roles('errand')
  @ApiOperation({ summary: '[Errander] Check if logged-in errander has already contacted client for this request' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: '{ hasContacted: boolean, conversationId?: string }' })
  checkContact(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.serviceRequestsService.checkContact(id, userId);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get all service requests with filters' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiResponse({ status: 200, description: 'All service requests list' })
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
  @ApiOperation({ summary: '[Admin] Update status of any service request' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['draft', 'active', 'in_discussion', 'assigned', 'completed', 'cancelled', 'expired'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated service request' })
  adminChangeStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.serviceRequestsService.adminChangeStatus(id, status);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Delete any service request' })
  @ApiParam({ name: 'id', description: 'Service Request UUID' })
  @ApiResponse({ status: 200, description: 'Service request removed' })
  adminRemove(@Param('id') id: string) {
    return this.serviceRequestsService.adminRemove(id);
  }
}
