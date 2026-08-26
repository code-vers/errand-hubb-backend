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
import { FileInterceptor } from '@nestjs/platform-express';
import { AdsService } from './ads.service.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdStatus } from '@prisma/client';
import { multerOptions } from '../common/utils/multer-options.js';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: any, @Body() dto: CreateAdDto) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.create(userId, dto);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  adminCreate(@Request() req: any, @Body() dto: CreateAdDto) {
    const role = req.user.role;
    if (role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const userId = req.user.sub || req.user.id;
    return this.adsService.create(userId, dto);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions('ads')))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/media/ads/${file.filename}`,
    };
  }

  @Get()
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

  @Get('my-ads')
  @UseGuards(JwtAuthGuard)
  findByUser(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.findByUser(userId);
  }

  @Get('categories')
  getCategories() {
    return this.adsService.getCategories();
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  reorder(@Request() req: any, @Body() body: { orders: { id: string; position: number }[] }) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.adsService.reorderAds(body.orders);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateAdDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.adsService.remove(id, userId);
  }
}
