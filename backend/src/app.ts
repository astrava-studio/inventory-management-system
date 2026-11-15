import express, { Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import productRoutes from './routes/product.routes.js';
import locationRoutes from './routes/location.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import purchaseOrderRoutes from './routes/purchase-order.routes.js';
import salesOrderRoutes from './routes/sales-order.routes.js';
import transferRoutes from './routes/transfer.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'inventory-backend', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/purchase-orders', purchaseOrderRoutes);
  app.use('/api/sales-orders', salesOrderRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/ledger', ledgerRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
