import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: 'Enqueue a background job' })
  @Roles('ADMIN')
  async enqueue(@CurrentUser() user: any, @Body() body: { name: string; data?: any; }){
    const { Queue } = await import('bullmq');
    const Redis = (await import('ioredis')).default;
    const connection = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0', { maxRetriesPerRequest: null });
    const q = new Queue('fx-jobs', { connection });
    await q.add(body.name, { ...(body.data||{}), tenantId: user.tenantId });
    await q.close();
    await connection.quit();
    return { ok: true };
  }
}