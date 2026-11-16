import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { InventoryDataProvider } from './context/InventoryDataContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <InventoryDataProvider>
        <App />
      </InventoryDataProvider>
    </AuthProvider>
  </React.StrictMode>
);
