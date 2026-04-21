import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFacilityEquipmentItemDto } from './create-facility-equipment-item.dto';

// Cấm đổi mã + system_id sau khi tạo
export class UpdateFacilityEquipmentItemDto extends PartialType(
  OmitType(CreateFacilityEquipmentItemDto, ['code', 'system_id'] as const),
) {}
