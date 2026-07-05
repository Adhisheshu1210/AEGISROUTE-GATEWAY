import React, { useState, useEffect } from 'react';
import { 
  Bell, Mail, MessageSquare, Send, Slack, Smartphone, CheckCircle2, 
  XCircle, Plus, Trash2, Edit, Clock, Settings, AlertTriangle, Sliders, 
  User, ShieldAlert, RefreshCw, Play, Save, ChevronRight, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationChannel {
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

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channels: string[];
}

interface PriorityRule {
  id: string;
  minPriority: 'low' | 'medium' | 'high';
  channels: string[];
  autoEscalate: boolean;
}

interface ScheduledNotification {
  id: string;
  name: string;
  time: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  templateId: string;
  recipient: string;
  lastRun?: string;
}

interface EscalationStep {
  stepNumber: number;
  delayMinutes: number;
  recipientRole: 'Driver' | 'Manager' | 'Admin';
  channels: string[];
}

interface EscalationPolicy {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium';
  steps: EscalationStep[];
  enabled: boolean;
}

interface NotificationLog {
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

interface NotificationConsoleProps {
  token: string;
  user: any;
  showNotification: (msg: string, type: 'success' | 'alert' | 'info') => void;
}

export default function NotificationConsole({ token, user, showNotification }: NotificationConsoleProps) {
  // Navigation tabs inside the Notification module
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'gateways' | 'templates' | 'rules' | 'escalation' | 'scheduled'>('logs');

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [dispatching, setDispatching] = useState<string | null>(null);

  // Data States
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [rules, setRules] = useState<PriorityRule[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [escalation, setEscalation] = useState<EscalationPolicy[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // Selected config items
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [testTemplateId, setTestTemplateId] = useState<string>('');
  const [testChannelId, setTestChannelId] = useState<string>('');
  const [testRecipient, setTestRecipient] = useState<string>('');

  // Create template state
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateSubject, setNewTemplateSubject] = useState<string>('');
  const [newTemplateBody, setNewTemplateBody] = useState<string>('');
  const [newTemplateChannels, setNewTemplateChannels] = useState<string[]>(['email']);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState<boolean>(false);

  // Create scheduled state
  const [newSchedName, setNewSchedName] = useState<string>('');
  const [newSchedTime, setNewSchedTime] = useState<string>('09:00');
  const [newSchedFreq, setNewSchedFreq] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [newSchedTempId, setNewSchedTempId] = useState<string>('');
  const [newSchedRecipient, setNewSchedRecipient] = useState<string>('');
  const [isCreatingSched, setIsCreatingSched] = useState<boolean>(false);

  // Fetch all notification data
  const fetchAllData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [chanRes, tempRes, ruleRes, schedRes, escRes, logRes] = await Promise.all([
        fetch('/api/notifications/channels', { headers }),
        fetch('/api/notifications/templates', { headers }),
        fetch('/api/notifications/rules', { headers }),
        fetch('/api/notifications/scheduled', { headers }),
        fetch('/api/notifications/escalation', { headers }),
        fetch('/api/notifications/logs', { headers })
      ]);

      if (chanRes.ok && tempRes.ok && ruleRes.ok && schedRes.ok && escRes.ok && logRes.ok) {
        setChannels(await chanRes.json());
        const temps = await tempRes.json();
        setTemplates(temps);
        setRules(await ruleRes.json());
        setScheduled(await schedRes.json());
        setEscalation(await escRes.json());
        setLogs(await logRes.json());

        // Select default test parameters
        if (temps.length > 0 && !testTemplateId) {
          setTestTemplateId(temps[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load notification state:', e);
      showNotification('Network discrepancy syncing notification data.', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
    
    // Auto-refresh log stream for interactive simulation visibility
    const timer = setInterval(() => {
      if (token && activeSubTab === 'logs') {
        fetchLogsOnly();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [token, activeSubTab]);

  const fetchLogsOnly = async () => {
    try {
      const res = await fetch('/api/notifications/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error('Log sync failed:', e);
    }
  };

  // Channel update handler
  const handleUpdateChannel = async (id: string, enabled: boolean, configPayload: any) => {
    try {
      const res = await fetch('/api/notifications/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, enabled, config: configPayload })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showNotification(`Gateway [${data.channel.name}] updated successfully.`, 'success');
          setEditingChannel(null);
          fetchAllData();
        } else {
          showNotification('Update rejected. Credentials verification failed.', 'alert');
        }
      } else {
        const err = await res.json();
        showNotification(err.error || 'Action denied. Role credentials insufficient.', 'alert');
      }
    } catch (e) {
      console.error('Channel configuration update error:', e);
    }
  };

  // Template Create/Update/Delete
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName || !newTemplateSubject || !newTemplateBody) return;
    try {
      const res = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTemplateName,
          subject: newTemplateSubject,
          body: newTemplateBody,
          channels: newTemplateChannels
        })
      });
      if (res.ok) {
        showNotification(`Custom template '${newTemplateName}' created successfully.`, 'success');
        setNewTemplateName('');
        setNewTemplateSubject('');
        setNewTemplateBody('');
        setIsCreatingTemplate(false);
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to create template.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTemplate = async (id: string, subject: string, body: string, selectedChans: string[]) => {
    try {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, body, channels: selectedChans })
      });
      if (res.ok) {
        showNotification('Template modifications persisted.', 'success');
        setEditingTemplate(null);
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to update template.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Confirm deletion of this notification layout template?')) return;
    try {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Template layout permanently deleted.', 'info');
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Action denied.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Rules configurations
  const handleUpdatePriorityRules = async (updatedRules: PriorityRule[]) => {
    try {
      const res = await fetch('/api/notifications/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rules: updatedRules })
      });
      if (res.ok) {
        showNotification('Priority dispatch routing rules saved.', 'success');
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Routing update denied.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Schedule Alerts
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName || !newSchedRecipient || !newSchedTempId) return;
    try {
      const res = await fetch('/api/notifications/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSchedName,
          time: newSchedTime,
          frequency: newSchedFreq,
          templateId: newSchedTempId,
          recipient: newSchedRecipient
        })
      });
      if (res.ok) {
        showNotification(`Routine alert '${newSchedName}' scheduled successfully.`, 'success');
        setNewSchedName('');
        setNewSchedRecipient('');
        setIsCreatingSched(false);
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to establish schedule.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/scheduled/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Scheduled dispatch policy removed.', 'info');
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Access denied.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Escalation Pathways
  const handleUpdateEscalationPolicy = async (id: string, steps: EscalationStep[], enabled: boolean) => {
    try {
      const res = await fetch(`/api/notifications/escalation/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ steps, enabled })
      });
      if (res.ok) {
        showNotification('Escalation sequence pathway updated.', 'success');
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to update escalation layout.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear Audit Logs
  const handleClearLogs = async () => {
    if (!window.confirm('Confirm purging of all notification dispatch operational histories?')) return;
    try {
      const res = await fetch('/api/notifications/logs/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Notification history purged.', 'info');
        fetchAllData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Action denied.', 'alert');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger test manual dispatch
  const handleTestDispatch = async () => {
    if (!testTemplateId || !testChannelId || !testRecipient) {
      showNotification('Configure all dispatch variables first.', 'alert');
      return;
    }

    setDispatching(testChannelId);
    try {
      const res = await fetch('/api/notifications/test-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: testTemplateId,
          channelId: testChannelId,
          recipient: testRecipient
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showNotification(`Dispatched simulated test alert to ${testRecipient}!`, 'success');
          fetchLogsOnly();
        } else {
          showNotification(data.error || 'Dispatch error.', 'alert');
        }
      } else {
        const err = await res.json();
        showNotification(err.error || 'Unauthorized action.', 'alert');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDispatching(null);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-sky-400" />;
      case 'sms': return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-teal-400" />;
      case 'slack': return <Slack className="w-4 h-4 text-pink-400" />;
      case 'teams': return <Sliders className="w-4 h-4 text-indigo-400" />;
      case 'firebase': return <Bell className="w-4 h-4 text-amber-400" />;
      default: return <Send className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p.toLowerCase()) {
      case 'critical': return 'bg-red-950/40 text-red-400 border-red-900/50';
      case 'high': return 'bg-orange-950/40 text-orange-400 border-orange-900/50';
      case 'medium': return 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50';
      case 'low': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">Syncing Secure Notification Services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Mini Tabs Header */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 p-1.5 rounded-lg">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-mono transition-all ${
            activeSubTab === 'logs' ? 'bg-zinc-900 text-white border-b border-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Dispatch Ledger ({logs.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab('gateways');
            setEditingChannel(null);
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-mono transition-all ${
            activeSubTab === 'gateways' ? 'bg-zinc-900 text-white border-b border-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Active Gateways</span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab('templates');
            setEditingTemplate(null);
            setIsCreatingTemplate(false);
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-mono transition-all ${
            activeSubTab === 'templates' ? 'bg-zinc-900 text-white border-b border-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Content Templates</span>
        </button>
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-mono transition-all ${
            activeSubTab === 'rules' ? 'bg-zinc-900 text-white border-b border-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Priority Rules</span>
        </button>
        <button
          onClick={() => setActiveSubTab('escalation')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-mono transition-all ${
            activeSubTab === 'escalation' ? 'bg-zinc-900 text-white border-b border-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Escalation Pathways</span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab('scheduled');
            setIsCreatingSched(false);
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs font-mono transition-all ${
            activeSubTab === 'scheduled' ? 'bg-zinc-900 text-white border-b border-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Scheduled Tasks</span>
        </button>
      </div>

      {/* SUBTAB 1: DISPATCH LEDGER & QUICK TESTING */}
      {activeSubTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Manual Test Dispatch Control */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 h-fit space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-900 pb-3">
              <Play className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-white">Manual Dispatch Testing</h2>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Inject a simulated operational disruption or detour resolution message down our active channels. Helpful for auditing pipeline latencies and rule setups.
            </p>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">1. Select Layout Template</label>
                <select
                  value={testTemplateId}
                  onChange={(e) => setTestTemplateId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">2. Choose Output Gateway</label>
                <select
                  value={testChannelId}
                  onChange={(e) => setTestChannelId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                >
                  <option value="">-- Choose Gateway --</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.enabled ? '● ACTIVE' : '○ DISABLED'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">3. Recipient Destination</label>
                <input
                  type="text"
                  placeholder="e.g. operator@aegisroute.com, +15550199"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                />
              </div>

              <button
                id="btn-test-dispatch"
                disabled={!testChannelId || !testRecipient || dispatching !== null}
                onClick={handleTestDispatch}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {dispatching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ROUTING CARRIER...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>TRIGGER DISPATCH TEST</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded mt-2">
              <div className="flex items-start space-x-2">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <div className="text-[10px] text-zinc-400 leading-normal space-y-1">
                  <span className="font-semibold text-zinc-300 block">Corridor Placeholders Auto-Injected:</span>
                  <p>• <span className="font-mono text-blue-400">{"{{shipment_code}}"}</span> : AS-7092-TEST</p>
                  <p>• <span className="font-mono text-blue-400">{"{{location}}"}</span> : Rotterdam Terminal</p>
                  <p>• <span className="font-mono text-blue-400">{"{{incident_title}}"}</span> : Customs Delay</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table View */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-white">Security & Operational Dispatch History</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchLogsOnly}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Refresh Log Stream"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {user.role === 'Admin' && (
                  <button
                    onClick={handleClearLogs}
                    className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 rounded text-[10px] font-mono font-bold transition-all cursor-pointer"
                  >
                    PURGE LEDGER
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 font-mono text-xs uppercase">No dispatch records found.</div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 border rounded-lg bg-zinc-900/40 transition-all ${
                        log.status === 'Failed' 
                          ? 'border-red-900/30 bg-red-950/5' 
                          : log.status === 'Escalated'
                          ? 'border-amber-900/40 bg-amber-950/5'
                          : 'border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-semibold border ${getPriorityBadgeClass(log.priority)}`}>
                            {log.priority}
                          </span>
                          {log.escalationStep && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 text-[8px] rounded font-mono uppercase font-bold">
                              ESC STEP {log.escalationStep}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-mono font-bold uppercase flex items-center space-x-1 ${
                          log.status === 'Delivered' ? 'text-emerald-400' : 
                          log.status === 'Sent' ? 'text-blue-400' : 
                          log.status === 'Escalated' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {log.status === 'Delivered' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {log.status === 'Failed' && <XCircle className="w-2.5 h-2.5" />}
                          <span>{log.status}</span>
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-white mb-1">{log.title}</h4>
                      <p className="text-[11px] text-zinc-400 font-mono leading-relaxed bg-zinc-950/60 p-2 rounded border border-zinc-900/80 mb-2 whitespace-pre-line">
                        {log.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500 font-mono">
                        <div>
                          <span className="text-zinc-600">Gateway:</span> {log.channel}
                        </div>
                        <div>
                          <span className="text-zinc-600">To ({log.recipientRole}):</span> <span className="text-zinc-300">{log.recipient}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CONFIGURATION OF GATEWAYS */}
      {activeSubTab === 'gateways' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Gateways */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-semibold text-white">Active Channel API Gateways</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Edit API credentials, tokens, webhooks, and phone coordinates to connect live APIs.</p>
            </div>

            <div className="space-y-3">
              {channels.map((chan) => (
                <div 
                  key={chan.id} 
                  className={`p-4 rounded-lg border bg-zinc-900/20 transition-all flex items-center justify-between ${
                    editingChannel?.id === chan.id 
                      ? 'border-blue-500/40 bg-zinc-900/60' 
                      : chan.enabled 
                      ? 'border-zinc-800 hover:border-zinc-700' 
                      : 'border-zinc-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      {getChannelIcon(chan.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-semibold text-white">{chan.name}</h4>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${chan.enabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-medium mt-0.5">{chan.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setEditingChannel(chan)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] font-mono transition-all cursor-pointer"
                    >
                      CONFIGURE
                    </button>
                    <button
                      onClick={() => handleUpdateChannel(chan.id, !chan.enabled, chan.config)}
                      className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        chan.enabled 
                          ? 'bg-red-950/20 hover:bg-red-950/40 border-red-900/30 text-red-400' 
                          : 'bg-blue-950/20 hover:bg-blue-950/40 border-blue-900/30 text-blue-400'
                      }`}
                    >
                      {chan.enabled ? 'DISABLE' : 'ACTIVATE'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Gateway configurations Pane */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-900 pb-3">
              <Settings className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-white">
                {editingChannel ? `Setup ${editingChannel.name}` : 'Configuration Panel'}
              </h2>
            </div>

            {editingChannel ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-semibold font-mono">Gateway Enabled</span>
                  <input
                    type="checkbox"
                    checked={editingChannel.enabled}
                    onChange={(e) => setEditingChannel({ ...editingChannel, enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-zinc-900 border-zinc-800 rounded focus:ring-blue-500 shrink-0"
                  />
                </div>

                {editingChannel.config.apiKey !== undefined && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">API Key / SID Credentials</label>
                    <input
                      type="password"
                      value={editingChannel.config.apiKey}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        config: { ...editingChannel.config, apiKey: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                )}

                {editingChannel.config.secretToken !== undefined && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Secret Auth Token</label>
                    <input
                      type="password"
                      value={editingChannel.config.secretToken}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        config: { ...editingChannel.config, secretToken: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                )}

                {editingChannel.config.senderAddress !== undefined && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Sender Outbox Address</label>
                    <input
                      type="text"
                      value={editingChannel.config.senderAddress}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        config: { ...editingChannel.config, senderAddress: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                )}

                {editingChannel.config.phoneNumber !== undefined && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Twilio SMS / WA Number</label>
                    <input
                      type="text"
                      value={editingChannel.config.phoneNumber}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        config: { ...editingChannel.config, phoneNumber: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                )}

                {editingChannel.config.webhookUrl !== undefined && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Secure Webhook Destination URL</label>
                    <input
                      type="text"
                      value={editingChannel.config.webhookUrl}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        config: { ...editingChannel.config, webhookUrl: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                )}

                {editingChannel.config.projectId !== undefined && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Firebase Platform Project ID</label>
                    <input
                      type="text"
                      value={editingChannel.config.projectId}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        config: { ...editingChannel.config, projectId: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                )}

                <div className="flex space-x-3.5 pt-2">
                  <button
                    onClick={() => handleUpdateChannel(editingChannel.id, editingChannel.enabled, editingChannel.config)}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE SYSTEM STATE</span>
                  </button>
                  <button
                    onClick={() => setEditingChannel(null)}
                    className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500 font-mono text-xs uppercase">
                Select any channel gateway to edit API keys and secure webhooks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CONTENT TEMPLATES EDITOR */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Templates Directory */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Disruption & Operations Template layouts</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Control layout typography for SMS text message bursts, Slack webhook payloads, and emails.</p>
              </div>
              <button
                onClick={() => {
                  setIsCreatingTemplate(true);
                  setEditingTemplate(null);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold rounded flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW LAYOUT</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((temp) => (
                <div 
                  key={temp.id} 
                  className={`p-4 rounded-lg border bg-zinc-900/20 hover:bg-zinc-900/40 transition-all flex flex-col justify-between space-y-3.5 ${
                    editingTemplate?.id === temp.id ? 'border-blue-500/40 bg-zinc-900/50' : 'border-zinc-900'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-white">{temp.name}</h4>
                      <div className="flex items-center space-x-1">
                        {temp.channels.map(cid => (
                          <span key={cid} title={cid} className="p-0.5 shrink-0 bg-zinc-900 border border-zinc-800 rounded">
                            {getChannelIcon(cid)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">ID: {temp.id}</p>
                    
                    <div className="mt-2 text-[11px] text-zinc-300 font-semibold truncate bg-zinc-950/60 p-1.5 rounded border border-zinc-900">
                      Subject: {temp.subject}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 border-t border-zinc-900/60 pt-3">
                    <button
                      onClick={() => {
                        setEditingTemplate(temp);
                        setIsCreatingTemplate(false);
                      }}
                      className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] font-mono transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>EDIT LAYOUT</span>
                    </button>
                    {templates.length > 2 && (
                      <button
                        onClick={() => handleDeleteTemplate(temp.id)}
                        className="p-1.5 bg-red-950/10 hover:bg-red-950/30 border border-red-900/20 text-red-400 rounded transition-all cursor-pointer"
                        title="Delete Layout"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create or Edit Layout panel */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            {isCreatingTemplate ? (
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-sm font-semibold text-white">Create Layout Template</h3>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Template Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Temperature Breach SMS Alert"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Alert Subject / Header</label>
                  <input
                    type="text"
                    required
                    placeholder="🚨 TEMP BREACH: Shipment {{shipment_code}}"
                    value={newTemplateSubject}
                    onChange={(e) => setNewTemplateSubject(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Alert Body Payload Markdown</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Type dispatch advisory text here..."
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Appropriate Channels</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {['email', 'sms', 'slack', 'teams', 'firebase'].map(cid => {
                      const isSelected = newTemplateChannels.includes(cid);
                      return (
                        <button
                          type="button"
                          key={cid}
                          onClick={() => {
                            if (isSelected) {
                              setNewTemplateChannels(newTemplateChannels.filter(c => c !== cid));
                            } else {
                              setNewTemplateChannels([...newTemplateChannels, cid]);
                            }
                          }}
                          className={`px-2 py-1 text-[9px] font-mono rounded border transition-all ${
                            isSelected 
                              ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {cid.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>CREATE TEMPLATE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            ) : editingTemplate ? (
              <div className="space-y-4">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-sm font-semibold text-white">Edit Template: {editingTemplate.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {editingTemplate.id}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Edit Alert Subject / Header</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Edit Alert Body Payload</label>
                  <textarea
                    rows={8}
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Configure Target Channels</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {['email', 'sms', 'whatsapp', 'slack', 'teams', 'firebase'].map(cid => {
                      const isSelected = editingTemplate.channels.includes(cid);
                      return (
                        <button
                          type="button"
                          key={cid}
                          onClick={() => {
                            const updated = isSelected 
                              ? editingTemplate.channels.filter(c => c !== cid) 
                              : [...editingTemplate.channels, cid];
                            setEditingTemplate({ ...editingTemplate, channels: updated });
                          }}
                          className={`px-2 py-1 text-[9px] font-mono rounded border transition-all ${
                            isSelected 
                              ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {cid.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => handleUpdateTemplate(editingTemplate.id, editingTemplate.subject, editingTemplate.body, editingTemplate.channels)}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE ADVISORY STYLE</span>
                  </button>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500 font-mono text-xs uppercase">
                Select any content template layout or create a new layout to edit parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: DISPATCH PRIORITY CHANNELS ROUTING RULES */}
      {activeSubTab === 'rules' && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-5">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-semibold text-white">Platform Dispatch Severity Routing Rules</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Determine which communication channels are instantly targeted based on the priority of the disrupted corridor shipment.</p>
          </div>

          <div className="space-y-4">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${getPriorityBadgeClass(rule.minPriority)}`}>
                      {rule.minPriority.toUpperCase()} PRIORITY DISRUPTIONS
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Route alerts corresponding to {rule.minPriority} priority shipments immediately down these lines.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {channels.map((chan) => {
                    const isMapped = rule.channels.includes(chan.id);
                    return (
                      <button
                        key={chan.id}
                        disabled={user.role !== 'Admin'}
                        onClick={() => {
                          const updatedChans = isMapped 
                            ? rule.channels.filter(id => id !== chan.id) 
                            : [...rule.channels, chan.id];
                          const updatedRules = [...rules];
                          updatedRules[idx] = { ...rule, channels: updatedChans };
                          setRules(updatedRules);
                        }}
                        className={`px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all flex items-center space-x-1.5 disabled:opacity-75 ${
                          isMapped 
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                            : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {getChannelIcon(chan.type)}
                        <span>{chan.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2 border-l border-zinc-900 pl-4">
                  <span className="text-[10px] text-zinc-500 font-mono">Auto-Escalate</span>
                  <input
                    type="checkbox"
                    disabled={user.role !== 'Admin'}
                    checked={rule.autoEscalate}
                    onChange={(e) => {
                      const updatedRules = [...rules];
                      updatedRules[idx] = { ...rule, autoEscalate: e.target.checked };
                      setRules(updatedRules);
                    }}
                    className="w-3.5 h-3.5 text-blue-600 bg-zinc-900 border-zinc-800 rounded focus:ring-blue-500 shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>

          {user.role === 'Admin' && (
            <div className="flex justify-end pt-2 border-t border-zinc-900">
              <button
                onClick={() => handleUpdatePriorityRules(rules)}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE OPERATIONAL RULES</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: ESCALATION PATHWAYS SEQUENCE BUILDER */}
      {activeSubTab === 'escalation' && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-5">
          <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-white">Dynamic Incident Escalation Policies</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Define multi-stage notification routing. If critical disruptions are unacknowledged, automatically cascade warnings to Managers and executive Admins.</p>
            </div>
          </div>

          <div className="space-y-6">
            {escalation.map((policy) => (
              <div key={policy.id} className="p-5 border border-zinc-900 rounded-lg bg-zinc-900/10 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center space-x-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{policy.name}</h3>
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 text-[8px] rounded font-mono uppercase font-bold">
                      {policy.severity} SEVERITY
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-zinc-500 font-mono">Cascade Enabled</span>
                    <input
                      type="checkbox"
                      disabled={user.role !== 'Admin'}
                      checked={policy.enabled}
                      onChange={(e) => handleUpdateEscalationPolicy(policy.id, policy.steps, e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 bg-zinc-900 border-zinc-800 rounded focus:ring-blue-500 shrink-0"
                    />
                  </div>
                </div>

                <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                  {policy.steps.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      {/* Step Indicator Dot */}
                      <span className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full bg-zinc-950 border-2 border-blue-500 flex items-center justify-center shrink-0 z-10"></span>
                      
                      <div className="flex-1 p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white">Stage {step.stepNumber}: Alert {step.recipientRole}</span>
                            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                              +{step.delayMinutes}m delay
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono">Dispatches advisory package to role: <span className="text-zinc-300">{step.recipientRole}</span></p>
                        </div>

                        {/* Channels Config */}
                        <div className="flex items-center gap-2">
                          {channels.map((chan) => {
                            const isSelected = step.channels.includes(chan.id);
                            return (
                              <button
                                key={chan.id}
                                disabled={user.role !== 'Admin'}
                                onClick={() => {
                                  const updatedChans = isSelected 
                                    ? step.channels.filter(id => id !== chan.id) 
                                    : [...step.channels, chan.id];
                                  const updatedSteps = [...policy.steps];
                                  updatedSteps[idx] = { ...step, channels: updatedChans };
                                  handleUpdateEscalationPolicy(policy.id, updatedSteps, policy.enabled);
                                }}
                                className={`p-1 bg-zinc-900 border rounded transition-all cursor-pointer ${
                                  isSelected ? 'border-blue-500/40 text-blue-400' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'
                                }`}
                                title={chan.name}
                              >
                                {getChannelIcon(chan.type)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: ROUTINE SCHEDULES POLICY */}
      {activeSubTab === 'scheduled' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Schedules list */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Routine Reports & Scheduled Dispatches</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Manage automated logistics status and carbon ledger reports.</p>
              </div>
              <button
                onClick={() => {
                  setIsCreatingSched(true);
                  if (templates.length > 0) {
                    setNewSchedTempId(templates[0].id);
                  }
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold rounded flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW SCHEDULE</span>
              </button>
            </div>

            <div className="space-y-3">
              {scheduled.map((sched) => {
                const temp = templates.find(t => t.id === sched.templateId);
                return (
                  <div key={sched.id} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-lg flex items-center justify-between transition-all hover:border-zinc-800">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-semibold text-white">{sched.name}</h4>
                        <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/80 px-1.5 py-0.5 text-[8px] rounded font-mono uppercase font-bold">
                          {sched.frequency}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-[10px] text-zinc-500 font-mono">
                        <div>
                          <span className="text-zinc-600">Dispatch Time:</span> {sched.time}
                        </div>
                        <div>
                          <span className="text-zinc-600">Target Recipient:</span> <span className="text-zinc-400">{sched.recipient}</span>
                        </div>
                        {temp && (
                          <div>
                            <span className="text-zinc-600">Template:</span> <span className="text-zinc-400">{temp.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={user.role !== 'Admin'}
                      onClick={() => handleDeleteSchedule(sched.id)}
                      className="p-2 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/30 text-zinc-500 hover:text-red-400 rounded transition-all cursor-pointer"
                      title="Remove Schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Schedule form */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-semibold text-white">Configure Scheduled Broadcast</h3>
            </div>

            {isCreatingSched ? (
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Schedule Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Afternoon Operations Keepalive"
                    value={newSchedName}
                    onChange={(e) => setNewSchedName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Recipient Target Address</label>
                  <input
                    type="text"
                    required
                    placeholder="manager-desk@aegisroute.com"
                    value={newSchedRecipient}
                    onChange={(e) => setNewSchedRecipient(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Frequency</label>
                    <select
                      value={newSchedFreq}
                      onChange={(e) => setNewSchedFreq(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Trigger Time</label>
                    <input
                      type="time"
                      required
                      value={newSchedTime}
                      onChange={(e) => setNewSchedTime(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Dispatch Layout Template</label>
                  <select
                    value={newSchedTempId}
                    onChange={(e) => setNewSchedTempId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-750"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>CREATE ROUTINE TASK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSched(false)}
                    className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-16 text-zinc-500 font-mono text-xs uppercase">
                Click "New Schedule" to add routine logs or digest dispatches.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
