import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import AgentPipeline from '@/components/AgentPipeline';
import LogStream from '@/components/LogStream';
import { subscribeToSession } from '@/api/client';
import type { LogEntry, ResearchSession } from '@/types';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function NewResearch() {
  const {
    createResearchSession,
    updateSession,
    setActiveSessionId,
    researchOptions,
    setResearchOptions,
    steerSession,
    loadSessions,
  } = useStore();
  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [steering, setSteering] = useState('');
  const [isSteering, setIsSteering] = useState(false);
  const [startMessage, setStartMessage] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const sessions = useStore((state) => state.sessions);
  const existingThreadIds = Array.from(
    new Set(sessions.map((session) => session.threadId).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!currentSession) return undefined;

    return subscribeToSession(currentSession.id, {
      onPhase: (phase) => updateSession(currentSession.id, { phase: phase as ResearchSession['phase'] }),
      onProgress: (progress) => updateSession(currentSession.id, { progress }),
      onBudget: (payload) =>
        updateSession(currentSession.id, {
          llmCallsUsed: payload.llm_calls_used,
          maxLlmCalls: payload.max_llm_calls,
        }),
      onLog: (log) => {
        const entry: LogEntry = {
          id: `live-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
          agent: log.agent,
          phase: log.phase as ResearchSession['phase'],
          message: log.message,
        };
        updateSession(currentSession.id, {
          logs: [...(useStore.getState().getSession(currentSession.id)?.logs || []), entry],
        });
      },
      onCompleted: (payload) => {
        updateSession(currentSession.id, {
          status: 'completed',
          phase: 'completed',
          progress: 100,
          sourceCount: payload.source_count,
          wordCount: payload.word_count,
          duration: payload.duration,
        });
        loadSessions().catch(() => undefined);
      },
      onError: (message) => {
        updateSession(currentSession.id, {
          status: message.toLowerCase().includes('budget') ? 'budget_exhausted' : 'failed',
          phase: 'failed',
        });
      },
      onSteering: () => {
        loadSessions().catch(() => undefined);
      },
    });
  }, [currentSession, loadSessions, updateSession]);

  const handleSubmit = async () => {
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStartError(null);
    setStartMessage('Creating research session...');
    try {
      const session = await createResearchSession({
        query: query.trim(),
        threadId: threadId.trim() || undefined,
        model: researchOptions.model,
        maxLlmCalls: researchOptions.maxLlmCalls,
      });
      setActiveSessionId(session.id);
      setCurrentSession(session);
      setStartMessage('Research session started. Live progress will appear here.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start research session.';
      setStartError(message);
      setStartMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSteer = async () => {
    if (!currentSession || !steering.trim() || isSteering) return;
    setIsSteering(true);
    try {
      await steerSession(currentSession.id, steering.trim());
      setSteering('');
    } finally {
      setIsSteering(false);
    }
  };

  if (currentSession) {
    const liveSession = sessions.find((session) => session.id === currentSession.id) || currentSession;
    const budgetPct = Math.min(100, Math.round((liveSession.llmCallsUsed / liveSession.maxLlmCalls) * 100));

    return (
      <div className="space-y-6">
        <div className="bg-da-surface border border-da-border-color rounded-[10px] p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-da-text truncate">{liveSession.query}</p>
            <p className="text-xs text-da-text-secondary mt-0.5">
              Thread: {liveSession.threadId} · Model: {liveSession.model || researchOptions.model}
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentSession(null);
              setQuery('');
              setThreadId('');
            }}
            className="text-sm text-da-text-secondary hover:text-da-text px-3 py-1.5 rounded-md hover:bg-da-surface-elevated transition-colors"
          >
            New Query
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-da-text-secondary">Agent Activity Log</h3>
              {liveSession.status === 'running' && (
                <span className="text-xs text-da-orange animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-da-orange rounded-full" />
                  Live
                </span>
              )}
            </div>
            <LogStream logs={liveSession.logs} maxHeight="520px" expanded />

            {liveSession.status === 'running' && (
              <div className="bg-da-surface border border-da-border-color rounded-[10px] p-4">
                <label className="block text-sm font-medium text-da-text mb-2">Steer this run</label>
                <div className="flex gap-2">
                  <textarea
                    value={steering}
                    onChange={(e) => setSteering(e.target.value)}
                    rows={2}
                    placeholder="Add guidance for the next safe checkpoint..."
                    className="flex-1 px-3 py-2 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange resize-none"
                  />
                  <button
                    onClick={handleSteer}
                    disabled={!steering.trim() || isSteering}
                    className="w-11 rounded-lg bg-da-orange text-white flex items-center justify-center disabled:opacity-50"
                  >
                    {isSteering ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-da-surface border border-da-border-color rounded-[10px] p-6">
              <AgentPipeline activePhase={liveSession.phase} progress={liveSession.progress} />
            </div>

            <div className="bg-da-surface border border-da-border-color rounded-[10px] p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-da-text-secondary">LLM calls</span>
                <span className="font-medium text-da-text">
                  {liveSession.llmCallsUsed}/{liveSession.maxLlmCalls}
                </span>
              </div>
              <div className="h-2 bg-da-surface-elevated rounded-full overflow-hidden">
                <div className="h-full bg-da-orange rounded-full" style={{ width: `${budgetPct}%` }} />
              </div>
              {liveSession.steeringInstructions.length > 0 && (
                <div className="pt-3 border-t border-da-border-color space-y-2">
                  <p className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider">Steering</p>
                  {liveSession.steeringInstructions.slice(-3).map((instruction) => (
                    <p key={instruction.id} className="text-xs text-da-text-secondary">
                      {instruction.consumed ? 'Consumed' : 'Queued'}: {instruction.message}
                    </p>
                  ))}
                </div>
              )}
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
          Describe what you want to investigate. The agent will plan, research, and synthesize a report.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-da-text mb-2">
            Thread ID <span className="text-da-text-secondary font-normal">(optional)</span>
          </label>
          <input
            list="existing-thread-ids"
            type="text"
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            placeholder={existingThreadIds.length > 0 ? 'Select or type a thread ID' : 'e.g., browser-agent-research'}
            className="w-full h-12 px-4 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange focus:ring-2 focus:ring-da-orange/20 transition-all"
          />
          <datalist id="existing-thread-ids">
            {existingThreadIds.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          {existingThreadIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {existingThreadIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThreadId(id)}
                  className="max-w-full truncate rounded-md bg-da-surface-elevated px-2.5 py-1 text-xs text-da-text-secondary hover:bg-da-orange/10 hover:text-da-orange"
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-da-text mb-2">Research Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research the current state of open-source browser agents and compare their capabilities, limitations, and real-world use cases."
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange focus:ring-2 focus:ring-da-orange/20 transition-all resize-none"
          />
          <p className="text-xs text-da-text-secondary mt-1.5 text-right">{query.length} / 2000</p>
        </div>

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
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-da-text mb-2">Model</label>
                    <select
                      value={researchOptions.model}
                      onChange={(e) => setResearchOptions({ model: e.target.value })}
                      className="w-full h-10 px-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
                    >
                      <option value="deepseek-chat">deepseek-chat</option>
                      <option value="deepseek-reasoner">deepseek-reasoner</option>
                      <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-da-text mb-2">Max LLM Calls</label>
                    <input
                      type="number"
                      value={researchOptions.maxLlmCalls}
                      onChange={(e) => setResearchOptions({ maxLlmCalls: Math.max(1, parseInt(e.target.value) || 1) })}
                      min={1}
                      max={500}
                      className="w-full h-10 px-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isSubmitting}
          className="w-full h-13 bg-da-orange text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Starting Agent...
            </>
          ) : (
            <>
              Start Research
              <ArrowRight size={16} />
            </>
          )}
        </button>
        {(startMessage || startError) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              startError
                ? 'border-da-error/30 bg-da-error/5 text-da-error'
                : 'border-da-orange/30 bg-da-orange/5 text-da-orange'
            }`}
          >
            {startError || startMessage}
          </div>
        )}
      </div>
    </div>
  );
}
