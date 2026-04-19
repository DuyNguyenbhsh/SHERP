import { PartialType } from '@nestjs/swagger';
import { CreateMasterPlanDto } from './create-master-plan.dto';

export class UpdateMasterPlanDto extends PartialType(CreateMasterPlanDto) {}
