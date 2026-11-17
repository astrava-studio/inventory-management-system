import React, { useState, useEffect } from 'react';
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
import { WorkspacePage } from './pages/WorkspacePage';
import { Boxes, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [preselectedSku, setPreselectedSku] = useState<string | undefined>(undefined);

  // Keep-alive tracking: Keep rendered tabs resident in DOM/memory for 0ms tab switching
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ dashboard: true });

  useEffect(() => {
    setVisitedTabs((prev) => (prev[currentTab] ? prev : { ...prev, [currentTab]: true }));
  }, [currentTab]);

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
      <div className="space-y-6">
        {/* Dashboard Tab - Always resident in DOM */}
        <div
          style={{ display: currentTab === 'dashboard' ? 'block' : 'none' }}
          className={currentTab === 'dashboard' ? 'animate-in fade-in duration-200' : ''}
        >
          <DashboardPage onNavigateToTab={handleNavigate} />
        </div>

        {/* Products Tab */}
        {visitedTabs['products'] && (
          <div
            style={{ display: currentTab === 'products' ? 'block' : 'none' }}
            className={currentTab === 'products' ? 'animate-in fade-in duration-200' : ''}
          >
            <ProductsPage />
          </div>
        )}

        {/* Inventory Matrix Tab */}
        {visitedTabs['inventory'] && (
          <div
            style={{ display: currentTab === 'inventory' ? 'block' : 'none' }}
            className={currentTab === 'inventory' ? 'animate-in fade-in duration-200' : ''}
          >
            <InventoryPage onNavigateToTab={handleNavigate} />
          </div>
        )}

        {/* Purchase Orders Tab */}
        {visitedTabs['purchase-orders'] && (
          <div
            style={{ display: currentTab === 'purchase-orders' ? 'block' : 'none' }}
            className={currentTab === 'purchase-orders' ? 'animate-in fade-in duration-200' : ''}
          >
            <PurchaseOrdersPage initialPreselectedSku={preselectedSku} />
          </div>
        )}

        {/* Sales Orders Tab */}
        {visitedTabs['sales-orders'] && (
          <div
            style={{ display: currentTab === 'sales-orders' ? 'block' : 'none' }}
            className={currentTab === 'sales-orders' ? 'animate-in fade-in duration-200' : ''}
          >
            <SalesOrdersPage />
          </div>
        )}

        {/* Stock Transfers Tab */}
        {visitedTabs['transfers'] && (
          <div
            style={{ display: currentTab === 'transfers' ? 'block' : 'none' }}
            className={currentTab === 'transfers' ? 'animate-in fade-in duration-200' : ''}
          >
            <TransfersPage />
          </div>
        )}

        {/* Stock Ledger Tab */}
        {visitedTabs['ledger'] && (
          <div
            style={{ display: currentTab === 'ledger' ? 'block' : 'none' }}
            className={currentTab === 'ledger' ? 'animate-in fade-in duration-200' : ''}
          >
            <LedgerPage />
          </div>
        )}

        {/* Workspace & Team Tab */}
        {visitedTabs['workspace'] && (
          <div
            style={{ display: currentTab === 'workspace' ? 'block' : 'none' }}
            className={currentTab === 'workspace' ? 'animate-in fade-in duration-200' : ''}
          >
            <WorkspacePage />
          </div>
        )}
      </div>
    </Layout>
  );
};
export default App;
