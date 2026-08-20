import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from '../notification-channels.types';

@Injectable()
export class EmailChannelAdapter {
  private readonly logger = new Logger(EmailChannelAdapter.name);

  async deliver(payload: ChannelDeliveryPayload): Promise<ChannelDeliveryResult> {
    const destination = payload.recipient.email || `${payload.recipient.name.toLowerCase().replace(/\s+/g, '.')}@moms.internal`;
    this.logger.log(`[EMAIL CHANNEL] Dispatching notification to ${destination}: "${payload.title}" [Priority: ${payload.priority}]`);

    // Provider Integration Simulation / SMTP / SendGrid / Amazon SES
    const messageId = `email_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      channel: NotificationDeliveryChannel.EMAIL,
      success: true,
      status: 'DELIVERED',
      providerMessageId: messageId,
      deliveredAt: new Date(),
      destinationAddress: destination,
      debugInfo: {
        provider: 'SMTP / SendGrid Gateway',
        subject: `[${payload.priority}] ${payload.title}`,
        hasDirectLink: !!payload.linkUrl,
      },
    };
  }
}
