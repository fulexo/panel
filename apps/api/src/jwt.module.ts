import { Module, Global } from '@nestjs/common';
import { JwtService } from './jwt';

@Global()
@Module({
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
