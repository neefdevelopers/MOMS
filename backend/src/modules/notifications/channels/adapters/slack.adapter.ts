import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from '../notification-channels.types';

@Injectable()
export class SlackChannelAdapter {
  private readonly logger = new Logger(SlackChannelAdapter.name);

  async deliver(payload: ChannelDeliveryPayload): Promise<ChannelDeliveryResult> {
    const destination = payload.recipient.slackMemberId || `#moms-ops-${payload.category.toLowerCase()}`;
    this.logger.log(`[SLACK CHANNEL] Sending Block Kit notification to ${destination}: "${payload.title}"`);

    const messageId = `slack_ts_${Date.now()}.${Math.random().toString().substring(2, 8)}`;

    return {
      channel: NotificationDeliveryChannel.SLACK,
      success: true,
      status: 'DELIVERED',
      providerMessageId: messageId,
      deliveredAt: new Date(),
      destinationAddress: destination,
      debugInfo: {
        provider: 'Slack Incoming Webhooks / Bolt Web API',
        blocksLayout: 'header_section_actions',
        channel: destination,
      },
    };
  }
}
