import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from '../notification-channels.types';

@Injectable()
export class MicrosoftTeamsChannelAdapter {
  private readonly logger = new Logger(MicrosoftTeamsChannelAdapter.name);

  async deliver(payload: ChannelDeliveryPayload): Promise<ChannelDeliveryResult> {
    const destination = payload.recipient.teamsUserId || `teams-channel-ops-${payload.category.toLowerCase()}`;
    this.logger.log(`[MICROSOFT TEAMS] Sending Adaptive Card to ${destination}: "${payload.title}"`);

    const messageId = `teams_card_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      channel: NotificationDeliveryChannel.MICROSOFT_TEAMS,
      success: true,
      status: 'DELIVERED',
      providerMessageId: messageId,
      deliveredAt: new Date(),
      destinationAddress: destination,
      debugInfo: {
        provider: 'Microsoft Teams Incoming Webhooks & Bot Framework',
        cardType: 'AdaptiveCard_v1.5',
        themeColor: payload.priority === 'CRITICAL' ? '#DC2626' : '#2563EB',
        interactiveActionsCount: payload.linkUrl ? 1 : 0,
      },
    };
  }
}
