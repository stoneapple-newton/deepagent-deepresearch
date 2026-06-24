import { useStore } from '@/store/useStore';
import type { PageView } from '@/types';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  FileText,
  Bot,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { label: string; page: PageView; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { label: 'New Research', page: 'new-research', icon: PlusCircle },
  { label: 'Sessions', page: 'sessions', icon: ClipboardList },
  { label: 'Reports', page: 'reports', icon: FileText },
  { label: 'Agents', page: 'agents', icon: Bot },
  { label: 'Settings', page: 'settings', icon: Settings },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, isSidebarOpen, setSidebarOpen, sessions } = useStore();

  const runningCount = sessions.filter((s) => s.status === 'running').length;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-da-surface border border-da-border-color flex items-center justify-center shadow-sm"
      >
        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-60 bg-da-surface-elevated border-r border-da-border-color flex flex-col z-40 transition-transform duration-300',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-da-border-color">
          <div className="w-8 h-8 rounded-full bg-da-orange flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display text-lg leading-none">A</span>
          </div>
          <span className="font-display text-xl text-da-text">DeepAgent</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => {
                  setCurrentPage(item.page);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm font-medium transition-all duration-150 relative',
                  isActive
                    ? 'text-da-orange bg-da-orange-light/50'
                    : 'text-da-text-secondary hover:text-da-text hover:bg-da-surface'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-da-orange rounded-r" />
                )}
                <Icon size={18} />
                <span>{item.label}</span>
                {item.page === 'sessions' && runningCount > 0 && (
                  <span className="ml-auto bg-da-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {runningCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="p-4 border-t border-da-border-color space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-da-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-da-success" />
            </span>
            <span className="text-xs text-da-text-secondary">System Online</span>
          </div>
          <div className="text-[10px] font-mono text-da-text-secondary/60 bg-da-surface rounded px-2 py-1">
            DeepSeek · Tavily
          </div>
        </div>
      </aside>
    </>
  );
}
