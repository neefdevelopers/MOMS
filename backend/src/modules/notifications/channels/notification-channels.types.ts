export enum NotificationDeliveryChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH_NOTIFICATIONS = 'PUSH_NOTIFICATIONS',
  MOBILE_APPLICATION = 'MOBILE_APPLICATION',
  WHATSAPP = 'WHATSAPP',
  MICROSOFT_TEAMS = 'MICROSOFT_TEAMS',
  SLACK = 'SLACK',
}

export type DeliveryChannelStatus = 'ACTIVE' | 'CONFIGURED' | 'READY' | 'DISABLED' | 'MAINTENANCE';

export interface ChannelDeliveryPayload {
  notificationId?: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  linkUrl?: string;
  entityType?: string;
  entityId?: string;
  entityCode?: string;
  recipient: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    slackMemberId?: string | null;
    teamsUserId?: string | null;
    devicePushToken?: string | null;
    mobileAppToken?: string | null;
  };
  metadata?: Record<string, any>;
}

export interface ChannelDeliveryResult {
  channel: NotificationDeliveryChannel;
  success: boolean;
  status: 'DELIVERED' | 'QUEUED' | 'FAILED' | 'SKIPPED_DISABLED';
  providerMessageId?: string;
  deliveredAt: Date;
  destinationAddress?: string;
  error?: string;
  debugInfo?: Record<string, any>;
}

export interface ChannelConfigurationMeta {
  channel: NotificationDeliveryChannel;
  name: string;
  description: string;
  status: DeliveryChannelStatus;
  enabled: boolean;
  provider: string;
  icon: string;
  targetAudiences: string[];
  configurationFields: {
    key: string;
    label: string;
    type: 'string' | 'secret' | 'url' | 'boolean' | 'number';
    configured: boolean;
    description: string;
  }[];
}
