/**
 * PANGEIA - Assistente Autônomo de Gestão de Equipe
 * Types e Interfaces
 */

export interface MessageContext {
  instanceName: string;
  remoteJid: string;
  senderJid: string;
  senderName: string;
  text: string;
  isGroup: boolean;
  messageTimestamp?: number;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  actions?: AgentAction[];
}

export interface AgentAction {
  type: 'send_message' | 'create_task' | 'send_notification' | 'update_memory' | 'create_insight';
  payload: any;
  scheduledFor?: Date;
}

export interface ConversationIntent {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}

export interface TeamContext {
  teamId: number;
  teamName: string;
  membersCount: number;
  activeTasks: number;
  overdueTasks: number;
  lastReportDate?: Date;
  goals?: string[];
}

export interface InsightData {
  type: 'OVERLOAD' | 'BOTTLENECK' | 'PRODUCTIVITY_DROP' | 'DEADLINE_RISK' | 'TEAM_PERFORMANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedMembers?: number[];
  affectedTasks?: number[];
  metrics?: Record<string, number>;
  suggestions?: string[];
}

export interface ScheduledAction {
  id?: number;
  action: AgentAction;
  scheduledFor: Date;
  executed: boolean;
  executedAt?: Date;
}

export interface IntegrationConfig {
  type: 'GOOGLE_CALENDAR' | 'NOTION' | 'SUPABASE';
  credentials: any;
  config?: any;
}

export interface MemoryData {
  context: string;
  data: any;
  expiresAt?: Date;
}

export interface ProactiveRule {
  name: string;
  condition: (context: TeamContext) => boolean;
  action: (context: TeamContext) => Promise<AgentAction[]>;
  schedule?: string; // cron expression
}

export interface NaturalLanguageQuery {
  query: string;
  context?: Record<string, any>;
}

export interface AIReasoning {
  analysis: string;
  conclusion: string;
  suggestedActions: AgentAction[];
  confidence: number;
}
