import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { SalesOrdersPage } from './pages/SalesOrdersPage';
import { TransfersPage } from './pages/TransfersPage';
import { LedgerPage } from './pages/LedgerPage';
import { Boxes, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [preselectedSku, setPreselectedSku] = useState<string | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
          <Boxes className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
          <span>Connecting to ASTRAVA Core Engine...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (tab: string, sku?: string) => {
    setCurrentTab(tab);
    if (sku) {
      setPreselectedSku(sku);
    } else {
      setPreselectedSku(undefined);
    }
  };

  const handleSearchSku = (sku: string) => {
    setPreselectedSku(sku);
    setCurrentTab('products');
  };

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={(tab) => {
        setPreselectedSku(undefined);
        setCurrentTab(tab);
      }}
      onSearchSku={handleSearchSku}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 8, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.995 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-6"
        >
          {currentTab === 'dashboard' && <DashboardPage onNavigateToTab={handleNavigate} />}
          {currentTab === 'products' && <ProductsPage />}
          {currentTab === 'inventory' && <InventoryPage />}
          {currentTab === 'purchase-orders' && (
            <PurchaseOrdersPage initialPreselectedSku={preselectedSku} />
          )}
          {currentTab === 'sales-orders' && <SalesOrdersPage />}
          {currentTab === 'transfers' && <TransfersPage />}
          {currentTab === 'ledger' && <LedgerPage />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};
export default App;
