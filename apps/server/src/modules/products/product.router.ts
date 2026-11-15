import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, search } = req.query;

    const where: any = { isActive: true };
    if (categoryId && typeof categoryId === 'string') {
      where.categoryId = categoryId;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        stockBalances: {
          include: { location: true },
        },
      },
      orderBy: { sku: 'asc' },
    });

    const formatted = products.map((p) => {
      const totalOnHand = p.stockBalances.reduce((sum, b) => sum + Number(b.onHand), 0);
      const totalReserved = p.stockBalances.reduce((sum, b) => sum + Number(b.reserved), 0);
      const totalAvailable = totalOnHand - totalReserved;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        unitOfMeasure: p.unitOfMeasure,
        minThreshold: Number(p.minThreshold),
        category: p.category.name,
        categoryId: p.categoryId,
        totalOnHand,
        totalReserved,
        totalAvailable,
        isLowStock: totalOnHand <= Number(p.minThreshold),
        locationBalances: p.stockBalances.map((b) => ({
          locationId: b.locationId,
          locationName: b.location.name,
          locationCode: b.location.code,
          onHand: Number(b.onHand),
          reserved: Number(b.reserved),
          available: Number(b.onHand) - Number(b.reserved),
          averageUnitCost: Number(b.averageUnitCost),
        })),
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, categoryId, sku, name, description, unitOfMeasure, minThreshold } = req.body;

    if (!organizationId || !categoryId || !sku || !name) {
      res.status(400).json({ error: 'Missing required product fields' });
      return;
    }

    const existing = await prisma.product.findUnique({
      where: { organizationId_sku: { organizationId, sku } },
    });

    if (existing) {
      res.status(409).json({ error: `Product with SKU "${sku}" already exists` });
      return;
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        categoryId,
        sku: sku.toUpperCase().trim(),
        name,
        description,
        unitOfMeasure: unitOfMeasure || 'units',
        minThreshold: minThreshold ? Number(minThreshold) : 10,
      },
      include: { category: true },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
