import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CurrentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}
