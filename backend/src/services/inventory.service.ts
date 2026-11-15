import { Prisma, MovementType } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export interface AdjustmentInput {
  productId: string;
  locationId: string;
  quantityDelta: number; // positive or negative
  reasonCode: 'DAMAGED' | 'EXPIRED' | 'SHRINKAGE' | 'AUDIT_CORRECTION' | 'OPENING_STOCK';
  notes: string;
  performedById: string;
}

export class InventoryService {
  /**
   * Helper: Locks an inventory_levels row using SELECT ... FOR UPDATE.
   * If row doesn't exist, safely creates it first, then acquires lock.
   */
  private static async lockInventoryRow(
    tx: Prisma.TransactionClient,
    productId: string,
    locationId: string
  ): Promise<{ id: string; onHand: number; reserved: number }> {
    // 1. Ensure the inventory level record exists
    await tx.inventoryLevel.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      update: {},
      create: {
        productId,
        locationId,
        onHand: 0,
        reserved: 0,
      },
    });

    // 2. Lock row with SELECT ... FOR UPDATE
    const rows = await tx.$queryRaw<Array<{ id: string; on_hand: number; reserved: number }>>`
      SELECT id, on_hand, reserved
      FROM inventory_levels
      WHERE product_id = ${productId} AND location_id = ${locationId}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      throw new AppError(`Failed to lock inventory level for product ${productId} at location ${locationId}`, 500);
    }

    return {
      id: rows[0].id,
      onHand: Number(rows[0].on_hand),
      reserved: Number(rows[0].reserved),
    };
  }

  /**
   * Helper: Locks multiple inventory rows ordered by productId to prevent deadlocks.
   */
  private static async lockInventoryRows(
    tx: Prisma.TransactionClient,
    productIds: string[],
    locationId: string
  ): Promise<Map<string, { id: string; onHand: number; reserved: number }>> {
    const sortedProductIds = Array.from(new Set(productIds)).sort();
    const lockedMap = new Map<string, { id: string; onHand: number; reserved: number }>();

    for (const pId of sortedProductIds) {
      const locked = await this.lockInventoryRow(tx, pId, locationId);
      lockedMap.set(pId, locked);
    }

    return lockedMap;
  }

  /**
   * 1. Receive Purchase Order (ORDERED -> RECEIVED)
   * Upsert InventoryLevel, increment onHand by quantity, insert PURCHASE_RECEIPT StockMovement.
   */
  public static async receivePurchaseOrder(
    purchaseOrderId: string,
    performedById: string
  ) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!po) {
        throw new AppError('Purchase order not found', 404);
      }

      if (po.status !== 'ORDERED') {
        throw new AppError(`Cannot receive PO with status '${po.status}'. Must be 'ORDERED'.`, 400);
      }

      if (po.items.length === 0) {
        throw new AppError('Purchase order contains no line items.', 400);
      }

      // Sort items by productId to lock in consistent order
      const sortedItems = [...po.items].sort((a, b) => a.productId.localeCompare(b.productId));

      for (const item of sortedItems) {
        const locked = await this.lockInventoryRow(tx, item.productId, po.locationId);
        const beforeOnHand = locked.onHand;
        const afterOnHand = beforeOnHand + item.quantity;

        // Update inventory level
        await tx.inventoryLevel.update({
          where: { id: locked.id },
          data: { onHand: afterOnHand },
        });

        // Insert immutable stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            locationId: po.locationId,
            type: MovementType.PURCHASE_RECEIPT,
            quantityDelta: item.quantity,
            beforeOnHand,
            afterOnHand,
            referenceType: 'PO',
            referenceId: po.poNumber,
            notes: `Received PO #${po.poNumber} from ${po.supplierName}`,
            performedById,
          },
        });
      }

      // Update PO status
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          location: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      return updatedPo;
    });
  }

  /**
   * 2. Confirm Sales Order (DRAFT -> CONFIRMED)
   * Locks InventoryLevels; verifies onHand - reserved >= item.quantity for every item.
   * Throws 409 Conflict with details if any item lacks stock.
   * Increments reserved by quantity.
   */
  public static async confirmSalesOrder(
    salesOrderId: string,
    _performedById: string
  ) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!so) {
        throw new AppError('Sales order not found', 404);
      }

      if (so.status !== 'DRAFT') {
        throw new AppError(`Cannot confirm SO with status '${so.status}'. Must be 'DRAFT'.`, 400);
      }

      if (so.items.length === 0) {
        throw new AppError('Sales order has no line items', 400);
      }

      // Lock all inventory rows in ordered sequence
      const productIds = so.items.map((i) => i.productId);
      const lockedMap = await this.lockInventoryRows(tx, productIds, so.locationId);

      // Verify availability for all items
      const insufficientItems: Array<{
        sku: string;
        name: string;
        requested: number;
        available: number;
      }> = [];

      for (const item of so.items) {
        const current = lockedMap.get(item.productId)!;
        const available = current.onHand - current.reserved;
        if (available < item.quantity) {
          insufficientItems.push({
            sku: item.product.sku,
            name: item.product.name,
            requested: item.quantity,
            available,
          });
        }
      }

      if (insufficientItems.length > 0) {
        throw new AppError('Insufficient stock to confirm sales order', 409, {
          insufficientItems,
        });
      }

      // Increment reserved for all items
      for (const item of so.items) {
        const current = lockedMap.get(item.productId)!;
        await tx.inventoryLevel.update({
          where: { id: current.id },
          data: {
            reserved: current.reserved + item.quantity,
          },
        });
      }

      // Mark SO confirmed
      const updatedSo = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          location: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      return updatedSo;
    });
  }

  /**
   * 3. Cancel Confirmed Sales Order (CONFIRMED -> CANCELLED)
   * Decrements reserved by quantity (no onHand change, no ledger entry).
   */
  public static async cancelSalesOrder(
    salesOrderId: string,
    _performedById: string
  ) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: true },
      });

      if (!so) {
        throw new AppError('Sales order not found', 404);
      }

      if (so.status === 'FULFILLED') {
        throw new AppError('Cannot cancel a fulfilled sales order', 400);
      }

      if (so.status === 'CANCELLED') {
        throw new AppError('Sales order is already cancelled', 400);
      }

      // If it was CONFIRMED, release the reserved stock
      if (so.status === 'CONFIRMED') {
        const productIds = so.items.map((i) => i.productId);
        const lockedMap = await this.lockInventoryRows(tx, productIds, so.locationId);

        for (const item of so.items) {
          const current = lockedMap.get(item.productId)!;
          const newReserved = Math.max(0, current.reserved - item.quantity);
          await tx.inventoryLevel.update({
            where: { id: current.id },
            data: { reserved: newReserved },
          });
        }
      }

      const updated = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'CANCELLED' },
        include: { items: { include: { product: true } }, location: true },
      });

      return updated;
    });
  }

  /**
   * 4. Fulfill Sales Order (CONFIRMED -> FULFILLED)
   * Decrement both onHand and reserved by quantity, and insert SALES_DISPATCH StockMovement.
   */
  public static async fulfillSalesOrder(
    salesOrderId: string,
    performedById: string
  ) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!so) {
        throw new AppError('Sales order not found', 404);
      }

      if (so.status !== 'CONFIRMED') {
        throw new AppError(`Cannot fulfill SO with status '${so.status}'. Must be 'CONFIRMED'.`, 400);
      }

      const productIds = so.items.map((i) => i.productId);
      const lockedMap = await this.lockInventoryRows(tx, productIds, so.locationId);

      for (const item of so.items) {
        const current = lockedMap.get(item.productId)!;
        const beforeOnHand = current.onHand;
        const afterOnHand = beforeOnHand - item.quantity;
        const newReserved = current.reserved - item.quantity;

        if (afterOnHand < 0 || newReserved < 0) {
          throw new AppError(
            `Data integrity error: negative stock prevented for product ${item.product.sku}`,
            409
          );
        }

        await tx.inventoryLevel.update({
          where: { id: current.id },
          data: {
            onHand: afterOnHand,
            reserved: newReserved,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            locationId: so.locationId,
            type: MovementType.SALES_DISPATCH,
            quantityDelta: -item.quantity,
            beforeOnHand,
            afterOnHand,
            referenceType: 'SO',
            referenceId: so.soNumber,
            notes: `Dispatched SO #${so.soNumber} to ${so.customerName}`,
            performedById,
          },
        });
      }

      const updated = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: {
          status: 'FULFILLED',
          fulfilledAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          location: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      return updated;
    });
  }

  /**
   * 5. Complete Stock Transfer (PENDING/IN_TRANSIT -> COMPLETED)
   * Verify source available >= quantity, decrement source onHand,
   * increment destination onHand, insert TRANSFER_OUT & TRANSFER_IN movements.
   */
  public static async completeTransfer(
    transferId: string,
    performedById: string
  ) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: {
          items: { include: { product: true } },
          sourceLocation: true,
          destinationLocation: true,
        },
      });

      if (!transfer) {
        throw new AppError('Stock transfer not found', 404);
      }

      if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
        throw new AppError(`Cannot complete transfer with status '${transfer.status}'.`, 400);
      }

      // Lock source and destination rows for each product ordered by productId
      const sortedItems = [...transfer.items].sort((a, b) => a.productId.localeCompare(b.productId));

      for (const item of sortedItems) {
        const sourceLocked = await this.lockInventoryRow(tx, item.productId, transfer.sourceLocationId);
        const sourceAvailable = sourceLocked.onHand - sourceLocked.reserved;

        if (sourceAvailable < item.quantity) {
          throw new AppError(
            `Insufficient available stock at source location for SKU ${item.product.sku}. Available: ${sourceAvailable}, Required: ${item.quantity}`,
            409
          );
        }

        const destLocked = await this.lockInventoryRow(tx, item.productId, transfer.destinationLocationId);

        // Source: decrement onHand
        const sourceBefore = sourceLocked.onHand;
        const sourceAfter = sourceBefore - item.quantity;
        await tx.inventoryLevel.update({
          where: { id: sourceLocked.id },
          data: { onHand: sourceAfter },
        });

        // Destination: increment onHand
        const destBefore = destLocked.onHand;
        const destAfter = destBefore + item.quantity;
        await tx.inventoryLevel.update({
          where: { id: destLocked.id },
          data: { onHand: destAfter },
        });

        // Movement: TRANSFER_OUT at source
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            locationId: transfer.sourceLocationId,
            type: MovementType.TRANSFER_OUT,
            quantityDelta: -item.quantity,
            beforeOnHand: sourceBefore,
            afterOnHand: sourceAfter,
            referenceType: 'TRANSFER',
            referenceId: transfer.transferNumber,
            notes: `Transfer out to ${transfer.destinationLocation.name} (Ref: ${transfer.transferNumber})`,
            performedById,
          },
        });

        // Movement: TRANSFER_IN at destination
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            locationId: transfer.destinationLocationId,
            type: MovementType.TRANSFER_IN,
            quantityDelta: item.quantity,
            beforeOnHand: destBefore,
            afterOnHand: destAfter,
            referenceType: 'TRANSFER',
            referenceId: transfer.transferNumber,
            notes: `Transfer in from ${transfer.sourceLocation.name} (Ref: ${transfer.transferNumber})`,
            performedById,
          },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          sourceLocation: true,
          destinationLocation: true,
        },
      });

      return updated;
    });
  }

  /**
   * 6. Manual Stock Adjustment (POST /api/inventory/adjustments)
   * Requires reasonCode and notes.
   * Verifies resulting onHand >= reserved and onHand >= 0.
   * Updates onHand and writes ADJUSTMENT StockMovement.
   */
  public static async recordAdjustment(input: AdjustmentInput) {
    return prisma.$transaction(async (tx) => {
      const { productId, locationId, quantityDelta, reasonCode, notes, performedById } = input;

      if (quantityDelta === 0) {
        throw new AppError('Quantity delta cannot be zero for adjustment', 400);
      }

      // Check product and location exist
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError('Product not found', 404);

      const location = await tx.location.findUnique({ where: { id: locationId } });
      if (!location) throw new AppError('Location not found', 404);

      // Lock inventory row
      const locked = await this.lockInventoryRow(tx, productId, locationId);
      const beforeOnHand = locked.onHand;
      const afterOnHand = beforeOnHand + quantityDelta;

      if (afterOnHand < 0) {
        throw new AppError(
          `Adjustment rejected: resulting on-hand quantity (${afterOnHand}) cannot be negative. Current: ${beforeOnHand}, Delta: ${quantityDelta}`,
          409
        );
      }

      if (afterOnHand < locked.reserved) {
        throw new AppError(
          `Adjustment rejected: resulting on-hand (${afterOnHand}) would be less than currently reserved quantity (${locked.reserved}).`,
          409
        );
      }

      // Update inventory level
      const updatedLevel = await tx.inventoryLevel.update({
        where: { id: locked.id },
        data: { onHand: afterOnHand },
      });

      // Write adjustment movement
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          locationId,
          type: MovementType.ADJUSTMENT,
          quantityDelta,
          beforeOnHand,
          afterOnHand,
          referenceType: 'MANUAL',
          reasonCode,
          notes,
          performedById,
        },
      });

      return {
        inventoryLevel: {
          ...updatedLevel,
          available: updatedLevel.onHand - updatedLevel.reserved,
        },
        movement,
      };
    });
  }
}
