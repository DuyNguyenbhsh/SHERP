import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { AssignmentRole } from '../enums/assignment-role.enum';

export class CreateAssignmentDto {
  @ApiProperty({
    description: 'UUID nhân viên',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'employee_id phải là UUID hợp lệ' })
  employee_id: string;

  @ApiPropertyOptional({
    description: 'Vai trò trong dự án',
    enum: AssignmentRole,
    example: AssignmentRole.MEMBER,
  })
  @IsEnum(AssignmentRole, {
    message: 'Vai trò không hợp lệ (PROJECT_MANAGER | MEMBER)',
  })
  @IsOptional()
  role?: AssignmentRole;
}
