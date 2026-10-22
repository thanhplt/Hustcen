import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, ClockService],
  exports: [UsersService],
})
export class UsersModule {}
