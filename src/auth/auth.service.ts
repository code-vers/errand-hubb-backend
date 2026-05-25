import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterErrandDto } from './dto/register-errand.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '../generated/prisma/enums.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async registerClient(dto: RegisterClientDto) {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.client,
      profile: {
        create: {
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
        },
      },
    });
  }

  async registerErrand(dto: RegisterErrandDto) {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.errand,
      profile: {
        create: {
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
          bio: dto.bio,
          services: dto.services,
          ratePerHour: dto.rate ? parseFloat(dto.rate) : undefined,
        },
      },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    // Remove password from user object
    const { password, ...result } = user;
    return {
      user: result,
      accessToken,
    };
  }
}
