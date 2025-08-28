import { Module } from '@nestjs/common';
import { BaseLinkerService } from './baselinker.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [BaseLinkerService],
  exports: [BaseLinkerService],
})
export class BaseLinkerModule {}