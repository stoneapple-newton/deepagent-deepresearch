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

const pageComponents = {
  dashboard: Dashboard,
  'new-research': NewResearch,
  sessions: Sessions,
  reports: Reports,
  agents: Agents,
  settings: Settings,
};

export default function App() {
  const { currentPage } = useStore();
  const PageComponent = pageComponents[currentPage] || Dashboard;

  return (
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
  );
}
