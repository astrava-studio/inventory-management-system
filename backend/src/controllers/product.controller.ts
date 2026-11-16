import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

const productSchema = z.object({
  sku: z.string().trim().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Name is required'),
  description: z.string().optional().nullable(),
  category: z.string().trim().min(1, 'Category is required'),
  unitOfMeasure: z.string().trim().default('PCS'),
  costPrice: z.number().positive('Cost price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  reorderPoint: z.number().int().nonnegative('Reorder point must be 0 or greater').default(10),
  isActive: z.boolean().default(true),
});

export const getProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const { search, category, isActive } = req.query;

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        inventoryLevels: {
          where: { tenantId },
          include: { location: true },
        },
      },
    });

    const enriched = products.map((p) => {
      let totalOnHand = 0;
      let totalReserved = 0;
      const locations = p.inventoryLevels.map((lvl) => {
        totalOnHand += lvl.onHand;
        totalReserved += lvl.reserved;
        return {
          locationId: lvl.locationId,
          locationCode: lvl.location.code,
          locationName: lvl.location.name,
          onHand: lvl.onHand,
          reserved: lvl.reserved,
          available: lvl.onHand - lvl.reserved,
        };
      });

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        reorderPoint: p.reorderPoint,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        totalOnHand,
        totalReserved,
        totalAvailable: totalOnHand - totalReserved,
        locations,
      };
    });

    res.json({ products: enriched });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        inventoryLevels: {
          where: { tenantId },
          include: { location: true },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    let totalOnHand = 0;
    let totalReserved = 0;
    const locations = product.inventoryLevels.map((lvl) => {
      totalOnHand += lvl.onHand;
      totalReserved += lvl.reserved;
      return {
        locationId: lvl.locationId,
        locationCode: lvl.location.code,
        locationName: lvl.location.name,
        onHand: lvl.onHand,
        reserved: lvl.reserved,
        available: lvl.onHand - lvl.reserved,
      };
    });

    res.json({
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        unitOfMeasure: product.unitOfMeasure,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        reorderPoint: product.reorderPoint,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        totalOnHand,
        totalReserved,
        totalAvailable: totalOnHand - totalReserved,
        locations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const validated = productSchema.parse(req.body);

    const existing = await prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku: validated.sku,
        },
      },
    });

    if (existing) {
      throw new AppError(`A product with SKU '${validated.sku}' already exists in your workspace.`, 409);
    }

    const product = await prisma.product.create({
      data: {
        ...validated,
        tenantId,
      },
    });

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        ...product,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;
    const validated = productSchema.partial().parse(req.body);

    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError('Product not found in this workspace', 404);
    }

    if (validated.sku && validated.sku !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: validated.sku,
          },
        },
      });
      if (duplicateSku) {
        throw new AppError(`A product with SKU '${validated.sku}' already exists in your workspace.`, 409);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: validated,
    });

    res.json({
      message: 'Product updated successfully',
      product: {
        ...updated,
        costPrice: Number(updated.costPrice),
        sellingPrice: Number(updated.sellingPrice),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    // Soft delete / archive product
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    next(error);
  }
};

export const restoreProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({ message: 'Product restored successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk CSV Import with row-level validation
 */
export const importProductsCsv = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const csvContent: string = req.body.csvData || req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      throw new AppError('CSV data string is required in request body (csvData).', 400);
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new AppError('CSV must include header row and at least one data row.', 400);
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const skuIdx = headers.indexOf('sku');
    const nameIdx = headers.indexOf('name');
    const catIdx = headers.indexOf('category');
    const costIdx = headers.indexOf('cost_price') !== -1 ? headers.indexOf('cost_price') : headers.indexOf('costprice');
    const sellIdx = headers.indexOf('selling_price') !== -1 ? headers.indexOf('selling_price') : headers.indexOf('sellingprice');
    const reorderIdx = headers.indexOf('reorder_point') !== -1 ? headers.indexOf('reorder_point') : headers.indexOf('reorderpoint');
    const uomIdx = headers.indexOf('unit_of_measure') !== -1 ? headers.indexOf('unit_of_measure') : headers.indexOf('unitofmeasure');
    const descIdx = headers.indexOf('description');

    if (skuIdx === -1 || nameIdx === -1 || catIdx === -1 || costIdx === -1 || sellIdx === -1) {
      throw new AppError('Missing required CSV columns: sku, name, category, cost_price, selling_price', 400);
    }

    const errors: Array<{ row: number; error: string }> = [];
    const validRows: Array<{
      tenantId: string;
      sku: string;
      name: string;
      category: string;
      unitOfMeasure: string;
      costPrice: number;
      sellingPrice: number;
      reorderPoint: number;
      description?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < headers.length) continue;

      const sku = parts[skuIdx]?.toUpperCase();
      const name = parts[nameIdx];
      const category = parts[catIdx];
      const costPrice = parseFloat(parts[costIdx]);
      const sellingPrice = parseFloat(parts[sellIdx]);
      const reorderPoint = reorderIdx !== -1 ? parseInt(parts[reorderIdx], 10) : 10;
      const unitOfMeasure = uomIdx !== -1 && parts[uomIdx] ? parts[uomIdx] : 'PCS';
      const description = descIdx !== -1 ? parts[descIdx] : undefined;

      if (!sku) {
        errors.push({ row: i + 1, error: 'SKU is empty' });
        continue;
      }
      if (!name) {
        errors.push({ row: i + 1, error: 'Name is empty' });
        continue;
      }
      if (isNaN(costPrice) || costPrice <= 0) {
        errors.push({ row: i + 1, error: 'Invalid cost price' });
        continue;
      }
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        errors.push({ row: i + 1, error: 'Invalid selling price' });
        continue;
      }

      validRows.push({
        tenantId,
        sku,
        name,
        category,
        unitOfMeasure,
        costPrice,
        sellingPrice,
        reorderPoint: isNaN(reorderPoint) ? 10 : reorderPoint,
        description,
      });
    }

    if (validRows.length === 0 && errors.length > 0) {
      res.status(400).json({ message: 'All CSV rows failed validation', errors });
      return;
    }

    // Upsert products in transaction strictly per tenant
    const upsertedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of validRows) {
        await tx.product.upsert({
          where: {
            tenantId_sku: {
              tenantId,
              sku: row.sku,
            },
          },
          update: {
            name: row.name,
            category: row.category,
            costPrice: row.costPrice,
            sellingPrice: row.sellingPrice,
            reorderPoint: row.reorderPoint,
            unitOfMeasure: row.unitOfMeasure,
            description: row.description,
            isActive: true,
          },
          create: row,
        });
        count++;
      }
      return count;
    });

    res.json({
      message: `Successfully processed CSV: ${upsertedCount} products upserted.`,
      processedCount: upsertedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CSV Export
 */
export const exportProductsCsv = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventoryLevels: {
          where: { tenantId },
        },
      },
      orderBy: { sku: 'asc' },
    });

    const headers = [
      'sku',
      'name',
      'category',
      'unit_of_measure',
      'cost_price',
      'selling_price',
      'reorder_point',
      'total_on_hand',
      'total_reserved',
      'total_available',
    ];

    const rows = products.map((p) => {
      const onHand = p.inventoryLevels.reduce((acc, curr) => acc + curr.onHand, 0);
      const reserved = p.inventoryLevels.reduce((acc, curr) => acc + curr.reserved, 0);
      return [
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.unitOfMeasure}"`,
        Number(p.costPrice).toFixed(2),
        Number(p.sellingPrice).toFixed(2),
        p.reorderPoint,
        onHand,
        reserved,
        onHand - reserved,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
