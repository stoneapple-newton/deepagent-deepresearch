import { useStore } from '@/store/useStore';
import type { ResearchSession } from '@/types';
import { CheckCircle, AlertCircle, Clock, Loader2, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  session: ResearchSession;
  expanded?: boolean;
  onView?: (id: string) => void;
}

const statusConfig = {
  running: { icon: Loader2, color: 'text-da-orange', bg: 'bg-da-orange/10', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-da-success', bg: 'bg-da-success/10', label: 'Completed' },
  failed: { icon: AlertCircle, color: 'text-da-error', bg: 'bg-da-error/10', label: 'Failed' },
  budget_exhausted: { icon: AlertCircle, color: 'text-da-warning', bg: 'bg-da-warning/10', label: 'Budget Exhausted' },
  pending: { icon: Clock, color: 'text-da-warning', bg: 'bg-da-warning/10', label: 'Pending' },
};

export default function SessionCard({ session, expanded = false, onView }: SessionCardProps) {
  const { setActiveSessionId, setCurrentPage, removeSession } = useStore();
  const status = statusConfig[session.status];
  const StatusIcon = status.icon;

  const handleClick = () => {
    setActiveSessionId(session.id);
    setCurrentPage('sessions');
    onView?.(session.id);
  };

  return (
    <div
      className="bg-da-surface border border-da-border-color rounded-[10px] p-5 cursor-pointer transition-all duration-150 hover:shadow-card hover:border-da-orange/40 group"
      onClick={handleClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn('flex items-center gap-2 px-2 py-1 rounded-md', status.bg)}>
          <StatusIcon size={14} className={cn(status.color, session.status === 'running' && 'animate-spin-slow')} />
          <span className={cn('text-xs font-medium', status.color)}>{status.label}</span>
        </div>
        <span className="text-xs text-da-text-secondary/60">
          {formatDistanceToNow(session.createdAt, { addSuffix: true })}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-da-text mb-2 line-clamp-1 group-hover:text-da-orange transition-colors">
        {session.query}
      </h3>

      {/* Progress or metadata */}
      {session.status === 'running' ? (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-da-text-secondary capitalize">{session.phase}...</span>
            <span className="text-da-orange font-medium">{session.progress}%</span>
          </div>
          <div className="h-1.5 bg-da-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-da-orange rounded-full transition-all duration-500"
              style={{ width: `${session.progress}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-da-text-secondary line-clamp-2 mb-3">
          {session.report ? session.report.substring(0, 120) + '...' : 'No report generated'}
        </p>
      )}

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Tags */}
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {session.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 bg-da-surface-elevated text-da-text-secondary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Phase breakdown */}
          {session.phaseTimes && (
            <div className="flex items-center gap-1 mb-3 h-1">
              {Object.entries(session.phaseTimes)
                .filter(([_, time]) => time > 0)
                .map(([phase, time]) => {
                  const total = Object.values(session.phaseTimes || {}).reduce((a, b) => a + b, 0);
                  const width = total > 0 ? (time / total) * 100 : 0;
                  const phaseColors: Record<string, string> = {
                    planning: 'bg-da-info',
                    researching: 'bg-da-orange',
                    auditing: 'bg-da-warning',
                    writing: 'bg-da-success',
                    checking: 'bg-da-text-secondary',
                  };
                  return (
                    <div
                      key={phase}
                      className={cn('h-full rounded-full', phaseColors[phase] || 'bg-da-border-color')}
                      style={{ width: `${width}%` }}
                      title={`${phase}: ${Math.round(time)}s`}
                    />
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-3 border-t border-da-border-color/50">
        <div className="flex items-center gap-4 text-xs text-da-text-secondary">
          {session.sourceCount !== undefined && (
            <span>{session.sourceCount} sources</span>
          )}
          {session.wordCount !== undefined && (
            <span>{session.wordCount.toLocaleString()} words</span>
          )}
          {session.duration !== undefined && (
            <span>{Math.round(session.duration / 60)}m</span>
          )}
          <span>{session.llmCallsUsed}/{session.maxLlmCalls} calls</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeSession(session.id);
            }}
            className="p-1.5 rounded-md hover:bg-da-error/10 text-da-text-secondary hover:text-da-error transition-colors"
          >
            <X size={14} />
          </button>
          <ArrowRight size={14} className="text-da-text-secondary group-hover:text-da-orange transition-colors" />
        </div>
      </div>
    </div>
  );
}
