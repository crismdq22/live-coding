import { Injectable } from '@nestjs/common';
import { planContactSync } from './plan-contact-sync.js';
import type { SyncPlan } from './plan-contact-sync.types.js';
import type { PlanContactSyncRequestDto } from './dto/plan-contact-sync-request.dto.js';

@Injectable()
export class ContactSyncService {
  plan(request: PlanContactSyncRequestDto): SyncPlan {
    return planContactSync(request.incoming, request.existing);
  }
}
