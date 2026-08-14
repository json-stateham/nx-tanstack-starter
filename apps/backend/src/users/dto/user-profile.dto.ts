import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  birthDate!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
