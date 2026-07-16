export type ResearchPhase = 'planning' | 'researching' | 'auditing' | 'writing' | 'checking' | 'completed' | 'failed';

export type SessionStatus = 'running' | 'completed' | 'failed' | 'pending' | 'budget_exhausted';

export interface LogEntry {
  id: string;
  timestamp: Date;
  agent: string;
  phase: ResearchPhase;
  message: string;
}

export interface ResearchSession {
  id: string;
  threadId: string;
  query: string;
  status: SessionStatus;
  phase: ResearchPhase;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  report?: string;
  sourceCount?: number;
  wordCount?: number;
  duration?: number;
  model?: string;
  researchProfile: string;
  maxLlmCalls: number;
  llmCallsUsed: number;
  maxSearchCalls: number;
  searchCallsUsed: number;
  maxSubagentCalls: number;
  subagentCallsUsed: number;
  maxResearchRounds: number;
  recursionLimit: number;
  logs: LogEntry[];
  tags: string[];
  phaseTimes?: Record<ResearchPhase, number>;
  steeringInstructions: SteeringInstruction[];
  lastSteeringAt?: Date;
}

export interface SteeringInstruction {
  id: string;
  message: string;
  createdAt: Date;
  consumed: boolean;
  consumedAt?: Date;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  avgExecutionTime: number;
  successRate: number;
  totalInvocations: number;
  tools: string[];
}

export interface ResearchOptions {
  threadId?: string;
  model: string;
  researchProfile: string;
  outputFormat: 'markdown' | 'json';
}

export interface ResearchProfile {
  id: string;
  label: string;
  description: string;
  maxLlmCalls: number;
  maxSearchCalls: number;
  maxSubagentCalls: number;
  maxResearchRounds: number;
  recursionLimit: number;
}

export type PageView = 'dashboard' | 'new-research' | 'sessions' | 'reports' | 'agents' | 'settings';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: Date;
}
