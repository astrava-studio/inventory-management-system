import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            stockBalances: true,
            outgoingTransfers: true,
            incomingTransfers: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to load locations' });
  }
});

router.get('/:id/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        stockBalances: {
          include: { product: true },
        },
      },
    });

    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    let totalValue = 0;
    let totalItemsOnHand = 0;
    let lowStockCount = 0;

    for (const b of location.stockBalances) {
      const onHand = Number(b.onHand);
      const cost = Number(b.averageUnitCost);
      const minThreshold = Number(b.product.minThreshold);

      totalItemsOnHand += onHand;
      totalValue += onHand * cost;
      if (onHand <= minThreshold) {
        lowStockCount++;
      }
    }

    res.json({
      location,
      metrics: {
        totalValue: Number(totalValue.toFixed(2)),
        totalItemsOnHand,
        lowStockCount,
        productCount: location.stockBalances.length,
      },
    });
  } catch (error) {
    console.error('Error fetching location summary:', error);
    res.status(500).json({ error: 'Failed to calculate location summary' });
  }
});

export default router;
