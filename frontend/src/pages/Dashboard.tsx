import { useStore } from '@/store/useStore';
import SessionCard from '@/components/SessionCard';
import AgentPipeline from '@/components/AgentPipeline';
import LogStream from '@/components/LogStream';
import {
  LayoutDashboard,
  FileText,
  Database,
  Clock,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { sessions, setCurrentPage } = useStore();

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const runningSessions = sessions.filter((s) => s.status === 'running');
  const totalSources = completedSessions.reduce((sum, s) => sum + (s.sourceCount || 0), 0);
  const avgSources = completedSessions.length > 0 ? Math.round(totalSources / completedSessions.length) : 0;

  const stats = [
    { label: 'Running Now', value: runningSessions.length.toString(), icon: LayoutDashboard },
    { label: 'Reports Generated', value: completedSessions.length.toString(), icon: FileText },
    { label: 'Avg. Sources', value: avgSources.toString(), icon: Database },
    { label: 'System Status', value: 'Online', icon: Clock },
  ];

  const recentSessions = sessions.slice(0, 4);
  const activeSession = runningSessions[0];

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <section className="relative bg-da-bg rounded-[10px] overflow-hidden" style={{ minHeight: 280 }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at top right, rgba(217, 93, 0, 0.12) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 px-8 py-12 lg:py-0 lg:px-12 h-full min-h-[280px]">
          <div className="max-w-lg space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-5xl lg:text-6xl text-da-text leading-tight"
            >
              <span className="text-da-orange">Research</span> at Scale
            </motion.h1>
            <p className="text-base text-da-text-secondary max-w-md leading-relaxed">
              Orchestrate autonomous deep-research agents. Plan, search, audit, and synthesize — all in one scientific workspace.
            </p>
            <button
              onClick={() => setCurrentPage('new-research')}
              className="inline-flex items-center gap-2 bg-da-orange text-white px-5 py-2.5 rounded-md text-sm font-medium hover:shadow-glow transition-all duration-200"
            >
              <PlusCircle size={16} />
              Start New Research
            </button>
          </div>
          <div className="hidden lg:block flex-shrink-0">
            <img
              src="/assets/hero-network.jpg"
              alt="Agent Network"
              className="w-80 h-auto rounded-xl opacity-80"
            />
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-da-surface border border-da-border-color rounded-[10px] p-5 relative"
            >
              <Icon size={16} className="absolute top-4 right-4 text-da-text-secondary/40" />
              <p className="text-3xl font-display text-da-text">{stat.value}</p>
              <p className="text-xs text-da-text-secondary mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-da-text">Recent Sessions</h2>
            <button
              onClick={() => setCurrentPage('sessions')}
              className="text-sm text-da-orange hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid gap-4">
            {recentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>

        {/* Live Status */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-da-text">Agent Orchestration</h2>

          {/* Pipeline */}
          <div className="bg-da-surface border border-da-border-color rounded-[10px] p-5">
            <AgentPipeline
              activePhase={activeSession?.phase || 'planning'}
              progress={activeSession?.progress}
            />
          </div>

          {/* Log Stream */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-da-text-secondary">Live Logs</h3>
              {activeSession && (
                <span className="text-xs text-da-orange animate-pulse">● Live</span>
              )}
            </div>
            <LogStream logs={activeSession?.logs || []} maxHeight="200px" />
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="bg-da-dark rounded-[10px] px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-da-inverse">Ready to explore?</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('new-research')}
            className="bg-da-orange text-white px-5 py-2.5 rounded-md text-sm font-medium hover:shadow-glow transition-all"
          >
            New Research
          </button>
          <button
            onClick={() => setCurrentPage('reports')}
            className="border border-da-inverse/30 text-da-inverse px-5 py-2.5 rounded-md text-sm font-medium hover:bg-da-inverse/10 transition-all"
          >
            Browse Reports
          </button>
        </div>
      </section>
    </div>
  );
}
