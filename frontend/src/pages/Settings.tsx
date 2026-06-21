import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Key, Server, Sliders, Eye, Save, RotateCcw, Check } from 'lucide-react';

export default function Settings() {
  const { researchOptions, setResearchOptions } = useStore();
  const [apiKeys, setApiKeys] = useState({
    deepseek: '',
    tavily: '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-da-text">Settings</h1>
        <p className="text-sm text-da-text-secondary mt-1">
          Configure API keys, defaults, and interface preferences
        </p>
      </div>

      {/* API Configuration */}
      <section className="bg-da-surface border border-da-border-color rounded-[10px] p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-da-orange/10 flex items-center justify-center">
            <Key size={18} className="text-da-orange" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-da-text">API Configuration</h2>
            <p className="text-xs text-da-text-secondary">Manage your API keys for external services</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">DeepSeek API Key</label>
            <input
              type="password"
              value={apiKeys.deepseek}
              onChange={(e) => setApiKeys({ ...apiKeys, deepseek: e.target.value })}
              placeholder="sk-..."
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Tavily API Key</label>
            <input
              type="password"
              value={apiKeys.tavily}
              onChange={(e) => setApiKeys({ ...apiKeys, tavily: e.target.value })}
              placeholder="tvly-..."
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Model</label>
            <select
              value={researchOptions.model}
              onChange={(e) => setResearchOptions({ model: e.target.value })}
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
            >
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="deepseek-reasoner">deepseek-reasoner</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-da-surface-elevated border border-da-border-color rounded-md text-sm text-da-text-secondary hover:text-da-text hover:border-da-orange transition-all">
            <Server size={14} />
            Test Connection
          </button>
        </div>
      </section>

      {/* Research Defaults */}
      <section className="bg-da-surface border border-da-border-color rounded-[10px] p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-da-orange/10 flex items-center justify-center">
            <Sliders size={18} className="text-da-orange" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-da-text">Research Defaults</h2>
            <p className="text-xs text-da-text-secondary">Default parameters for new research sessions</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Default Thread ID</label>
            <input
              type="text"
              placeholder="deep-research-demo"
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Max Search Rounds</label>
            <input
              type="number"
              value={researchOptions.maxSearchRounds}
              onChange={(e) => setResearchOptions({ maxSearchRounds: parseInt(e.target.value) || 5 })}
              min={1}
              max={20}
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-da-text mb-2">Report Output Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              value="/reports"
              readOnly
              className="flex-1 h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text font-mono"
            />
            <button className="px-4 h-11 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text-secondary hover:text-da-text hover:border-da-orange transition-all">
              Browse
            </button>
          </div>
        </div>
      </section>

      {/* Interface Preferences */}
      <section className="bg-da-surface border border-da-border-color rounded-[10px] p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-da-orange/10 flex items-center justify-center">
            <Eye size={18} className="text-da-orange" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-da-text">Interface Preferences</h2>
            <p className="text-xs text-da-text-secondary">Customize your workspace experience</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Theme</label>
            <div className="flex gap-3">
              {['Light', 'Dark', 'System'].map((theme) => (
                <button
                  key={theme}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    theme === 'Light'
                      ? 'bg-da-orange text-white'
                      : 'bg-da-surface-elevated text-da-text-secondary hover:text-da-text'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-da-text mb-2">Log Retention</label>
              <select className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange">
                <option>24 hours</option>
                <option>7 days</option>
                <option>30 days</option>
                <option>Forever</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-da-text mb-2">Auto-refresh (seconds)</label>
              <input
                type="number"
                defaultValue={5}
                min={1}
                max={60}
                className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-da-orange text-white px-6 py-2.5 rounded-md text-sm font-medium hover:shadow-glow transition-all"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button className="flex items-center gap-2 text-sm text-da-text-secondary hover:text-da-text px-4 py-2.5 rounded-md hover:bg-da-surface-elevated transition-all">
          <RotateCcw size={14} />
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
