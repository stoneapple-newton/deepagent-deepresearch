import { useRef, useEffect } from 'react';
import type { LogEntry } from '@/types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface LogStreamProps {
  logs: LogEntry[];
  maxHeight?: string;
  expanded?: boolean;
}

export default function LogStream({ logs, maxHeight = '400px', expanded = false }: LogStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const displayLogs = expanded ? logs : logs.slice(-5);

  return (
    <div
      ref={scrollRef}
      className="log-stream bg-da-dark rounded-[10px] overflow-y-auto font-mono text-[13px]"
      style={{ maxHeight: expanded ? 'none' : maxHeight, height: expanded ? '100%' : undefined }}
    >
      <div className="p-4 space-y-1">
        <AnimatePresence initial={false}>
          {displayLogs.length === 0 ? (
            <p className="text-da-text-secondary/30 italic text-xs">No logs yet...</p>
          ) : (
            displayLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-2 leading-relaxed"
              >
                <span className="text-da-text-secondary/40 flex-shrink-0">
                  [{format(log.timestamp, 'HH:mm:ss')}]
                </span>
                <span className="text-da-orange flex-shrink-0">[{log.agent}]</span>
                <span className="text-[#a0a0a0]">{log.message}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
