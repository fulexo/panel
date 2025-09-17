import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PolicyService } from './policy.service';

@ApiTags('policy')
@ApiBearerAuth()
@Controller('policy')
export class PolicyController {
  constructor(private readonly policy: PolicyService) {}

  @Get('visibility')
  @ApiOperation({ summary: 'Get module/action/data scope visibility for tenant' })
  async visibility(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }) {
    return this.policy.getVisibility(user.tenantId);
  }
}

