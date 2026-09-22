import { Module } from '@nestjs/common';
import { ContactSyncController } from './contact-sync.controller.js';
import { ContactSyncService } from './contact-sync.service.js';

@Module({
  controllers: [ContactSyncController],
  providers: [ContactSyncService],
})
export class ContactSyncModule {}
