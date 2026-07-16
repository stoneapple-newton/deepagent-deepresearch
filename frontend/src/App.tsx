import { useEffect, useState, Component } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Dashboard from '@/pages/Dashboard';
import NewResearch from '@/pages/NewResearch';
import Sessions from '@/pages/Sessions';
import Reports from '@/pages/Reports';
import Agents from '@/pages/Agents';
import Settings from '@/pages/Settings';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, RotateCcw } from 'lucide-react';

const pageComponents = {
  dashboard: Dashboard,
  'new-research': NewResearch,
  sessions: Sessions,
  reports: Reports,
  agents: Agents,
  settings: Settings,
};

// Theme initialization on app mount
function initTheme() {
  try {
    const raw = localStorage.getItem('deepagent_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const theme = parsed.theme || 'system';
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    }
  } catch {
    // ignore
  }
}

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-da-bg p-6">
          <div className="max-w-md w-full bg-da-surface border border-da-border-color rounded-[10px] p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-da-text">Something went wrong</h2>
            <p className="text-sm text-da-text-secondary">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-da-orange text-white px-5 py-2.5 rounded-md text-sm font-medium hover:shadow-glow transition-all"
            >
              <RotateCcw size={14} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Offline banner
function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500/90 text-black text-sm font-medium px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff size={14} />
      You are offline. Some features may not work until connection is restored.
    </div>
  );
}

export default function App() {
  const { currentPage, loadSessions, loadAgents, addNotification } = useStore();
  const PageComponent = pageComponents[currentPage] || Dashboard;

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    loadSessions().catch(() => {
      addNotification({ type: 'error', message: 'Failed to load research sessions' });
    });
    loadAgents().catch(() => {
      addNotification({ type: 'error', message: 'Failed to load agent settings' });
    });
  }, [addNotification, loadAgents, loadSessions]);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <div className="min-h-screen bg-da-bg flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <PageComponent />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
