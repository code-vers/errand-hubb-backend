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
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdsService } from './ads.service.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdStatus } from '@prisma/client';
import { multerOptions } from '../common/utils/multer-options.js';

@ApiTags('Ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @ApiBearerAuth('JWT-auth')
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new user advertisement' })
  @ApiResponse({ status: 201, description: 'Ad submitted for review' })
  create(@Request() req: any, @Body() dto: CreateAdDto) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.create(userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Admin] Create a direct banner ad' })
  @ApiResponse({ status: 201, description: 'Ad created by admin' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  adminCreate(@Request() req: any, @Body() dto: CreateAdDto) {
    const role = req.user.role;
    if (role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const userId = req.user.sub || req.user.id;
    return this.adsService.create(userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions('ads')))
  @ApiOperation({ summary: 'Upload banner image for advertisement' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded: { url: string }' })
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/media/ads/${file.filename}`,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List and filter active public advertisements' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'subcategoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'expired'] })
  @ApiQuery({ name: 'includeAll', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Ads list' })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('status') status?: AdStatus,
    @Query('includeAll') includeAll?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adsService.findAll({
      categoryId,
      subcategoryId,
      search,
      location,
      status,
      includeAll,
      page,
      limit,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Get('my-ads')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get list of ads created by logged-in user' })
  @ApiResponse({ status: 200, description: 'User ads list' })
  findByUser(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.findByUser(userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get ad categories list' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  getCategories() {
    return this.adsService.getCategories();
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Admin] Reorder display positions of advertisements' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orders'],
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'position'],
            properties: {
              id: { type: 'string' },
              position: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Ads reordered' })
  reorder(@Request() req: any, @Body() body: { orders: { id: string; position: number }[] }) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.adsService.reorderAds(body.orders);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single advertisement details' })
  @ApiParam({ name: 'id', description: 'Ad UUID' })
  @ApiResponse({ status: 200, description: 'Ad details' })
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update advertisement' })
  @ApiParam({ name: 'id', description: 'Ad UUID' })
  @ApiResponse({ status: 200, description: 'Updated ad' })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateAdDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.update(id, userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete advertisement' })
  @ApiParam({ name: 'id', description: 'Ad UUID' })
  @ApiResponse({ status: 200, description: 'Ad deleted' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.remove(id, userId);
  }
}
