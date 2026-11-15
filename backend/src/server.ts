import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import prisma from './lib/prisma.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('[Database]: Connected to PostgreSQL successfully.');

    app.listen(PORT, () => {
      console.log(`[Server]: Inventory Backend running on http://localhost:${PORT}`);
      console.log(`[Health]: Check status at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('[Fatal]: Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
