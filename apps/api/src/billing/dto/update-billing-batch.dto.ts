import { PartialType } from '@nestjs/mapped-types';
import { CreateBillingBatchDto } from './create-billing-batch.dto';

export class UpdateBillingBatchDto extends PartialType(CreateBillingBatchDto) {}