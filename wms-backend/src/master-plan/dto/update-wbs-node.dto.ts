import { PartialType, PickType } from '@nestjs/swagger';
import { CreateWbsNodeDto } from './create-wbs-node.dto';

// Không cho phép đổi wbs_code, level, parent_id, node_type qua PATCH:
// — đổi parent/level đòi flow "move node" riêng (an toàn tree integrity).
// — đổi wbs_code phá vỡ reference và thứ tự.
export class UpdateWbsNodeDto extends PartialType(
  PickType(CreateWbsNodeDto, [
    'name',
    'budget_vnd',
    'start_date',
    'end_date',
    'responsible_employee_id',
  ] as const),
) {}
