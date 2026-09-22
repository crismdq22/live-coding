import { ApiProperty } from '@nestjs/swagger';

export class IncomingContactDto {
  @ApiProperty({ example: 'ext-123' })
  externalId!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  updatedAt!: string;
}
