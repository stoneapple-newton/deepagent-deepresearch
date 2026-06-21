import { useStore } from '@/store/useStore';
import { Search, Bell } from 'lucide-react';

export default function TopBar() {
  const { currentPage } = useStore();

  const pageNames: Record<string, string> = {
    dashboard: 'Dashboard',
    'new-research': 'New Research',
    sessions: 'Sessions',
    reports: 'Reports',
    agents: 'Agents',
    settings: 'Settings',
  };

  return (
    <header className="h-16 bg-da-surface border-b border-da-border-color flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="text-sm text-da-text-secondary">
        <span className="text-da-text-secondary/60">DeepAgent</span>
        <span className="mx-2 text-da-border-color">/</span>
        <span className="text-da-text">{pageNames[currentPage] || 'DeepAgent'}</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-da-surface-elevated border border-da-border-color rounded-lg px-3 h-9 w-60">
          <Search size={15} className="text-da-text-secondary/50" />
          <input
            type="text"
            placeholder="Search sessions..."
            className="bg-transparent text-sm text-da-text placeholder:text-da-text-secondary/40 outline-none flex-1"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg hover:bg-da-surface-elevated flex items-center justify-center transition-colors">
          <Bell size={18} className="text-da-text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-da-error rounded-full" />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-da-orange flex items-center justify-center">
          <span className="text-white text-xs font-semibold">JD</span>
        </div>
      </div>
    </header>
  );
}
