import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationChannelManagerService } from './channels/notification-channel-manager.service';
import { EmailChannelAdapter } from './channels/adapters/email.adapter';
import { PushNotificationChannelAdapter } from './channels/adapters/push.adapter';
import { MobileAppChannelAdapter } from './channels/adapters/mobile.adapter';
import { WhatsAppChannelAdapter } from './channels/adapters/whatsapp.adapter';
import { MicrosoftTeamsChannelAdapter } from './channels/adapters/teams.adapter';
import { SlackChannelAdapter } from './channels/adapters/slack.adapter';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationChannelManagerService,
    EmailChannelAdapter,
    PushNotificationChannelAdapter,
    MobileAppChannelAdapter,
    WhatsAppChannelAdapter,
    MicrosoftTeamsChannelAdapter,
    SlackChannelAdapter,
  ],
  exports: [NotificationsService, NotificationChannelManagerService],
})
export class NotificationsModule {}
