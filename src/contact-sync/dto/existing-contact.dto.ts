import { ApiProperty } from '@nestjs/swagger';

export class ExistingContactDto {
  @ApiProperty({ example: 'db-1' })
  id!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  sourceUpdatedAt!: string;
}
