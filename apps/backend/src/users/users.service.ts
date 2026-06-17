import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { profile: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { profile: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { profile: true, addresses: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    return this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        role: dto.role ?? 'BUYER',
        status: dto.status ?? 'ACTIVE',
        ...(dto.firstName && {
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName ?? '',
            },
          },
        }),
      },
      include: { profile: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        phone: dto.phone,
        role: dto.role,
        status: dto.status,
        ...(dto.firstName && {
          profile: {
            upsert: {
              create: { firstName: dto.firstName, lastName: dto.lastName ?? '' },
              update: { firstName: dto.firstName, lastName: dto.lastName },
            },
          },
        }),
      },
      include: { profile: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
