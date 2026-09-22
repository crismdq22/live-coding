import { ApiProperty } from '@nestjs/swagger';
import { IncomingContactDto } from './incoming-contact.dto.js';
import { ExistingContactDto } from './existing-contact.dto.js';

export class PlanContactSyncRequestDto {
  @ApiProperty({ type: [IncomingContactDto] })
  incoming!: IncomingContactDto[];

  @ApiProperty({ type: [ExistingContactDto] })
  existing!: ExistingContactDto[];
}
