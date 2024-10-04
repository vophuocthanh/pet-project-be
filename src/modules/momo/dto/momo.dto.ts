import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class MomoDto {
  @ApiProperty()
  @IsNotEmpty()
  bookingId: string;

  @IsOptional()
  userId?: string;
}
