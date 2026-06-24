import { useState } from 'react';
import { useStore } from '@/store/useStore';
import ReportViewer from '@/components/ReportViewer';
import type { ResearchSession } from '@/types';
import { Search, FileText, Calendar, BookOpen, GitBranch } from 'lucide-react';
import { format } from 'date-fns';

const categories = ['All Topics', 'Technology', 'Science', 'Business', 'Society'];
const dateRanges = ['All Time', 'Last 7 Days', 'Last 30 Days'];

export default function Reports() {
  const { sessions, getSession } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Topics');
  const [dateRange, setDateRange] = useState('All Time');
  const [viewingReport, setViewingReport] = useState<string | null>(null);

  const completedSessions = sessions.filter((s) => s.status === 'completed' && s.report);

  const filtered = completedSessions.filter((s) => {
    if (searchQuery && !s.query.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory !== 'All Topics') {
      const topicMatch = s.tags.some((t: string) => t.toLowerCase().includes(selectedCategory.toLowerCase()));
      if (!topicMatch) return false;
    }
    if (dateRange !== 'All Time') {
      const days = dateRange === 'Last 7 Days' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 86400000);
      if (s.completedAt && s.completedAt < cutoff) return false;
    }
    return true;
  });

  const allTags = Array.from(new Set(completedSessions.flatMap((s) => s.tags)));

  const reportSession = viewingReport ? getSession(viewingReport) : null;

  const getCurrentIndex = () => {
    if (!viewingReport) return -1;
    return filtered.findIndex((s) => s.id === viewingReport);
  };

  const handlePrev = () => {
    const idx = getCurrentIndex();
    if (idx > 0) setViewingReport(filtered[idx - 1].id);
  };

  const handleNext = () => {
    const idx = getCurrentIndex();
    if (idx < filtered.length - 1) setViewingReport(filtered[idx + 1].id);
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters */}
      <aside className="w-64 flex-shrink-0 space-y-6 hidden lg:block">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-da-text-secondary/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full h-10 pl-9 pr-4 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange"
          />
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">Category</h3>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedCategory === cat
                    ? 'bg-da-orange/10 text-da-orange font-medium'
                    : 'text-da-text-secondary hover:bg-da-surface-elevated hover:text-da-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">Date Range</h3>
          <div className="space-y-1">
            {dateRanges.map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  dateRange === range
                    ? 'bg-da-orange/10 text-da-orange font-medium'
                    : 'text-da-text-secondary hover:bg-da-surface-elevated hover:text-da-text'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-da-surface-elevated text-da-text-secondary rounded-full cursor-pointer hover:bg-da-orange/10 hover:text-da-orange transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-da-text">Reports Library</h1>
          <span className="text-sm text-da-text-secondary">{filtered.length} reports</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={64} className="mx-auto text-da-text-secondary/20 mb-4" />
            <h3 className="text-lg font-medium text-da-text-secondary mb-1">No reports found</h3>
            <p className="text-sm text-da-text-secondary/60">Complete a research session to generate a report.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((session: ResearchSession) => (
              <button
                key={session.id}
                onClick={() => setViewingReport(session.id)}
                className="bg-da-surface border border-da-border-color rounded-[10px] p-5 text-left hover:shadow-card hover:border-da-orange/40 transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-da-orange" />
                    <span className="text-xs text-da-text-secondary">{session.sourceCount} sources</span>
                  </div>
                  <span className="text-xs text-da-text-secondary/60">
                    {session.completedAt ? format(session.completedAt, 'MMM d') : ''}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-da-text mb-2 line-clamp-2 group-hover:text-da-orange transition-colors">
                  {session.query}
                </h3>
                <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-md bg-da-surface-elevated px-2 py-1 text-xs text-da-text-secondary">
                  <GitBranch size={12} className="flex-shrink-0" />
                  <span className="truncate">Report thread: {session.threadId}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-da-text-secondary">
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} />
                    {session.wordCount?.toLocaleString() || 0} words
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {session.duration ? `${Math.round(session.duration / 60)}m` : 'N/A'}
                  </span>
                </div>

                {session.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {session.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 bg-da-surface-elevated text-da-text-secondary rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report Viewer */}
      {reportSession && (
        <ReportViewer
          session={reportSession}
          onClose={() => setViewingReport(null)}
          onPrev={getCurrentIndex() > 0 ? handlePrev : undefined}
          onNext={getCurrentIndex() < filtered.length - 1 ? handleNext : undefined}
        />
      )}
    </div>
  );
}
