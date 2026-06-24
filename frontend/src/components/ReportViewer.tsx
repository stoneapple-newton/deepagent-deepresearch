import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Download, ChevronLeft, ChevronRight, X, Menu, GitBranch } from 'lucide-react';
import type { ResearchSession } from '@/types';
import { cn } from '@/lib/utils';

interface ReportViewerProps {
  session: ResearchSession;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function ReportViewer({ session, onClose, onPrev, onNext }: ReportViewerProps) {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [headings, setHeadings] = useState<{ level: number; text: string; id: string }[]>([]);
  const [activeHeading, setActiveHeading] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session.report && contentRef.current) {
      const elements = contentRef.current.querySelectorAll('h2, h3');
      const extracted = Array.from(elements).map((el, i) => ({
        level: el.tagName === 'H2' ? 2 : 3,
        text: el.textContent || '',
        id: `heading-${i}`,
      }));
      setHeadings(extracted);
      elements.forEach((el, i) => el.setAttribute('id', `heading-${i}`));
    }
  }, [session.report]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const elements = contentRef.current.querySelectorAll('h2, h3');
      for (let i = elements.length - 1; i >= 0; i--) {
        const rect = elements[i].getBoundingClientRect();
        if (rect.top <= 200) {
          setActiveHeading(`heading-${i}`);
          break;
        }
      }
    };
    const el = contentRef.current;
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopy = () => {
    if (session.report) {
      navigator.clipboard.writeText(session.report);
    }
  };

  const handleDownload = () => {
    if (session.report) {
      const blob = new Blob([session.report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${session.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el && contentRef.current) {
      const top = el.offsetTop - 20;
      contentRef.current.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-da-surface">
      {/* Toolbar */}
      <div className="h-12 bg-da-surface border-b border-da-border-color flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-da-surface-elevated rounded-lg transition-colors">
            <X size={16} />
          </button>
          <button
            onClick={() => setOutlineOpen(!outlineOpen)}
            className={cn('p-2 rounded-lg transition-colors', outlineOpen ? 'bg-da-orange/10 text-da-orange' : 'hover:bg-da-surface-elevated')}
          >
            <Menu size={16} />
          </button>
          <h2 className="text-sm font-medium text-da-text truncate max-w-md hidden sm:block">
            {session.query}
          </h2>
          {session.wordCount && (
            <span className="text-xs text-da-text-secondary bg-da-surface-elevated px-2 py-0.5 rounded-full">
              {session.wordCount.toLocaleString()} words
            </span>
          )}
          <span className="hidden md:flex min-w-0 items-center gap-1.5 text-xs text-da-text-secondary bg-da-surface-elevated px-2 py-0.5 rounded-full">
            <GitBranch size={12} className="flex-shrink-0" />
            <span className="truncate max-w-48">Report thread: {session.threadId}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onPrev && (
            <button onClick={onPrev} className="p-2 hover:bg-da-surface-elevated rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
          {onNext && (
            <button onClick={onNext} className="p-2 hover:bg-da-surface-elevated rounded-lg transition-colors">
              <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="hidden sm:flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-da-text-secondary hover:text-da-text hover:bg-da-surface-elevated rounded-md transition-colors"
          >
            <Copy size={14} />
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="hidden sm:flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-da-text-secondary hover:text-da-text hover:bg-da-surface-elevated rounded-md transition-colors"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Outline panel */}
        {outlineOpen && (
          <div className="w-64 bg-da-surface-elevated border-r border-da-border-color overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-da-text-secondary uppercase tracking-wider mb-3">
                Outline
              </h3>
              <nav className="space-y-1">
                {headings.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => scrollToHeading(h.id)}
                    className={cn(
                      'w-full text-left text-sm px-2 py-1 rounded-md transition-colors',
                      h.level === 2 ? 'font-medium' : 'pl-4 text-da-text-secondary',
                      activeHeading === h.id ? 'bg-da-orange/10 text-da-orange' : 'hover:bg-da-surface'
                    )}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Report content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            {session.report ? (
              <div className="report-content">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {session.report}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-da-text-secondary">No report available for this session.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
