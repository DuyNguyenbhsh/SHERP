import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAssigneeChangeRequestDto {
  @ApiProperty({ description: 'UUID employee đề xuất tiếp nhận' })
  @IsUUID()
  proposed_assignee_id: string;

  // BR-INC-04: lý do ≥ 10 ký tự
  @ApiProperty({
    description: 'Lý do chuyển giao — tối thiểu 10 ký tự (BR-INC-04)',
  })
  @IsString()
  @MinLength(10, { message: 'BR-INC-04: Lý do phải có ít nhất 10 ký tự' })
  @MaxLength(2000)
  reason: string;
}
