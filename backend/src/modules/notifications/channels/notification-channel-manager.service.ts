import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ChannelConfigurationMeta,
  ChannelDeliveryPayload,
  ChannelDeliveryResult,
  NotificationDeliveryChannel,
} from './notification-channels.types';
import { EmailChannelAdapter } from './adapters/email.adapter';
import { PushNotificationChannelAdapter } from './adapters/push.adapter';
import { MobileAppChannelAdapter } from './adapters/mobile.adapter';
import { WhatsAppChannelAdapter } from './adapters/whatsapp.adapter';
import { MicrosoftTeamsChannelAdapter } from './adapters/teams.adapter';
import { SlackChannelAdapter } from './adapters/slack.adapter';

@Injectable()
export class NotificationChannelManagerService {
  private readonly logger = new Logger(NotificationChannelManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailAdapter: EmailChannelAdapter,
    private readonly pushAdapter: PushNotificationChannelAdapter,
    private readonly mobileAdapter: MobileAppChannelAdapter,
    private readonly whatsappAdapter: WhatsAppChannelAdapter,
    private readonly teamsAdapter: MicrosoftTeamsChannelAdapter,
    private readonly slackAdapter: SlackChannelAdapter,
  ) {}

  /**
   * Channel Metadata & Capabilities Registry
   */
  async getChannelStatusOverview(): Promise<{
    activeChannelsCount: number;
    supportedChannelsCount: number;
    channels: ChannelConfigurationMeta[];
  }> {
    const channels: ChannelConfigurationMeta[] = [
      {
        channel: NotificationDeliveryChannel.IN_APP,
        name: 'In-App Operational Hub',
        description: 'Native web application notification drawer, dashboard badges, and real-time popovers',
        status: 'ACTIVE',
        enabled: true,
        provider: 'MOMS WebSocket & SSE Core Gateway',
        icon: 'Bell',
        targetAudiences: ['All Staff', 'Technical Managers', 'Media Managers'],
        configurationFields: [
          { key: 'SOUND_ENABLED', label: 'Audio Alert Chimes', type: 'boolean', configured: true, description: 'Play audio cues on critical notices' },
          { key: 'POLL_INTERVAL_SEC', label: 'Live Poll Interval', type: 'number', configured: true, description: 'Seconds between background updates' },
        ],
      },
      {
        channel: NotificationDeliveryChannel.EMAIL,
        name: 'Email Delivery (SMTP / SES / SendGrid)',
        description: 'Transactional HTML email alerts, weekly summaries, and executive escalations',
        status: 'ACTIVE',
        enabled: true,
        provider: 'Amazon SES / SendGrid Transactional Gateway',
        icon: 'Mail',
        targetAudiences: ['All Staff', 'External Clients', 'Media Managers'],
        configurationFields: [
          { key: 'SMTP_HOST', label: 'SMTP Host Server', type: 'string', configured: true, description: 'e.g. email-smtp.us-east-1.amazonaws.com' },
          { key: 'SMTP_PORT', label: 'SMTP Port', type: 'number', configured: true, description: '587 / 465 SSL' },
          { key: 'FROM_ADDRESS', label: 'Sender Address', type: 'string', configured: true, description: 'notifications@moms-media.com' },
        ],
      },
      {
        channel: NotificationDeliveryChannel.PUSH_NOTIFICATIONS,
        name: 'Web Browser Push (VAPID / WebPush)',
        description: 'Real-time browser notifications even when the application tab is closed or in background',
        status: 'READY',
        enabled: true,
        provider: 'Standard Web Push Protocol (VAPID / FCM)',
        icon: 'Radio',
        targetAudiences: ['Active Editors', 'Graphic Designers', 'Operations Crew'],
        configurationFields: [
          { key: 'VAPID_PUBLIC_KEY', label: 'VAPID Public Key', type: 'string', configured: true, description: 'ECDSA P-256 public encryption key' },
          { key: 'VAPID_SUBJECT', label: 'VAPID Subject Claim', type: 'string', configured: true, description: 'mailto:ops@moms-media.com' },
        ],
      },
      {
        channel: NotificationDeliveryChannel.MOBILE_APPLICATION,
        name: 'Mobile App Push (iOS APNs / Android FCM)',
        description: 'Native hardware push alerts with sound priority, badge counters, and deep-link routing',
        status: 'READY',
        enabled: true,
        provider: 'Apple Push Notification service (APNs) & Google Firebase Cloud Messaging',
        icon: 'Smartphone',
        targetAudiences: ['Field Production Crew', 'Camera Operators', 'Directors'],
        configurationFields: [
          { key: 'APNS_BUNDLE_ID', label: 'iOS App Bundle ID', type: 'string', configured: true, description: 'com.moms.mediaoperations' },
          { key: 'FCM_PROJECT_ID', label: 'Firebase Project ID', type: 'string', configured: true, description: 'moms-mobile-fcm' },
        ],
      },
      {
        channel: NotificationDeliveryChannel.WHATSAPP,
        name: 'WhatsApp Business Cloud API',
        description: 'High-urgency mobile alerts, shoot crew dispatches, and emergency equipment alerts',
        status: 'ACTIVE',
        enabled: true,
        provider: 'Meta WhatsApp Cloud API / Twilio Messaging',
        icon: 'MessageSquare',
        targetAudiences: ['Field Shoot Crew', 'On-Location Photographers', 'Media Managers'],
        configurationFields: [
          { key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Meta Phone Number ID', type: 'string', configured: true, description: 'Meta Business Cloud Phone ID' },
          { key: 'WHATSAPP_TEMPLATE_NAMESPACE', label: 'Template Namespace', type: 'string', configured: true, description: 'moms_operations_prod' },
        ],
      },
      {
        channel: NotificationDeliveryChannel.MICROSOFT_TEAMS,
        name: 'Microsoft Teams (Adaptive Cards & Bot)',
        description: 'Interactive corporate channel alerts, approval cards with 1-click action buttons, and review requests',
        status: 'ACTIVE',
        enabled: true,
        provider: 'Microsoft Bot Framework & Teams Webhooks',
        icon: 'Share2',
        targetAudiences: ['Technical Review Teams', 'Project Managers', 'Department Leads'],
        configurationFields: [
          { key: 'TEAMS_INCOMING_WEBHOOK_URL', label: 'Production Channel Webhook', type: 'url', configured: true, description: 'https://moms.webhook.office.com/...' },
          { key: 'TEAMS_APP_ID', label: 'Bot Framework App ID', type: 'string', configured: true, description: 'MS Graph Bot Application ID' },
        ],
      },
      {
        channel: NotificationDeliveryChannel.SLACK,
        name: 'Slack (Block Kit & Incoming Webhooks)',
        description: 'Real-time studio channel feeds, blocker alerts, build logs, and equipment checkout tracking',
        status: 'ACTIVE',
        enabled: true,
        provider: 'Slack Bolt API & Webhook Dispatcher',
        icon: 'Hash',
        targetAudiences: ['Post-Production Staff', 'Animators', 'DevOps & Tech Leads'],
        configurationFields: [
          { key: 'SLACK_WEBHOOK_URL', label: 'Default Channel Webhook', type: 'url', configured: true, description: 'https://hooks.slack.com/services/...' },
          { key: 'SLACK_BOT_TOKEN', label: 'Bot OAuth Token', type: 'secret', configured: true, description: 'xoxb-...' },
        ],
      },
    ];

    return {
      activeChannelsCount: channels.filter((c) => c.status === 'ACTIVE' && c.enabled).length,
      supportedChannelsCount: channels.length,
      channels,
    };
  }

  /**
   * Multi-Channel Parallel Dispatcher
   * Routes a notification across requested or automatically resolved channels based on priority
   */
  async dispatchMultiChannel(
    payload: ChannelDeliveryPayload,
    targetChannels?: NotificationDeliveryChannel[],
  ): Promise<ChannelDeliveryResult[]> {
    const channelsToDeliver = targetChannels && targetChannels.length > 0
      ? targetChannels
      : this.resolveDefaultChannelsForPriority(payload.priority);

    const deliveryPromises = channelsToDeliver.map(async (channel) => {
      try {
        switch (channel) {
          case NotificationDeliveryChannel.EMAIL:
            return await this.emailAdapter.deliver(payload);
          case NotificationDeliveryChannel.PUSH_NOTIFICATIONS:
            return await this.pushAdapter.deliver(payload);
          case NotificationDeliveryChannel.MOBILE_APPLICATION:
            return await this.mobileAdapter.deliver(payload);
          case NotificationDeliveryChannel.WHATSAPP:
            return await this.whatsappAdapter.deliver(payload);
          case NotificationDeliveryChannel.MICROSOFT_TEAMS:
            return await this.teamsAdapter.deliver(payload);
          case NotificationDeliveryChannel.SLACK:
            return await this.slackAdapter.deliver(payload);
          case NotificationDeliveryChannel.IN_APP:
          default:
            return {
              channel: NotificationDeliveryChannel.IN_APP,
              success: true,
              status: 'DELIVERED',
              providerMessageId: `inapp_${Date.now()}`,
              deliveredAt: new Date(),
              destinationAddress: payload.recipient.id,
            } as ChannelDeliveryResult;
        }
      } catch (err: any) {
        this.logger.error(`Channel ${channel} delivery error for ${payload.title}: ${err.message}`);
        return {
          channel,
          success: false,
          status: 'FAILED',
          deliveredAt: new Date(),
          error: err.message || 'Channel delivery adapter failed',
        } as ChannelDeliveryResult;
      }
    });

    return Promise.all(deliveryPromises);
  }

  /**
   * Test Channel Delivery Simulation
   */
  async testChannelDelivery(
    channel: NotificationDeliveryChannel,
    testRecipient?: { name?: string; email?: string; phone?: string },
  ): Promise<ChannelDeliveryResult> {
    const testPayload: ChannelDeliveryPayload = {
      title: `[TEST SIMULATION] Multi-Channel Framework Test (${channel})`,
      message: `This is a verification test dispatch from the Media Operations Management System (MOMS) for channel: ${channel}.`,
      priority: 'HIGH',
      category: 'SYSTEM_NOTIFICATION',
      linkUrl: '/activity',
      recipient: {
        id: 'usr_test_verification',
        name: testRecipient?.name || 'Technical Administrator',
        email: testRecipient?.email || 'admin@moms-media.com',
        phone: testRecipient?.phone || '+15551234567',
      },
      metadata: {
        testMode: true,
        dispatchedAt: new Date().toISOString(),
      },
    };

    const results = await this.dispatchMultiChannel(testPayload, [channel]);
    return results[0];
  }

  /**
   * Priority-based Automatic Channel Resolution
   */
  private resolveDefaultChannelsForPriority(priority: string): NotificationDeliveryChannel[] {
    switch (priority) {
      case 'CRITICAL':
        return [
          NotificationDeliveryChannel.IN_APP,
          NotificationDeliveryChannel.EMAIL,
          NotificationDeliveryChannel.WHATSAPP,
          NotificationDeliveryChannel.MICROSOFT_TEAMS,
          NotificationDeliveryChannel.SLACK,
          NotificationDeliveryChannel.MOBILE_APPLICATION,
        ];
      case 'HIGH':
        return [
          NotificationDeliveryChannel.IN_APP,
          NotificationDeliveryChannel.EMAIL,
          NotificationDeliveryChannel.MICROSOFT_TEAMS,
          NotificationDeliveryChannel.SLACK,
        ];
      case 'MEDIUM':
      case 'LOW':
      default:
        return [
          NotificationDeliveryChannel.IN_APP,
          NotificationDeliveryChannel.EMAIL,
        ];
    }
  }
}
