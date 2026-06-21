import { useState } from 'react';
import { useStore } from '@/store/useStore';
import SessionCard from '@/components/SessionCard';
import ReportViewer from '@/components/ReportViewer';
import LogStream from '@/components/LogStream';
import AgentPipeline from '@/components/AgentPipeline';
import type { SessionStatus } from '@/types';
import { Search, RefreshCw, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const filters: { label: string; value: SessionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Most Sources', value: 'sources' },
];

export default function Sessions() {
  const { sessions, getSession } = useStore();
  const [filter, setFilter] = useState<SessionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<string | null>(null);

  const filtered = sessions
    .filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (searchQuery && !s.query.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.getTime() - a.createdAt.getTime();
      if (sortBy === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
      if (sortBy === 'sources') return (b.sourceCount || 0) - (a.sourceCount || 0);
      return 0;
    });

  const selectedSession = detailSession ? getSession(detailSession) : null;
  const reportSession = viewingReport ? getSession(viewingReport) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-da-text">Research Sessions</h1>
          <span className="text-xs font-medium bg-da-surface-elevated text-da-text-secondary px-2.5 py-1 rounded-full">
            {sessions.length} total
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-da-text-secondary/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="h-9 pl-9 pr-4 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange w-52"
            />
          </div>
          <button className="w-9 h-9 rounded-lg bg-da-surface border border-da-border-color flex items-center justify-center hover:bg-da-surface-elevated transition-colors">
            <RefreshCw size={14} className="text-da-text-secondary" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                filter === f.value
                  ? 'bg-da-orange text-white'
                  : 'bg-da-surface-elevated text-da-text-secondary hover:text-da-text'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-9 px-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Sessions Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search size={64} className="mx-auto text-da-text-secondary/20 mb-4" />
          <h3 className="text-lg font-medium text-da-text-secondary mb-1">No sessions found</h3>
          <p className="text-sm text-da-text-secondary/60">Start a new research query to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              expanded
              onView={(id: string) => {
                const s = getSession(id);
                if (s?.status === 'completed' && s.report) {
                  setViewingReport(id);
                } else {
                  setDetailSession(id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-da-surface rounded-[10px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-da-border-color flex items-center justify-between px-6 flex-shrink-0">
              <h2 className="text-lg font-semibold text-da-text truncate pr-4">{selectedSession.query}</h2>
              <button
                onClick={() => setDetailSession(null)}
                className="w-8 h-8 rounded-lg hover:bg-da-surface-elevated flex items-center justify-center flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left: Metadata */}
              <div className="lg:w-2/5 border-r border-da-border-color overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-da-text-secondary w-20">ID:</span>
                      <span className="text-sm text-da-text font-mono">{selectedSession.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-da-text-secondary w-20">Thread:</span>
                      <span className="text-sm text-da-text font-mono">{selectedSession.threadId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-da-text-secondary w-20">Created:</span>
                      <span className="text-sm text-da-text">{format(selectedSession.createdAt, 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    {selectedSession.completedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-da-text-secondary w-20">Completed:</span>
                        <span className="text-sm text-da-text">{format(selectedSession.completedAt, 'MMM d, yyyy HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pipeline Timeline */}
                <div>
                  <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">Pipeline</h3>
                  <AgentPipeline activePhase={selectedSession.phase} compact />
                </div>

                {/* Tags */}
                {selectedSession.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSession.tags.map((tag: string) => (
                        <span key={tag} className="text-xs px-2 py-1 bg-da-surface-elevated text-da-text-secondary rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedSession.status === 'completed' && selectedSession.report && (
                  <button
                    onClick={() => {
                      setDetailSession(null);
                      setViewingReport(selectedSession.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-da-orange text-white py-2.5 rounded-md text-sm font-medium hover:shadow-glow transition-all"
                  >
                    <FileText size={16} />
                    View Report
                  </button>
                )}
              </div>

              {/* Right: Logs or Report */}
              <div className="lg:w-3/5 overflow-hidden">
                {selectedSession.status === 'completed' && selectedSession.report ? (
                  <div className="h-full overflow-y-auto p-6">
                    <div className="whitespace-pre-wrap font-body text-sm text-da-text">
                      {selectedSession.report.substring(0, 2000)}...
                    </div>
                  </div>
                ) : (
                  <LogStream logs={selectedSession.logs} expanded />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Viewer */}
      {reportSession && (
        <ReportViewer
          session={reportSession}
          onClose={() => setViewingReport(null)}
        />
      )}
    </div>
  );
}
