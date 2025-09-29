import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsString()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  assignedTo?: string;
}
