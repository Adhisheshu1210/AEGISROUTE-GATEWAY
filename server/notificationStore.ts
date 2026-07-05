import crypto from 'crypto';

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'slack' | 'teams' | 'firebase';
  enabled: boolean;
  config: {
    apiKey?: string;
    senderAddress?: string;
    webhookUrl?: string;
    phoneNumber?: string;
    projectId?: string;
    secretToken?: string;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channels: string[]; // channels it's suitable for
}

export interface PriorityRule {
  id: string;
  minPriority: 'low' | 'medium' | 'high';
  channels: string[];
  autoEscalate: boolean;
}

export interface ScheduledNotification {
  id: string;
  name: string;
  time: string; // "HH:MM"
  frequency: 'hourly' | 'daily' | 'weekly';
  templateId: string;
  recipient: string;
  lastRun?: string;
}

export interface EscalationStep {
  stepNumber: number;
  delayMinutes: number;
  recipientRole: 'Driver' | 'Manager' | 'Admin';
  channels: string[];
}

export interface EscalationPolicy {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium';
  steps: EscalationStep[];
  enabled: boolean;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  recipient: string;
  recipientRole: string;
  channel: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'Pending' | 'Sent' | 'Delivered' | 'Failed' | 'Escalated';
  isSimulated: boolean;
  escalationStep?: number;
}

