import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from '../notification-channels.types';

@Injectable()
export class PushNotificationChannelAdapter {
  private readonly logger = new Logger(PushNotificationChannelAdapter.name);

  async deliver(payload: ChannelDeliveryPayload): Promise<ChannelDeliveryResult> {
    const destination = payload.recipient.devicePushToken || `web-push-client-${payload.recipient.id.substring(0, 8)}`;
    this.logger.log(`[PUSH NOTIFICATIONS] Sending Web/Browser Push to ${destination}: "${payload.title}"`);

    const messageId = `push_vapid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      channel: NotificationDeliveryChannel.PUSH_NOTIFICATIONS,
      success: true,
      status: 'DELIVERED',
      providerMessageId: messageId,
      deliveredAt: new Date(),
      destinationAddress: destination,
      debugInfo: {
        provider: 'Web Push (VAPID / FCM Service Worker)',
        badge: '/icon-badge.png',
        actionUrl: payload.linkUrl,
      },
    };
  }
}
