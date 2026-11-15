import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface LayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onSearchSku?: (sku: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  onSearchSku,
  children,
}) => {
  return (
    <div className="flex h-screen bg-[#0B0F17] overflow-hidden">
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onSearchSku={onSearchSku} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
