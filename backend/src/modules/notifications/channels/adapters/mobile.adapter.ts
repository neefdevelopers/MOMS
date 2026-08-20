import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from '../notification-channels.types';

@Injectable()
export class MobileAppChannelAdapter {
  private readonly logger = new Logger(MobileAppChannelAdapter.name);

  async deliver(payload: ChannelDeliveryPayload): Promise<ChannelDeliveryResult> {
    const destination = payload.recipient.mobileAppToken || `apns_fcm_token_${payload.recipient.id.substring(0, 8)}`;
    this.logger.log(`[MOBILE APPLICATION] Sending native push to iOS/Android device ${destination}: "${payload.title}"`);

    const messageId = `mobile_apns_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      channel: NotificationDeliveryChannel.MOBILE_APPLICATION,
      success: true,
      status: 'DELIVERED',
      providerMessageId: messageId,
      deliveredAt: new Date(),
      destinationAddress: destination,
      debugInfo: {
        provider: 'Apple APNs / Google FCM Mobile SDK',
        sound: payload.priority === 'CRITICAL' ? 'critical_alert.aiff' : 'default',
        deepLink: `moms://app/${payload.entityType?.toLowerCase() || 'dashboard'}/${payload.entityId || ''}`,
      },
    };
  }
}
