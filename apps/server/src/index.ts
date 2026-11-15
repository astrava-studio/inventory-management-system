import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './modules/auth/auth.router';
import locationRouter from './modules/locations/location.router';
import productRouter from './modules/products/product.router';
import inventoryRouter from './modules/inventory/inventory.router';
import transferRouter from './modules/transfers/transfer.router';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/locations', locationRouter);
app.use('/api/products', productRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/transfers', transferRouter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ASTRAVA Inventory Core API',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ASTRAVA Inventory Server running on http://localhost:${PORT}`);
});
