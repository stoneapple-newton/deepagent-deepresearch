import { create } from 'zustand';
import { api } from '@/api/client';
import type {
  AgentConfig,
  LogEntry,
  Notification,
  PageView,
  ResearchOptions,
  ResearchPhase,
  ResearchSession,
  SteeringInstruction,
} from '@/types';

interface ApiLogEntry {
  id: string;
  timestamp: string;
  agent: string;
  phase: ResearchPhase;
  message: string;
}

interface ApiSteeringInstruction {
  id: string;
  message: string;
  created_at: string;
  consumed: boolean;
  consumed_at?: string;
}

interface ApiResearchSession {
  id: string;
  thread_id: string;
  query: string;
  status: ResearchSession['status'];
  phase: ResearchPhase;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  report?: string;
  source_count?: number;
  word_count?: number;
  duration?: number;
  model?: string;
  max_llm_calls: number;
  llm_calls_used: number;
  logs: ApiLogEntry[];
  tags: string[];
  phase_times?: Record<ResearchPhase, number>;
  steering_instructions: ApiSteeringInstruction[];
  last_steering_at?: string;
}

interface ApiAgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  avg_execution_time: number;
  success_rate: number;
  total_invocations: number;
  tools: string[];
}

interface AppState {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  sessions: ResearchSession[];
  loadSessions: () => Promise<void>;
  createResearchSession: (payload: {
    query: string;
    threadId?: string;
    model?: string;
    maxLlmCalls: number;
    tags?: string[];
  }) => Promise<ResearchSession>;
  continueSession: (id: string) => Promise<ResearchSession>;
  steerSession: (id: string, message: string) => Promise<void>;
  addSession: (session: ResearchSession) => void;
  updateSession: (id: string, updates: Partial<ResearchSession>) => void;
  removeSession: (id: string) => Promise<void>;
  getSession: (id: string) => ResearchSession | undefined;

  agents: AgentConfig[];
  loadAgents: () => Promise<void>;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => Promise<void>;

  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;

  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  researchOptions: ResearchOptions;
  setResearchOptions: (options: Partial<ResearchOptions>) => void;

  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

function toDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

function mapLog(log: ApiLogEntry): LogEntry {
  return {
    id: log.id,
    timestamp: new Date(log.timestamp),
    agent: log.agent,
    phase: log.phase,
    message: log.message,
  };
}

function mapSteering(instruction: ApiSteeringInstruction): SteeringInstruction {
  return {
    id: instruction.id,
    message: instruction.message,
    createdAt: new Date(instruction.created_at),
    consumed: instruction.consumed,
    consumedAt: toDate(instruction.consumed_at),
  };
}

export function mapSession(session: ApiResearchSession): ResearchSession {
  return {
    id: session.id,
    threadId: session.thread_id,
    query: session.query,
    status: session.status,
    phase: session.phase,
    progress: session.progress,
    createdAt: new Date(session.created_at),
    updatedAt: new Date(session.updated_at),
    completedAt: toDate(session.completed_at),
    report: session.report,
    sourceCount: session.source_count,
    wordCount: session.word_count,
    duration: session.duration,
    model: session.model,
    maxLlmCalls: session.max_llm_calls,
    llmCallsUsed: session.llm_calls_used,
    logs: (session.logs || []).map(mapLog),
    tags: session.tags || [],
    phaseTimes: session.phase_times,
    steeringInstructions: (session.steering_instructions || []).map(mapSteering),
    lastSteeringAt: toDate(session.last_steering_at),
  };
}

function mapAgent(agent: ApiAgentConfig): AgentConfig {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    enabled: agent.enabled,
    systemPrompt: agent.system_prompt,
    temperature: agent.temperature,
    maxTokens: agent.max_tokens,
    avgExecutionTime: agent.avg_execution_time,
    successRate: agent.success_rate,
    totalInvocations: agent.total_invocations,
    tools: agent.tools,
  };
}

function toAgentPayload(updates: Partial<AgentConfig>) {
  return {
    name: updates.name,
    description: updates.description,
    icon: updates.icon,
    enabled: updates.enabled,
    system_prompt: updates.systemPrompt,
    temperature: updates.temperature,
    max_tokens: updates.maxTokens,
    avg_execution_time: updates.avgExecutionTime,
    success_rate: updates.successRate,
    total_invocations: updates.totalInvocations,
    tools: updates.tools,
  };
}

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page: PageView) => set({ currentPage: page }),

  sessions: [],
  loadSessions: async () => {
    const sessions = await api.get<ApiResearchSession[]>('/sessions');
    set({ sessions: sessions.map(mapSession) });
  },
  createResearchSession: async (payload) => {
    const session = await api.post<ApiResearchSession>('/sessions', {
      query: payload.query,
      thread_id: payload.threadId || undefined,
      model: payload.model || undefined,
      max_llm_calls: payload.maxLlmCalls,
      tags: payload.tags || [],
    });
    const mapped = mapSession(session);
    set((state) => ({ sessions: [mapped, ...state.sessions] }));
    return mapped;
  },
  continueSession: async (id) => {
    const existing = get().getSession(id);
    if (!existing) {
      throw new Error(`Session ${id} not found`);
    }
    if (existing.status !== 'failed' && existing.status !== 'budget_exhausted') {
      throw new Error(`Cannot continue session with status ${existing.status}`);
    }
    return get().createResearchSession({
      query: existing.query,
      threadId: existing.threadId,
      model: existing.model,
      maxLlmCalls: existing.maxLlmCalls,
    });
  },
  steerSession: async (id, message) => {
    const session = await api.post<ApiResearchSession>(`/sessions/${id}/steer`, { message });
    const mapped = mapSession(session);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? mapped : s)),
    }));
  },
  addSession: (session: ResearchSession) => set((state) => ({ sessions: [session, ...state.sessions] })),
  updateSession: (id: string, updates: Partial<ResearchSession>) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s)),
    })),
  removeSession: async (id: string) => {
    await api.delete(`/sessions/${id}`);
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) }));
  },
  getSession: (id: string) => get().sessions.find((s) => s.id === id),

  agents: [],
  loadAgents: async () => {
    let agents = await api.get<ApiAgentConfig[]>('/agents');
    if (agents.length === 0) {
      agents = await api.post<ApiAgentConfig[]>('/agents/seed');
    }
    set({ agents: agents.map(mapAgent) });
  },
  updateAgent: async (id: string, updates: Partial<AgentConfig>) => {
    const agent = await api.put<ApiAgentConfig>(`/agents/${id}`, toAgentPayload(updates));
    const mapped = mapAgent(agent);
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? mapped : a)),
    }));
  },

  notifications: [],
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: generateId(), timestamp: new Date() },
      ],
    })),
  dismissNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n: Notification) => n.id !== id),
    })),

  activeSessionId: null,
  setActiveSessionId: (id: string | null) => set({ activeSessionId: id }),

  researchOptions: {
    model: 'deepseek-chat',
    maxSearchRounds: 5,
    maxLlmCalls: 40,
    outputFormat: 'markdown',
  },
  setResearchOptions: (options: Partial<ResearchOptions>) =>
    set((state) => ({
      researchOptions: { ...state.researchOptions, ...options },
    })),

  isSidebarOpen: true,
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
}));
