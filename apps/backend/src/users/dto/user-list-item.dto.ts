import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { UserProfileDto } from './user-profile.dto';

export class UserListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  deletedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  emailVerifiedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  phoneVerifiedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: UserProfileDto })
  profile!: UserProfileDto | null;
}
