import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReassignWorkItemDto {
  @ApiProperty({ description: 'UUID employee nhận nhiệm vụ' })
  @IsUUID()
  @IsNotEmpty()
  assigneeId: string;

  @ApiProperty({ required: false, description: 'Lý do chuyển giao' })
  @IsOptional()
  @IsString()
  reason?: string;
}
