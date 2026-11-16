import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import prisma from './lib/prisma.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const app = createApp();

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('[Database]: Connected to PostgreSQL successfully.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server]: Inventory Backend running on http://0.0.0.0:${PORT}`);
      console.log(`[Health]: Check status at http://0.0.0.0:${PORT}/health`);
    });
  } catch (error) {
    console.error('[Fatal]: Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
