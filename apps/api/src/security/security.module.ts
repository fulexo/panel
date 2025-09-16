import { Module } from '@nestjs/common';
import { CsrfService } from './csrf.service';
import { CsrfGuard } from './csrf.guard';
import { SanitizationPipe } from './sanitization.pipe';

@Module({
  providers: [CsrfService, CsrfGuard, SanitizationPipe],
  exports: [CsrfService, CsrfGuard, SanitizationPipe],
})
export class SecurityModule {}