import { create } from 'zustand';
import type { ResearchSession, AgentConfig, PageView, Notification, ResearchOptions } from '@/types';

interface AppState {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  sessions: ResearchSession[];
  addSession: (session: ResearchSession) => void;
  updateSession: (id: string, updates: Partial<ResearchSession>) => void;
  removeSession: (id: string) => void;
  getSession: (id: string) => ResearchSession | undefined;

  agents: AgentConfig[];
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void;

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

const now = new Date();

const mockSessions: ResearchSession[] = [
  {
    id: 'sess-001',
    threadId: 'browser-agent-research',
    query: 'Research the current state of open-source browser agents and write a report comparing their capabilities, limitations, and real-world use cases.',
    status: 'completed',
    phase: 'completed',
    progress: 100,
    createdAt: new Date(now.getTime() - 86400000 * 2),
    updatedAt: new Date(now.getTime() - 86400000 * 2 + 1800000),
    completedAt: new Date(now.getTime() - 86400000 * 2 + 1800000),
    report: `# Open-Source Browser Agents: A Comprehensive Analysis

## Executive Summary

The landscape of open-source browser automation has evolved rapidly, with several notable projects emerging to enable AI agents to interact with web browsers autonomously. This report examines the leading solutions, their architectures, and practical applications.

## Key Players

### 1. BrowserUse
BrowserUse is a Python-based framework that provides a high-level API for browser automation. It supports multiple browser backends including Playwright and Selenium.

**Strengths:**
- Clean, intuitive API design
- Strong community support (15K+ GitHub stars)
- Comprehensive documentation

**Limitations:**
- Limited support for complex JavaScript-heavy applications
- Requires manual handling of CAPTCHAs and anti-bot measures

### 2. Stagehand
Developed by Browserbase, Stagehand offers a more robust approach to browser automation with built-in stealth capabilities.

**Strengths:**
- Advanced anti-detection mechanisms
- Integration with Browserbase cloud infrastructure
- Strong TypeScript support

### 3. Skyvern
Skyvern takes a unique approach by using computer vision and LLM reasoning to interact with web pages visually rather than relying solely on DOM manipulation.

**Strengths:**
- Visual understanding capabilities
- Resilient to UI changes
- Natural language task specification

## Comparative Analysis

| Feature | BrowserUse | Stagehand | Skyvern |
|---------|-----------|-----------|---------|
| Language | Python | TypeScript | Python |
| Stars | 15K+ | 8K+ | 12K+ |
| Cloud Option | No | Yes (Browserbase) | No |
| Visual Understanding | No | Limited | Yes |
| Stealth Features | Basic | Advanced | Moderate |

## Real-World Use Cases

1. **Automated Testing**: All three frameworks are used for end-to-end testing of web applications
2. **Data Extraction**: Browser agents can scrape structured data from complex websites
3. **Workflow Automation**: Tasks like form filling, booking appointments, and processing transactions
4. **Research Assistance**: Academic and market researchers use browser agents to gather information at scale

## Challenges and Limitations

- **Rate Limiting**: Websites increasingly implement sophisticated rate limiting
- **Dynamic Content**: SPAs and JavaScript-heavy sites pose challenges for traditional DOM-based approaches
- **Ethical Considerations**: Automated browsing raises questions about terms of service compliance
- **Cost**: LLM-powered solutions like Skyvern can be expensive at scale

## Future Outlook

The browser agent ecosystem is maturing rapidly. We expect to see tighter integration with LLMs, improved stealth capabilities, and standardized protocols for agent-web interaction. The W3C WebDriver BiDi protocol promises to provide a more robust foundation for next-generation browser automation.

## Conclusion

Open-source browser agents have reached a tipping point of viability for production use. While each solution has trade-offs, the combination of improving AI capabilities and dedicated automation frameworks makes 2025-2026 an exciting period for this technology domain.`,
    sourceCount: 24,
    wordCount: 3420,
    duration: 1800,
    logs: [],
    tags: ['AI Agents', 'Browser Automation', 'Open Source'],
    phaseTimes: {
      planning: 120,
      researching: 600,
      auditing: 300,
      writing: 600,
      checking: 180,
      completed: 0,
      failed: 0,
    },
  },
  {
    id: 'sess-002',
    threadId: 'langgraph-overview',
    query: 'Research LangGraph: what it is, how it compares to other agent frameworks, and real-world use cases. Write a report.',
    status: 'completed',
    phase: 'completed',
    progress: 100,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: new Date(now.getTime() - 86400000 + 2400000),
    completedAt: new Date(now.getTime() - 86400000 + 2400000),
    report: `# LangGraph: A Deep Dive into the Agent Orchestration Framework

## What is LangGraph?

LangGraph is a library built on top of LangChain that enables the creation of stateful, multi-actor applications with LLMs. It extends the LangChain expression language with the ability to model complex workflows as graphs.

## Architecture

LangGraph is built around several core concepts:

### StateGraph
The fundamental building block is the StateGraph, which defines the structure of your application as a directed graph where nodes represent functions and edges represent transitions.

### Nodes
Nodes are Python functions (or async functions) that take the current state as input and return updates to that state. Each node can invoke LLMs, tools, or perform arbitrary computations.

### Edges
Edges define the flow between nodes. LangGraph supports:
- **Normal edges**: Unconditional transitions
- **Conditional edges**: Dynamic routing based on state
- **Entry points**: Where the graph starts
- **Finish points**: Where the graph ends

## Comparison with Other Frameworks

### vs. AutoGen (Microsoft)
AutoGen focuses on multi-agent conversations where agents communicate through a chat interface. LangGraph provides more explicit control over the execution flow.

**When to choose LangGraph:** You need precise control over agent orchestration, state management, and error handling.
**When to choose AutoGen:** You want a conversation-centric approach with minimal configuration.

### vs. CrewAI
CrewAI emphasizes role-based agent teams with a focus on collaborative task execution. LangGraph offers lower-level primitives for building custom orchestration logic.

### vs. LlamaIndex Workflows
LlamaIndex provides event-driven workflows optimized for RAG pipelines. LangGraph is more general-purpose and graph-oriented.

## Real-World Use Cases

1. **Customer Support Automation**: Multi-step support tickets that require research, escalation, and resolution tracking
2. **Research Agents**: Deep research workflows with planning, searching, and synthesis phases
3. **Code Review Pipelines**: Automated code analysis with multiple specialized reviewers
4. **Content Generation**: Multi-stage content creation with editing and quality checks

## Key Advantages

- **Persistence**: Built-in checkpointing for long-running workflows
- **Human-in-the-loop**: Easy integration for human approval steps
- **Streaming**: Real-time streaming of intermediate results
- **Debugging**: Visual graph representation aids in debugging complex flows

## Getting Started

\`\`\`python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class State(TypedDict):
    message: str

graph = StateGraph(State)
graph.add_node("agent", lambda state: {"message": state["message"] + " processed"})
graph.set_entry_point("agent")
graph.add_edge("agent", END)

app = graph.compile()
result = app.invoke({"message": "Hello"})
\`\`\`

## Conclusion

LangGraph represents a significant advancement in LLM application development by providing a robust framework for building stateful, graph-based agent systems. Its integration with the broader LangChain ecosystem makes it a compelling choice for production agent applications.`,
    sourceCount: 18,
    wordCount: 2850,
    duration: 2400,
    logs: [],
    tags: ['LangGraph', 'Agent Frameworks', 'LLM'],
    phaseTimes: {
      planning: 180,
      researching: 720,
      auditing: 360,
      writing: 840,
      checking: 300,
      completed: 0,
      failed: 0,
    },
  },
  {
    id: 'sess-003',
    threadId: 'multimodal-ai-2026',
    query: 'Research the latest advances in multimodal AI models in 2026, focusing on video understanding and generation capabilities.',
    status: 'running',
    phase: 'researching',
    progress: 42,
    createdAt: new Date(now.getTime() - 600000),
    updatedAt: new Date(now.getTime() - 120000),
    logs: [
      { id: 'log-001', timestamp: new Date(now.getTime() - 600000), agent: 'planner', phase: 'planning', message: 'Analyzing research query and decomposing into sub-questions...' },
      { id: 'log-002', timestamp: new Date(now.getTime() - 598000), agent: 'planner', phase: 'planning', message: 'Generated 5 sub-questions for investigation' },
      { id: 'log-003', timestamp: new Date(now.getTime() - 595000), agent: 'planner', phase: 'planning', message: 'Planning phase complete. Handing off to researcher.' },
      { id: 'log-004', timestamp: new Date(now.getTime() - 590000), agent: 'web_researcher', phase: 'researching', message: 'Searching: "multimodal AI video understanding 2026 state of the art"...' },
      { id: 'log-005', timestamp: new Date(now.getTime() - 585000), agent: 'web_researcher', phase: 'researching', message: 'Found 15 sources. Processing key findings...' },
      { id: 'log-006', timestamp: new Date(now.getTime() - 580000), agent: 'web_researcher', phase: 'researching', message: 'Searching: "video generation models 2026 comparison Sora Kling"...' },
      { id: 'log-007', timestamp: new Date(now.getTime() - 575000), agent: 'web_researcher', phase: 'researching', message: 'Found 12 additional sources on video generation' },
      { id: 'log-008', timestamp: new Date(now.getTime() - 570000), agent: 'web_researcher', phase: 'researching', message: 'Extracting findings from arXiv papers...' },
      { id: 'log-009', timestamp: new Date(now.getTime() - 300000), agent: 'web_researcher', phase: 'researching', message: 'Searching: "multimodal benchmarks 2026 video-text understanding"...' },
      { id: 'log-010', timestamp: new Date(now.getTime() - 120000), agent: 'web_researcher', phase: 'researching', message: 'Found 8 benchmark results. Continuing research...' },
    ],
    tags: ['Multimodal AI', 'Video Generation', '2026'],
  },
];

const defaultAgents: AgentConfig[] = [
  {
    id: 'planner',
    name: 'Planner',
    description: 'Decomposes research queries into structured sub-questions and creates investigation plans.',
    icon: 'LayoutTemplate',
    enabled: true,
    systemPrompt: `You are a research planning agent. Your job is to analyze a research query and break it down into 3-7 focused sub-questions that, when answered together, will provide a comprehensive answer to the original query. Output a structured plan with clear priorities.`,
    temperature: 0.3,
    maxTokens: 2048,
    avgExecutionTime: 45,
    successRate: 98,
    totalInvocations: 156,
    tools: [],
  },
  {
    id: 'web_researcher',
    name: 'Web Researcher',
    description: 'Conducts focused web searches, extracts facts from sources, and compiles findings with citations.',
    icon: 'Globe',
    enabled: true,
    systemPrompt: `You are a focused web researcher. Investigate exactly one assigned sub-question. Use internet_search for targeted queries and prefer primary sources, official documentation, reputable journalism, and credible technical writing. Return 5-8 sourced facts with direct source URLs for each major claim.`,
    temperature: 0.2,
    maxTokens: 4096,
    avgExecutionTime: 120,
    successRate: 95,
    totalInvocations: 423,
    tools: ['internet_search'],
  },
  {
    id: 'source_auditor',
    name: 'Source Auditor',
    description: 'Reviews and validates the credibility, freshness, and relevance of all gathered sources.',
    icon: 'ShieldCheck',
    enabled: true,
    systemPrompt: `You are a source credibility auditor. Review all gathered sources for: (1) credibility of the publisher/author, (2) recency and freshness, (3) potential bias, (4) factual accuracy where verifiable. Flag any sources that should be excluded or downweighted.`,
    temperature: 0.1,
    maxTokens: 2048,
    avgExecutionTime: 60,
    successRate: 99,
    totalInvocations: 312,
    tools: [],
  },
  {
    id: 'report_writer',
    name: 'Report Writer',
    description: 'Synthesizes all audited findings into a well-structured, comprehensive Markdown report.',
    icon: 'FileText',
    enabled: true,
    systemPrompt: `You are an expert technical report writer. Synthesize all audited research findings into a comprehensive, well-structured Markdown report. Use clear headings, tables for comparisons, and maintain an objective, analytical tone. Include an executive summary and conclusion.`,
    temperature: 0.3,
    maxTokens: 8192,
    avgExecutionTime: 180,
    successRate: 97,
    totalInvocations: 156,
    tools: [],
  },
  {
    id: 'quality_checker',
    name: 'Quality Checker',
    description: 'Evaluates the final report for completeness, accuracy, and alignment with the original query.',
    icon: 'CheckCircle',
    enabled: true,
    systemPrompt: `You are a quality assurance agent. Evaluate the research report against the original query for: (1) completeness - does it answer all aspects?, (2) accuracy - are facts supported by sources?, (3) structure - is it well-organized and readable?, (4) objectivity - is the tone balanced?`,
    temperature: 0.1,
    maxTokens: 2048,
    avgExecutionTime: 90,
    successRate: 96,
    totalInvocations: 156,
    tools: ['assess_research_report'],
  },
];

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page: PageView) => set({ currentPage: page }),

  sessions: mockSessions,
  addSession: (session: ResearchSession) => set((state: AppState) => ({ sessions: [session, ...state.sessions] })),
  updateSession: (id: string, updates: Partial<ResearchSession>) =>
    set((state: AppState) => ({
      sessions: state.sessions.map((s: ResearchSession) => (s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s)),
    })),
  removeSession: (id: string) => set((state: AppState) => ({ sessions: state.sessions.filter((s: ResearchSession) => s.id !== id) })),
  getSession: (id: string) => get().sessions.find((s: ResearchSession) => s.id === id),

  agents: defaultAgents,
  updateAgent: (id: string, updates: Partial<AgentConfig>) =>
    set((state: AppState) => ({
      agents: state.agents.map((a: AgentConfig) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  notifications: [],
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) =>
    set((state: AppState) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: generateId(), timestamp: new Date() },
      ],
    })),
  dismissNotification: (id: string) =>
    set((state: AppState) => ({
      notifications: state.notifications.filter((n: Notification) => n.id !== id),
    })),

  activeSessionId: null,
  setActiveSessionId: (id: string | null) => set({ activeSessionId: id }),

  researchOptions: {
    model: 'deepseek-chat',
    maxSearchRounds: 5,
    outputFormat: 'markdown',
  },
  setResearchOptions: (options: Partial<ResearchOptions>) =>
    set((state: AppState) => ({
      researchOptions: { ...state.researchOptions, ...options },
    })),

  isSidebarOpen: true,
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
}));
