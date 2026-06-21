import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { AgentConfig } from '@/types';
import {
  LayoutTemplate,
  Globe,
  ShieldCheck,
  FileText,
  CheckCircle,
  Power,
  Settings,
  X,
  Save,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, typeof LayoutTemplate> = {
  LayoutTemplate,
  Globe,
  ShieldCheck,
  FileText,
  CheckCircle,
};

export default function Agents() {
  const { agents } = useStore();
  const [editingAgent, setEditingAgent] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-da-text">Agent System</h1>
          <p className="text-sm text-da-text-secondary mt-1">
            Configure and monitor the sub-agent orchestration pipeline
          </p>
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {agents.map((agent) => {
          const Icon = iconMap[agent.icon] || LayoutTemplate;
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              icon={Icon}
              onConfigure={() => setEditingAgent(agent.id)}
            />
          );
        })}
      </div>

      {/* Pipeline Visualization */}
      <div className="bg-da-surface border border-da-border-color rounded-[10px] p-6">
        <h2 className="text-lg font-semibold text-da-text mb-4">Execution Pipeline</h2>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-4">
            {agents.map((agent, idx) => {
              const Icon = iconMap[agent.icon] || LayoutTemplate;
              return (
                <div key={agent.id} className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      agent.enabled
                        ? 'border-da-orange/30 bg-da-orange/5'
                        : 'border-da-border-color/50 bg-da-surface-elevated/50 opacity-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        agent.enabled ? 'bg-da-orange text-white' : 'bg-da-border-color text-da-text-secondary'
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-medium text-da-text">{agent.name}</span>
                    <span className="text-[10px] text-da-text-secondary">{agent.avgExecutionTime}s avg</span>
                  </div>
                  {idx < agents.length - 1 && (
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn('w-6 h-[2px]', agent.enabled && agents[idx + 1]?.enabled ? 'bg-da-orange/40' : 'bg-da-border-color')} />
                      <span className="text-[10px] text-da-text-secondary/40">→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Invocations"
          value={agents.reduce((sum, a) => sum + a.totalInvocations, 0).toString()}
          subtitle="Across all agents"
        />
        <StatCard
          label="Avg. Success Rate"
          value={`${Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length)}%`}
          subtitle="System reliability"
        />
        <StatCard
          label="Active Agents"
          value={`${agents.filter((a) => a.enabled).length}/${agents.length}`}
          subtitle="Enabled in pipeline"
        />
      </div>

      {/* Edit Panel */}
      <AnimatePresence>
        {editingAgent && (
          <AgentEditPanel
            agent={agents.find((a) => a.id === editingAgent)!}
            onClose={() => setEditingAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentCard({
  agent,
  icon: Icon,
  onConfigure,
}: {
  agent: AgentConfig;
  icon: typeof LayoutTemplate;
  onConfigure: () => void;
}) {
  const { updateAgent } = useStore();

  return (
    <div className="bg-da-surface border border-da-border-color rounded-[10px] p-5 hover:shadow-card transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            agent.enabled ? 'bg-da-orange text-white' : 'bg-da-surface-elevated text-da-text-secondary'
          )}
        >
          <Icon size={20} />
        </div>
        <button
          onClick={() => updateAgent(agent.id, { enabled: !agent.enabled })}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            agent.enabled
              ? 'bg-da-success/10 text-da-success hover:bg-da-success/20'
              : 'bg-da-surface-elevated text-da-text-secondary/40 hover:text-da-text-secondary'
          )}
        >
          <Power size={14} />
        </button>
      </div>

      <h3 className="text-base font-semibold text-da-text mb-1">{agent.name}</h3>
      <p className="text-xs text-da-text-secondary line-clamp-2 mb-4">{agent.description}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-da-text-secondary">Avg. Time</span>
          <span className="text-da-text font-medium">{agent.avgExecutionTime}s</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-da-text-secondary">Success Rate</span>
          <span className="text-da-success font-medium">{agent.successRate}%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-da-text-secondary">Invocations</span>
          <span className="text-da-text font-medium">{agent.totalInvocations}</span>
        </div>
      </div>

      <button
        onClick={onConfigure}
        className="w-full flex items-center justify-center gap-2 text-sm text-da-orange hover:bg-da-orange/5 py-2 rounded-md transition-colors"
      >
        <Settings size={14} />
        Configure
      </button>
    </div>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="bg-da-surface border border-da-border-color rounded-[10px] p-5">
      <p className="text-2xl font-display text-da-text">{value}</p>
      <p className="text-sm text-da-text mt-1">{label}</p>
      <p className="text-xs text-da-text-secondary mt-0.5">{subtitle}</p>
    </div>
  );
}

function AgentEditPanel({ agent, onClose }: { agent: AgentConfig; onClose: () => void }) {
  const { updateAgent } = useStore();
  const [form, setForm] = useState({ ...agent });

  const handleSave = () => {
    updateAgent(agent.id, {
      systemPrompt: form.systemPrompt,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
      tools: form.tools,
    });
    onClose();
  };

  const Icon = iconMap[agent.icon] || LayoutTemplate;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-da-surface h-full shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 border-b border-da-border-color flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-da-orange flex items-center justify-center">
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-da-text">{agent.name}</h2>
              <p className="text-xs text-da-text-secondary">Agent Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-da-surface-elevated flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange font-mono leading-relaxed resize-none"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">
              Temperature: {form.temperature}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className="w-full accent-da-orange"
            />
            <div className="flex justify-between text-xs text-da-text-secondary mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Max Tokens</label>
            <input
              type="number"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 2048 })}
              min={256}
              max={32768}
              step={256}
              className="w-full h-10 px-3 bg-da-surface border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
            />
          </div>

          {/* Tools */}
          {agent.tools.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-da-text mb-2">Tool Permissions</label>
              <div className="space-y-2">
                {['internet_search', 'assess_research_report', 'file_read', 'file_write'].map((tool) => (
                  <label key={tool} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.tools.includes(tool)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, tools: [...form.tools, tool] });
                        } else {
                          setForm({ ...form, tools: form.tools.filter((t) => t !== tool) });
                        }
                      }}
                      className="accent-da-orange"
                    />
                    <span className="text-sm text-da-text">{tool}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-da-border-color p-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 bg-da-orange text-white py-2.5 rounded-md text-sm font-medium hover:shadow-glow transition-all"
          >
            <Save size={14} />
            Save Changes
          </button>
          <button
            onClick={() => setForm({ ...agent })}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-da-text-secondary hover:text-da-text hover:bg-da-surface-elevated rounded-md transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
