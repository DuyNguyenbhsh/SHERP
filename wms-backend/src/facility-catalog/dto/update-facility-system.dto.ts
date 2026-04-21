import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFacilitySystemDto } from './create-facility-system.dto';

// Cấm đổi mã sau khi đã tạo (tránh đứt link với task_templates cũ)
export class UpdateFacilitySystemDto extends PartialType(
  OmitType(CreateFacilitySystemDto, ['code'] as const),
) {}