class NotificationStore {
  channels: Map<string, NotificationChannel> = new Map();
  templates: Map<string, NotificationTemplate> = new Map();
  priorityRules: PriorityRule[] = [];
  scheduledNotifications: ScheduledNotification[] = [];
  escalationPolicies: EscalationPolicy[] = [];
  logs: NotificationLog[] = [];

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // 1. Default Channels
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'email',
        name: 'Command SMTP Email',
        type: 'email',
        enabled: true,
        config: {
          apiKey: 'sg_live_72891f9h2u139048fjsdlf_aegis',
          senderAddress: 'alerts@aegisroute-command.com'
        }
      },
      {
        id: 'sms_twilio',
        name: 'Twilio SMS Core Gateway',
        type: 'sms',
        enabled: true,
        config: {
          apiKey: 'AC_twilio_sid_9234823948230498239',
          secretToken: 'auth_token_712839182390823098fjh32',
          phoneNumber: '+18559021234'
        }
      },
      {
        id: 'whatsapp_twilio',
        name: 'Twilio WhatsApp API',
        type: 'whatsapp',
        enabled: false,
        config: {
          apiKey: 'AC_twilio_sid_9234823948230498239',
          phoneNumber: 'whatsapp:+14155238886'
        }
      },
      {
        id: 'slack_webhook',
        name: 'Slack Operator Channel Webhook',
        type: 'slack',
        enabled: true,
        config: {
          webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
        }
      },
      {
        id: 'teams_webhook',
        name: 'Microsoft Teams Operations Hub',
        type: 'teams',
        enabled: false,
        config: {
          webhookUrl: 'https://aegisroute.webhook.office.com/webhookb2/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'
        }
      },
      {
        id: 'firebase_push',
        name: 'Firebase Push & Cloud Messaging',
        type: 'firebase',
        enabled: true,
        config: {
          projectId: 'aegisroute-telemetry-fcm',
          apiKey: 'AIzaSyAegisPush_398124jklshdf'
        }
      }
    ];
    defaultChannels.forEach(c => this.channels.set(c.id, c));

    // 2. Default Templates
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'disruption_alert',
        name: '🚨 Disruption Anomaly Ingestion Alert',
        subject: '⚠️ CRITICAL TELEMETRY: Disruption Alert for {{shipment_code}}',
        body: 'ALERT: Shipment {{shipment_code}} is directly impacted by a {{incident_type}} ({{incident_title}}) near {{location}}.\n\nPriority: {{shipment_priority}}\nCurrent status has been escalated to DISRUPTED.\nEstimated Delay: {{delay_hours}} Hours.\nValue At Risk: ${{value_usd}}.\n\nPlease engage the Gemini Detour Planner module to outline safe rerouting paths.',
        channels: ['email', 'sms', 'slack', 'firebase']
      },
      {
        id: 'reroute_success',
        name: '✅ Optimized Detour Path Formulated',
        subject: '🎯 OPTIMIZATION RESOLVED: Detour Configured for {{shipment_code}}',
        body: 'SUCCESS: Gemini Decision Engine has established an optimized detour path around the corridor anomaly for {{shipment_code}}.\n\nNew current ETA: {{current_eta}}\nEstimated Delay Saved: {{delay_hours}} hrs.\nCarbon Footprint Change: {{carbon_percent}}%\nReasoning Summary:\n{{gemini_reasoning}}',
        channels: ['email', 'slack', 'teams']
      },
      {
        id: 'daily_digest',
        name: '📊 Daily Operations Summary Digest',
        subject: 'AegisRoute Logistics Operational Digest • {{date}}',
        body: 'DAILY DIGEST SUMMARY:\nActive Shipment Count: {{total_shipments}}\n• On-Time: {{ontime_count}}\n• Delayed: {{delayed_count}}\n• Disrupted: {{disrupted_count}}\nActive Corridor Disruptions: {{active_incidents}}\nTotal Port/Customs Value At Risk: ${{at_risk_value}}.\n\nComputational speedup status: NVIDIA cuDF Spark-RAPIDS active, monitoring telemetry flow continuously.',
        channels: ['email', 'slack']
      },
      {
        id: 'driver_notification',
        name: '🚛 Mobile Driver Dispatch Advisory',
        subject: 'ROUTE CHANGE DIRECTIVE: Shipment {{shipment_code}}',
        body: 'AegisRoute Command Dispatch: Major corridor anomaly ahead ({{incident_title}} near {{location}}). Dynamic Rerouting optimization is being computed. Maintain stand-by speed or switch to backup satellite routing. Acknowledge this advisory inside your Driver Portal.',
        channels: ['sms', 'whatsapp', 'firebase']
      }
    ];
    defaultTemplates.forEach(t => this.templates.set(t.id, t));

    // 3. Default Priority Rules
    this.priorityRules = [
      {
        id: 'rule_high',
        minPriority: 'high',
        channels: ['email', 'sms_twilio', 'slack_webhook', 'firebase_push'],
        autoEscalate: true
      },
      {
        id: 'rule_medium',
        minPriority: 'medium',
        channels: ['email', 'slack_webhook'],
        autoEscalate: true
      },
      {
        id: 'rule_low',
        minPriority: 'low',
        channels: ['email'],
        autoEscalate: false
      }
    ];

    // 4. Default Escalation Policies
    this.escalationPolicies = [
      {
        id: 'esc_critical',
        name: 'Corridor Crisis Escalation Pathway',
        severity: 'critical',
        enabled: true,
        steps: [
          { stepNumber: 1, delayMinutes: 0, recipientRole: 'Driver', channels: ['sms_twilio', 'firebase_push'] },
          { stepNumber: 2, delayMinutes: 5, recipientRole: 'Manager', channels: ['email', 'slack_webhook'] },
          { stepNumber: 3, delayMinutes: 15, recipientRole: 'Admin', channels: ['email', 'sms_twilio', 'slack_webhook'] }
        ]
      },
      {
        id: 'esc_high',
        name: 'Standard Delay Escalation Pathway',
        severity: 'high',
        enabled: true,
        steps: [
          { stepNumber: 1, delayMinutes: 0, recipientRole: 'Manager', channels: ['email', 'slack_webhook'] },
          { stepNumber: 2, delayMinutes: 10, recipientRole: 'Admin', channels: ['email'] }
        ]
      }
    ];

    // 5. Default Scheduled dispatches
    this.scheduledNotifications = [
      {
        id: 'sched_morning_digest',
        name: 'Morning Operational Digest Dispatch',
        time: '08:00',
        frequency: 'daily',
        templateId: 'daily_digest',
        recipient: 'operations-team@aegisroute.com'
      },
      {
        id: 'sched_hourly_fcm',
        name: 'Hourly Security Telemetry Keepalive',
        time: '12:00',
        frequency: 'hourly',
        templateId: 'daily_digest',
        recipient: 'manager@aegisroute.com'
      }
    ];

    // 6. Default Logs (to show in table on load)
    this.logs = [
      {
        id: 'log_001',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        recipient: 'driver-dispatch@aegisroute.com',
        recipientRole: 'Driver',
        channel: 'Twilio SMS Core Gateway',
        priority: 'high',
        title: '🚨 CRITICAL TELEMETRY: Disruption Alert for AS-8021',
        message: 'ALERT: Shipment AS-8021 is directly impacted by a port_congestion (Long Beach Port Strike) near Port of Long Beach. Estimated Delay: 42 Hours. Value At Risk: $1,420,000.',
        status: 'Delivered',
        isSimulated: true
      },
      {
        id: 'log_002',
        timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
        recipient: 'manager@aegisroute.com',
        recipientRole: 'Manager',
        channel: 'Command SMTP Email',
        priority: 'high',
        title: '🚨 CRITICAL TELEMETRY: Disruption Alert for AS-8021',
        message: 'ALERT: Shipment AS-8021 is directly impacted by a port_congestion (Long Beach Port Strike) near Port of Long Beach. Estimated Delay: 42 Hours. Value At Risk: $1,420,000.',
        status: 'Sent',
        isSimulated: true
      },
      {
        id: 'log_003',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        recipient: 'operations-slack-channel',
        recipientRole: 'Manager',
        channel: 'Slack Operator Channel Webhook',
        priority: 'high',
        title: '🎯 OPTIMIZATION RESOLVED: Detour Configured for AS-8021',
        message: 'SUCCESS: Gemini Decision Engine has established an optimized detour path around the corridor anomaly for AS-8021. New current ETA: 2026-07-06T14:30:00Z. Delay Saved: 18 hrs.',
        status: 'Sent',
        isSimulated: true
      }
    ];
  }

  // --- API Handlers ---
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  updateChannel(id: string, enabled: boolean, config: any): NotificationChannel | null {
    const channel = this.channels.get(id);
    if (!channel) return null;
    channel.enabled = enabled;
    channel.config = { ...channel.config, ...config };
    this.channels.set(id, channel);
    return channel;
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  addTemplate(name: string, subject: string, body: string, channels: string[]): NotificationTemplate {
    const id = 'temp_' + crypto.randomBytes(4).toString('hex');
    const template: NotificationTemplate = { id, name, subject, body, channels };
    this.templates.set(id, template);
    return template;
  }

  updateTemplate(id: string, subject: string, body: string, channels: string[]): NotificationTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;
    template.subject = subject;
    template.body = body;
    template.channels = channels;
    this.templates.set(id, template);
    return template;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  getPriorityRules(): PriorityRule[] {
    return this.priorityRules;
  }

  updatePriorityRules(rules: PriorityRule[]) {
    this.priorityRules = rules;
  }

  getScheduled(): ScheduledNotification[] {
    return this.scheduledNotifications;
  }

  addScheduled(name: string, time: string, frequency: 'hourly' | 'daily' | 'weekly', templateId: string, recipient: string): ScheduledNotification {
    const id = 'sched_' + crypto.randomBytes(4).toString('hex');
    const sched: ScheduledNotification = { id, name, time, frequency, templateId, recipient };
    this.scheduledNotifications.push(sched);
    return sched;
  }

  deleteScheduled(id: string): boolean {
    const len = this.scheduledNotifications.length;
    this.scheduledNotifications = this.scheduledNotifications.filter(s => s.id !== id);
    return this.scheduledNotifications.length < len;
  }

  getEscalationPolicies(): EscalationPolicy[] {
    return this.escalationPolicies;
  }

  updateEscalationPolicy(id: string, steps: EscalationStep[], enabled: boolean): EscalationPolicy | null {
    const policy = this.escalationPolicies.find(p => p.id === id);
    if (!policy) return null;
    policy.steps = steps;
    policy.enabled = enabled;
    return policy;
  }

  getLogs(): NotificationLog[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  addLog(recipient: string, recipientRole: string, channel: string, priority: 'low' | 'medium' | 'high' | 'critical', title: string, message: string, status: 'Pending' | 'Sent' | 'Delivered' | 'Failed' | 'Escalated' = 'Sent', isSimulated = true, escalationStep?: number): NotificationLog {
    const log: NotificationLog = {
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      recipient,
      recipientRole,
      channel,
      priority,
      title,
      message,
      status,
      isSimulated,
      escalationStep
    };
    this.logs.unshift(log); // newest first
    return log;
  }

  // Evaluate and dispatch notifications triggered by standard platform actions (e.g. disruptions, optimization success)
  dispatchPlatformNotification(type: 'disruption' | 'reroute', payload: any) {
    const templateId = type === 'disruption' ? 'disruption_alert' : 'reroute_success';
    const template = this.templates.get(templateId);
    if (!template) return;

    let subject = template.subject;
    let body = template.body;

    // Substitute template placeholdings
    const keys = Object.keys(payload);
    keys.forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(payload[key]));
      body = body.replace(regex, String(payload[key]));
    });

    const shipmentPriority = (payload.shipment_priority || 'medium').toLowerCase() as 'low' | 'medium' | 'high';
    
    // Find matching Priority Rule to decide output Channels
    const matchingRule = this.priorityRules.find(r => r.minPriority === shipmentPriority) || this.priorityRules[1];
    
    // Send across enabled matching channels
    matchingRule.channels.forEach(channelId => {
      const channel = this.channels.get(channelId);
      if (!channel) return;

      const channelStatus = channel.enabled ? 'Sent' : 'Failed';
      const recipientStr = channel.type === 'email' 
        ? 'operations-alerts@aegisroute.com' 
        : channel.type === 'sms' 
        ? '+15550190145 (Twilio Dispatch)' 
        : channel.type === 'slack' 
        ? '#operations-alerts (Slack Webhook)' 
        : 'Push Token Client (FCM)';

      this.addLog(
        recipientStr,
        'Manager',
        channel.name,
        shipmentPriority,
        subject,
        body,
        channelStatus,
        true
      );
    });

    // Check Escalation pathway if autoEscalate is true and severity is high or critical
    if (matchingRule.autoEscalate && (shipmentPriority === 'high' || type === 'disruption')) {
      const policySeverity = type === 'disruption' ? 'critical' : 'high';
      const policy = this.escalationPolicies.find(p => p.severity === policySeverity && p.enabled);
      if (policy) {
        // Trigger simulated cascade delay logs
        policy.steps.forEach(step => {
          if (step.stepNumber > 1) {
            // Log pending escalation actions
            const stepChannelsStr = step.channels.map(cid => {
              const ch = this.channels.get(cid);
              return ch ? ch.name : cid;
            }).join(', ');

            setTimeout(() => {
              this.addLog(
                `escalated-alert@aegisroute.com (${step.recipientRole} Escalation Tier)`,
                step.recipientRole,
                stepChannelsStr,
                'critical',
                `[ESCALATED TIER ${step.stepNumber}] ${subject}`,
                `System Escalation Level ${step.stepNumber} triggered (+${step.delayMinutes}m delay breached). Original Advisory Payload: \n\n${body}`,
                'Escalated',
                true,
                step.stepNumber
              );
            }, (step.stepNumber - 1) * 3000); // simulate escalation cascade every few seconds for UI demonstration
          }
        });
      }
    }
  }

  // Trigger manual template test dispatch from dashboard
  triggerManualTestDispatch(templateId: string, channelId: string, recipient: string): { success: boolean; log?: NotificationLog; error?: string } {
    const template = this.templates.get(templateId);
    if (!template) return { success: false, error: 'Template not found' };

    const channel = this.channels.get(channelId);
    if (!channel) return { success: false, error: 'Channel gateway not configured' };

    let subject = template.subject;
    let body = template.body;

    // Substitute standard mock parameters for test
    const mockPayload: any = {
      shipment_code: 'AS-7092-TEST',
      incident_type: 'customs_delay',
      incident_title: 'Customs Secondary Inspection',
      location: 'Rotterdam Europort Terminal',
      shipment_priority: 'HIGH',
      delay_hours: '14',
      value_usd: '840,000',
      current_eta: new Date(Date.now() + 86400000).toISOString().substring(0, 19) + 'Z',
      carbon_percent: '-12.5',
      gemini_reasoning: 'AI detour bypasses the customs congestion zone by routing through the cargo priority barge lane.',
      date: new Date().toLocaleDateString()
    };

    Object.keys(mockPayload).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, mockPayload[key]);
      body = body.replace(regex, mockPayload[key]);
    });

    const status = channel.enabled ? 'Delivered' : 'Failed';
    const log = this.addLog(
      recipient,
      'Operations Team',
      channel.name,
      'medium',
      subject,
      body,
      status,
      true
    );

    return { success: true, log };
  }
}

export const notificationStore = new NotificationStore();
