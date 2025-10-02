import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { KarrioService } from './karrio.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [KarrioService],
  exports: [KarrioService],
})
export class KarrioModule {}
