import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ContactSyncModule } from './contact-sync/contact-sync.module.js';

@Module({
  imports: [ContactSyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
