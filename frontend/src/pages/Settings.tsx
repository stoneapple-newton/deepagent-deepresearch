import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Key, Server, Sliders, Eye, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';

const SETTINGS_KEY = 'deepagent_settings';
const BACKEND_URL_KEY = 'deepagent_backend_url';

interface AppSettings {
  apiKeys: { deepseek: string; tavily: string };
  theme: 'light' | 'dark' | 'system';
  defaultThreadId: string;
  reportDir: string;
  logRetention: string;
  autoRefresh: number;
  backendUrl: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: { deepseek: '', tavily: '' },
  theme: 'system',
  defaultThreadId: '',
  reportDir: '/reports',
  logRetention: '30 days',
  autoRefresh: 5,
  backendUrl: '/api',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  // Try to read backend URL from its own key
  const backendUrl = localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_SETTINGS.backendUrl;
  return { ...DEFAULT_SETTINGS, backendUrl };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(BACKEND_URL_KEY, settings.backendUrl);
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export default function Settings() {
  const { researchOptions, setResearchOptions } = useStore();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for OS theme changes when in System mode
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const base = settings.backendUrl || '/api';
      const res = await fetch(`${base}/health`);
      if (res.ok) {
        const data = await res.json();
        setTestStatus({ ok: true, message: `Connected! Backend status: ${data.status || 'ok'}` });
      } else {
        setTestStatus({ ok: false, message: `Backend returned ${res.status}` });
      }
    } catch (err) {
      setTestStatus({ ok: false, message: 'Could not connect to backend. Is the server running?' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS);
      setResearchOptions({ model: 'deepseek-chat', researchProfile: 'standard' });
    }
  };

  const themes: { value: AppSettings['theme']; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

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
              value={settings.apiKeys.deepseek}
              onChange={(e) => updateSetting('apiKeys', { ...settings.apiKeys, deepseek: e.target.value })}
              placeholder="sk-..."
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Tavily API Key</label>
            <input
              type="password"
              value={settings.apiKeys.tavily}
              onChange={(e) => updateSetting('apiKeys', { ...settings.apiKeys, tavily: e.target.value })}
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
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Backend URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.backendUrl}
                onChange={(e) => updateSetting('backendUrl', e.target.value)}
                placeholder="/api"
                className="flex-1 h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange font-mono"
              />
            </div>
            <p className="text-xs text-da-text-secondary mt-1">The API base URL. Default is /api.</p>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-da-surface-elevated border border-da-border-color rounded-md text-sm text-da-text-secondary hover:text-da-text hover:border-da-orange transition-all disabled:opacity-50"
          >
            <Server size={14} />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          {testStatus && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                testStatus.ok
                  ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              <AlertCircle size={14} />
              {testStatus.message}
            </div>
          )}
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
              value={settings.defaultThreadId}
              onChange={(e) => updateSetting('defaultThreadId', e.target.value)}
              placeholder="deep-research-demo"
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none focus:border-da-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-da-text mb-2">Default Research Profile</label>
            <input
              type="text"
              value={researchOptions.researchProfile}
              readOnly
              className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text-secondary outline-none"
            />
            <p className="text-xs text-da-text-secondary mt-1">Choose profiles on New Research; edit limits in research_profiles.yaml.</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-da-text mb-2">Report Output Directory</label>
          <input
            type="text"
            value={settings.reportDir}
            onChange={(e) => updateSetting('reportDir', e.target.value)}
            placeholder="/reports"
            className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text font-mono outline-none focus:border-da-orange"
          />
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
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateSetting('theme', t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    settings.theme === t.value
                      ? 'bg-da-orange text-white'
                      : 'bg-da-surface-elevated text-da-text-secondary hover:text-da-text'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-da-text mb-2">Log Retention</label>
              <select
                value={settings.logRetention}
                onChange={(e) => updateSetting('logRetention', e.target.value)}
                className="w-full h-11 px-4 bg-da-surface-elevated border border-da-border-color rounded-lg text-sm text-da-text outline-none focus:border-da-orange"
              >
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
                value={settings.autoRefresh}
                onChange={(e) => updateSetting('autoRefresh', Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
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
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-da-text-secondary hover:text-da-text px-4 py-2.5 rounded-md hover:bg-da-surface-elevated transition-all"
        >
          <RotateCcw size={14} />
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
