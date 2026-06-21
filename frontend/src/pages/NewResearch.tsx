import { useState } from 'react';
import { useStore } from '@/store/useStore';
import AgentPipeline from '@/components/AgentPipeline';
import LogStream from '@/components/LogStream';
import type { ResearchSession, LogEntry, ResearchPhase } from '@/types';
import { ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES: ResearchPhase[] = ['planning', 'researching', 'auditing', 'writing', 'checking', 'completed'];

const MOCK_LOGS: Record<string, string[]> = {
  planning: [
    'Analyzing research query and decomposing into sub-questions...',
    'Generated 5 sub-questions for investigation',
    'Planning phase complete. Handing off to researcher.',
  ],
  researching: [
    'Searching for primary sources and recent publications...',
    'Found 15 relevant sources. Processing key findings...',
    'Extracting structured data from academic papers...',
    'Cross-referencing facts across multiple sources...',
    'Searching for comparative analysis data...',
    'Found 12 additional authoritative sources.',
    'Processing technical documentation...',
  ],
  auditing: [
    'Reviewing source credibility and publisher reputation...',
    'Checking publication dates for freshness...',
    'Identifying potential bias in 2 sources...',
    'Verifying factual claims against primary data...',
    'Source audit complete. 22 of 24 sources approved.',
  ],
  writing: [
    'Synthesizing findings into structured report...',
    'Writing executive summary...',
    'Creating comparison tables...',
    'Drafting methodology section...',
    'Composing conclusion and recommendations...',
    'Report draft complete. Sending for quality check.',
  ],
  checking: [
    'Evaluating report completeness against original query...',
    'Verifying factual accuracy of all claims...',
    'Checking structure and readability...',
    'Assessing objectivity and tone balance...',
    'Quality check passed. Report finalized.',
  ],
};

export default function NewResearch() {
  const { addSession, updateSession, setActiveSessionId, researchOptions, setResearchOptions } = useStore();
  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('planning');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const simulateResearch = async (session: ResearchSession) => {
    let logId = 0;
    const allLogs: LogEntry[] = [];

    for (let i = 0; i < PHASES.length - 1; i++) {
      const phase = PHASES[i];
      setCurrentPhase(phase);
      updateSession(session.id, { phase, progress: Math.round((i / (PHASES.length - 1)) * 100) });
      setProgress(Math.round((i / (PHASES.length - 1)) * 100));

      const phaseLogs = MOCK_LOGS[phase] || [`Starting ${phase} phase...`];
      for (const message of phaseLogs) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
        const entry: LogEntry = {
          id: `log-${++logId}`,
          timestamp: new Date(),
          agent: phase === 'planning' ? 'planner' : phase === 'researching' ? 'web_researcher' : phase === 'auditing' ? 'source_auditor' : phase === 'writing' ? 'report_writer' : 'quality_checker',
          phase,
          message,
        };
        allLogs.push(entry);
        setLogs([...allLogs]);
        updateSession(session.id, { logs: [...allLogs] });
      }
    }

    // Complete
    await new Promise((r) => setTimeout(r, 500));
    setCurrentPhase('completed');
    setProgress(100);
    updateSession(session.id, {
      status: 'completed',
      phase: 'completed',
      progress: 100,
      completedAt: new Date(),
      sourceCount: 22 + Math.floor(Math.random() * 10),
      wordCount: 2500 + Math.floor(Math.random() * 2000),
      duration: 1200 + Math.floor(Math.random() * 1800),
      logs: allLogs,
      phaseTimes: {
        planning: 120,
        researching: 600,
        auditing: 300,
        writing: 500,
        checking: 200,
        completed: 0,
        failed: 0,
      },
    });
  };

  const handleSubmit = async () => {
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const session: ResearchSession = {
      id: `sess-${Date.now()}`,
      threadId: threadId.trim() || `research-${Date.now()}`,
      query: query.trim(),
      status: 'running',
      phase: 'planning',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: [],
      tags: [],
    };

    addSession(session);
    setActiveSessionId(session.id);
    setCurrentSession(session);
    setSubmitted(true);
    setIsSubmitting(false);
    setLogs([]);

    // Start simulation
    simulateResearch(session);
  };

  if (submitted && currentSession) {
    return (
      <div className="space-y-6">
        {/* Summary bar */}
        <div className="bg-da-surface border border-da-border-color rounded-[10px] p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-da-text truncate">{currentSession.query}</p>
            <p className="text-xs text-da-text-secondary mt-0.5">
              Thread: {currentSession.threadId} · Model: {researchOptions.model}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubmitted(false);
                setCurrentSession(null);
                setQuery('');
                setThreadId('');
                setLogs([]);
                setProgress(0);
              }}
              className="text-sm text-da-text-secondary hover:text-da-text px-3 py-1.5 rounded-md hover:bg-da-surface-elevated transition-colors"
            >
              New Query
            </button>
          </div>
        </div>

        {/* Monitor layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Log Stream */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-da-text-secondary">Agent Activity Log</h3>
              <span className="text-xs text-da-orange animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-da-orange rounded-full" />
                Live
              </span>
            </div>
            <LogStream logs={logs} maxHeight="600px" expanded />
          </div>

          {/* Progress */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-da-surface border border-da-border-color rounded-[10px] p-6">
              <AgentPipeline activePhase={currentPhase} progress={progress} />
            </div>

            {/* Phase status list */}
            <div className="bg-da-surface border border-da-border-color rounded-[10px] p-4 space-y-3">
              {PHASES.slice(0, -1).map((phase, idx) => {
                const isActive = phase === currentPhase;
                const isCompleted = PHASES.indexOf(currentPhase) > idx;
                const phaseNames: Record<string, string> = {
                  planning: 'Planning research scope...',
                  researching: 'Gathering sources...',
                  auditing: 'Verifying credibility...',
                  writing: 'Synthesizing report...',
                  checking: 'Quality assurance...',
                };
                return (
                  <div key={phase} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? 'bg-da-success/10 text-da-success'
                          : isActive
                          ? 'bg-da-orange/10 text-da-orange'
                          : 'bg-da-surface-elevated text-da-text-secondary/30'
                      }`}
                    >
                      {isCompleted ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-[10px]">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive ? 'text-da-orange font-medium' : isCompleted ? 'text-da-success' : 'text-da-text-secondary/40'
                      }`}
                    >
                      {phaseNames[phase]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-12 pb-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl text-da-text mb-3">New Research</h1>
        <p className="text-da-text-secondary text-base max-w-md mx-auto">
          Describe what you want to investigate. The agent will plan, research, and synthesize a comprehensive report.
        </p>
      </div>

      <div className="space-y-6">
        {/* Thread ID */}
        <div>
          <label className="block text-sm font-medium text-da-text mb-2">
            Thread ID <span className="text-da-text-secondary font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            placeholder="e.g., browser-agent-research"
            className="w-full h-12 px-4 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange focus:ring-2 focus:ring-da-orange/20 transition-all"
          />
          <p className="text-xs text-da-text-secondary mt-1.5">
            Use a stable thread ID to continue previous research context.
          </p>
        </div>

        {/* Research Query */}
        <div>
          <label className="block text-sm font-medium text-da-text mb-2">Research Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research the current state of open-source browser agents and write a report comparing their capabilities, limitations, and real-world use cases."
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange focus:ring-2 focus:ring-da-orange/20 transition-all resize-none"
          />
          <p className="text-xs text-da-text-secondary mt-1.5 text-right">
            {query.length} / 2000
          </p>
        </div>

        {/* Advanced Options */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-da-text-secondary hover:text-da-text transition-colors"
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Advanced Options
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-da-text mb-2">Model</label>
                      <select
                        value={researchOptions.model}
                        onChange={(e) => setResearchOptions({ model: e.target.value })}
                        className="w-full h-10 px-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
                      >
                        <option value="deepseek-chat">deepseek-chat</option>
                        <option value="deepseek-reasoner">deepseek-reasoner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-da-text mb-2">Max Search Rounds</label>
                      <input
                        type="number"
                        value={researchOptions.maxSearchRounds}
                        onChange={(e) => setResearchOptions({ maxSearchRounds: parseInt(e.target.value) || 5 })}
                        min={1}
                        max={20}
                        className="w-full h-10 px-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-da-text mb-2">Output Format</label>
                    <div className="flex gap-3">
                      {(['markdown', 'json'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setResearchOptions({ outputFormat: fmt })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            researchOptions.outputFormat === fmt
                              ? 'bg-da-orange text-white'
                              : 'bg-da-surface-elevated text-da-text-secondary hover:text-da-text'
                          }`}
                        >
                          {fmt === 'markdown' ? 'Markdown Report' : 'Structured JSON'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isSubmitting}
          className="w-full h-13 bg-da-orange text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Initializing Agent...
            </>
          ) : (
            <>
              Start Research
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
