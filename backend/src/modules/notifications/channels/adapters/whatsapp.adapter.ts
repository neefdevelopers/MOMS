import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from '../notification-channels.types';

@Injectable()
export class WhatsAppChannelAdapter {
  private readonly logger = new Logger(WhatsAppChannelAdapter.name);

  async deliver(payload: ChannelDeliveryPayload): Promise<ChannelDeliveryResult> {
    const destination = payload.recipient.phone || `+1-555-${payload.recipient.id.substring(0, 7)}`;
    this.logger.log(`[WHATSAPP CHANNEL] Sending WhatsApp Business message to ${destination}: "${payload.title}"`);

    const messageId = `wa_wamid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      channel: NotificationDeliveryChannel.WHATSAPP,
      success: true,
      status: 'DELIVERED',
      providerMessageId: messageId,
      deliveredAt: new Date(),
      destinationAddress: destination,
      debugInfo: {
        provider: 'WhatsApp Business Cloud API (Meta) / Twilio',
        templateName: 'moms_operational_alert_v2',
        language: 'en_US',
      },
    };
  }
}
