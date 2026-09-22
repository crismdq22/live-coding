import { ApiProperty } from '@nestjs/swagger';
import { IncomingContactDto } from './incoming-contact.dto.js';

export class ContactToWriteDto {
  @ApiProperty({ required: false, example: 'db-1' })
  id?: string;

  @ApiProperty({ example: 'ext-123' })
  externalId!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  updatedAt!: string;
}

export class SkippedContactDto {
  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ example: 'no newer data than existing record' })
  reason!: string;
}

export class RejectedContactDto {
  @ApiProperty({ type: IncomingContactDto })
  input!: IncomingContactDto;

  @ApiProperty({ example: 'invalid or missing email' })
  reason!: string;
}

export class SyncPlanDto {
  @ApiProperty({ type: [ContactToWriteDto] })
  creates!: ContactToWriteDto[];

  @ApiProperty({ type: [ContactToWriteDto] })
  updates!: ContactToWriteDto[];

  @ApiProperty({ type: [SkippedContactDto] })
  skipped!: SkippedContactDto[];

  @ApiProperty({ type: [RejectedContactDto] })
  rejected!: RejectedContactDto[];
}
