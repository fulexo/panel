import { Module, Global } from '@nestjs/common';
import { JwtService } from './jwt';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [JwtService, PrismaService],
  exports: [JwtService],
})
export class JwtModule {}
