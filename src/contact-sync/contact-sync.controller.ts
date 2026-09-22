import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactSyncService } from './contact-sync.service.js';
import { PlanContactSyncRequestDto } from './dto/plan-contact-sync-request.dto.js';
import { SyncPlanDto } from './dto/sync-plan.dto.js';

// Planning-only: returns what would be written. A separate endpoint/job
// applies the plan (writes creates/updates) against the database.
@ApiTags('contact-sync')
@Controller('contact-sync')
export class ContactSyncController {
  constructor(private readonly contactSyncService: ContactSyncService) {}

  @Post('plan')
  @ApiOperation({ summary: 'Plan a contact sync (create/update/skip/reject) without writing' })
  @ApiResponse({ status: 201, type: SyncPlanDto })
  plan(@Body() body: PlanContactSyncRequestDto): SyncPlanDto {
    return this.contactSyncService.plan(body);
  }
}
