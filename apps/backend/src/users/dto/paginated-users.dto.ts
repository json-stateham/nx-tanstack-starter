import { ApiProperty } from '@nestjs/swagger';
import { UserListItemDto } from './user-list-item.dto';

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserListItemDto] })
  data!: UserListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
