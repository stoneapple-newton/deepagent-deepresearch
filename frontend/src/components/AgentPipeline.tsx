import { useStore } from '@/store/useStore';
import type { ResearchPhase } from '@/types';
import {
  LayoutTemplate,
  Globe,
  ShieldCheck,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const phases: { key: ResearchPhase; label: string; icon: typeof LayoutTemplate }[] = [
  { key: 'planning', label: 'Planner', icon: LayoutTemplate },
  { key: 'researching', label: 'Researcher', icon: Globe },
  { key: 'auditing', label: 'Auditor', icon: ShieldCheck },
  { key: 'writing', label: 'Writer', icon: FileText },
  { key: 'checking', label: 'Checker', icon: CheckCircle },
];

interface AgentPipelineProps {
  activePhase: ResearchPhase;
  progress?: number;
  compact?: boolean;
}

export default function AgentPipeline({ activePhase, progress, compact = false }: AgentPipelineProps) {
  const { agents } = useStore();
  const activeIndex = phases.findIndex((p) => p.key === activePhase);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = idx === activeIndex;
          const isCompleted = idx < activeIndex;
          return (
            <div key={phase.key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-300',
                  isActive && 'bg-da-orange/10 text-da-orange',
                  isCompleted && 'text-da-success',
                  !isActive && !isCompleted && 'text-da-text-secondary/40'
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{phase.label}</span>
              </div>
              {idx < phases.length - 1 && (
                <div
                  className={cn(
                    'w-4 h-[2px] transition-colors duration-300',
                    isCompleted ? 'bg-da-success' : 'bg-da-border-color'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Pipeline */}
      <div className="flex items-center justify-between relative">
        {/* Connection line background */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-da-border-color -translate-y-1/2 z-0" />
        {/* Active connection line */}
        <motion.div
          className="absolute top-1/2 left-0 h-[2px] bg-da-orange -translate-y-1/2 z-0"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(0, (activeIndex / (phases.length - 1)) * 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = idx === activeIndex;
          const isCompleted = idx < activeIndex;
          const agent = agents.find((a) => a.id === (phase.key === 'researching' ? 'web_researcher' : phase.key === 'checking' ? 'quality_checker' : phase.key === 'planning' ? 'planner' : phase.key === 'auditing' ? 'source_auditor' : 'report_writer'));
          const agentEnabled = agent?.enabled ?? true;

          return (
            <div key={phase.key} className="relative z-10 flex flex-col items-center gap-2">
              {/* Node */}
              <motion.div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center border-2 bg-da-surface transition-all duration-300',
                  isActive && 'border-da-orange shadow-glow',
                  isCompleted && 'border-da-success',
                  !isActive && !isCompleted && 'border-da-border-color',
                  !agentEnabled && 'opacity-40'
                )}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Icon
                  size={20}
                  className={cn(
                    isActive && 'text-da-orange',
                    isCompleted && 'text-da-success',
                    !isActive && !isCompleted && 'text-da-text-secondary/40'
                  )}
                />
              </motion.div>

              {/* Label */}
              <div className="text-center">
                <p
                  className={cn(
                    'text-xs font-medium',
                    isActive && 'text-da-orange',
                    isCompleted && 'text-da-success',
                    !isActive && !isCompleted && 'text-da-text-secondary/50'
                  )}
                >
                  {phase.label}
                </p>
                {isActive && (
                  <p className="text-[10px] text-da-text-secondary/60 mt-0.5 animate-pulse">
                    Processing...
                  </p>
                )}
                {isCompleted && (
                  <p className="text-[10px] text-da-success/70 mt-0.5">Done</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      {progress !== undefined && (
        <div className="mt-6 flex items-center justify-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#d0d0cc"
                strokeWidth="8"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#d95d00"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                initial={{ strokeDashoffset: `${2 * Math.PI * 52}` }}
                animate={{ strokeDashoffset: `${2 * Math.PI * 52 * (1 - progress / 100)}` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-display text-da-text">{progress}%</span>
              <span className="text-[10px] text-da-text-secondary mt-0.5">Complete</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
