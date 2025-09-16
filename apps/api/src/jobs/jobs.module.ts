import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [JobsController],
  providers: [PrismaService],
})
export class JobsModule {}