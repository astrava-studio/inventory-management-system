import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { TransferStatus, MovementType, Prisma } from '@prisma/client';

const router = Router();

// 1. List transfers with status history and items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { locationId, status } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status as TransferStatus;
    }
    if (locationId && typeof locationId === 'string') {
      where.OR = [
        { sourceLocationId: locationId },
        { destinationLocationId: locationId },
      ];
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        sourceLocation: true,
        destinationLocation: true,
        requestedBy: true,
        approvedBy: true,
        items: {
          include: { product: true },
        },
        statusHistory: {
          include: { changedBy: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = transfers.map((t) => ({
      id: t.id,
      transferNumber: t.transferNumber,
      status: t.status,
      sourceLocation: {
        id: t.sourceLocation.id,
        name: t.sourceLocation.name,
        code: t.sourceLocation.code,
      },
      destinationLocation: {
        id: t.destinationLocation.id,
        name: t.destinationLocation.name,
        code: t.destinationLocation.code,
      },
      requestedBy: {
        id: t.requestedBy.id,
        name: t.requestedBy.fullName,
        email: t.requestedBy.email,
      },
      approvedBy: t.approvedBy
        ? {
            id: t.approvedBy.id,
            name: t.approvedBy.fullName,
            email: t.approvedBy.email,
          }
        : null,
      notes: t.notes,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      items: t.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        sku: i.product.sku,
        name: i.product.name,
        unitOfMeasure: i.product.unitOfMeasure,
        requestedQty: Number(i.requestedQty),
        dispatchedQty: i.dispatchedQty ? Number(i.dispatchedQty) : null,
        receivedQty: i.receivedQty ? Number(i.receivedQty) : null,
      })),
      timeline: t.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedByName: h.changedBy.fullName,
        notes: h.notes,
        timestamp: h.createdAt,
      })),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error loading transfers:', error);
    res.status(500).json({ error: 'Failed to fetch stock transfers' });
  }
});

// 2. Create new transfer (Draft or direct submit)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      sourceLocationId,
      destinationLocationId,
      requestedById,
      items,
      notes,
      submitNow,
    } = req.body;

    if (!sourceLocationId || !destinationLocationId || !requestedById || !items || !items.length) {
      res.status(400).json({ error: 'Missing required transfer fields' });
      return;
    }

    if (sourceLocationId === destinationLocationId) {
      res.status(400).json({ error: 'Source and destination locations cannot be identical' });
      return;
    }

    const count = await prisma.stockTransfer.count();
    const transferNumber = `TR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const initialStatus = submitNow ? TransferStatus.PENDING_APPROVAL : TransferStatus.DRAFT;

    const transfer = await prisma.stockTransfer.create({
      data: {
        organizationId,
        transferNumber,
        sourceLocationId,
        destinationLocationId,
        requestedById,
        status: initialStatus,
        notes,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            requestedQty: new Prisma.Decimal(i.quantity),
          })),
        },
        statusHistory: {
          create: [
            {
              fromStatus: null,
              toStatus: TransferStatus.DRAFT,
              changedById: requestedById,
              notes: 'Transfer created in draft mode',
            },
            ...(submitNow
              ? [
                  {
                    fromStatus: TransferStatus.DRAFT,
                    toStatus: TransferStatus.PENDING_APPROVAL,
                    changedById: requestedById,
                    notes: 'Submitted for managerial authorization',
                  },
                ]
              : []),
          ],
        },
      },
    });

    res.status(201).json(transfer);
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// 3. Approve Transfer: Reserves stock at source location (Self-approval blocked!)
router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { userId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!transfer) throw new Error('Transfer not found');
      if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
        throw new Error(`Transfer cannot be approved from status: ${transfer.status}`);
      }

      // BUSINESS RULE: A user cannot approve their own transfer request
      if (transfer.requestedById === userId) {
        throw new Error('Self-approval violation: Requester cannot approve their own transfer request');
      }

      // Check available stock & lock reservations
      for (const item of transfer.items) {
        const balance = await tx.stockBalance.findFirst({
          where: {
            locationId: transfer.sourceLocationId,
            productId: item.productId,
          },
        });

        if (!balance) {
          throw new Error(`Item not stocked at source location`);
        }

        const available = balance.onHand.minus(balance.reserved);
        if (available.lessThan(item.requestedQty)) {
          throw new Error(
            `Insufficient stock at source: requested ${item.requestedQty}, available ${available}`
          );
        }

        // Reserve stock
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            reserved: balance.reserved.plus(item.requestedQty),
          },
        });
      }

      // Update transfer status
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.APPROVED,
          approvedById: userId,
        },
      });

      await tx.transferStatusHistory.create({
        data: {
          transferId: id,
          fromStatus: TransferStatus.PENDING_APPROVAL,
          toStatus: TransferStatus.APPROVED,
          changedById: userId,
          notes: 'Transfer approved; stock reserved at source',
        },
      });

      return updated;
    });

    res.json({ success: true, transfer: result });
  } catch (error: any) {
    console.error('Approve transfer error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// 4. Dispatch Transfer: Decrements onHand & reserved at source, moves into in-transit
router.post('/:id/dispatch', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { userId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!transfer) throw new Error('Transfer not found');
      if (transfer.status !== TransferStatus.APPROVED) {
        throw new Error(`Cannot dispatch transfer with status: ${transfer.status}`);
      }

      for (const item of transfer.items) {
        const balance = await tx.stockBalance.findFirst({
          where: {
            locationId: transfer.sourceLocationId,
            productId: item.productId,
          },
        });

        if (!balance) throw new Error('Stock balance not found');

        const newOnHand = balance.onHand.minus(item.requestedQty);
        const newReserved = balance.reserved.minus(item.requestedQty);

        if (newOnHand.lessThan(0) || newReserved.lessThan(0)) {
          throw new Error('Stock decrement integrity error');
        }

        await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            onHand: newOnHand,
            reserved: newReserved,
          },
        });

        // Update dispatched item qty
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { dispatchedQty: item.requestedQty },
        });

        // Record stock movement OUT at source
        await tx.stockMovement.create({
          data: {
            organizationId: transfer.organizationId,
            locationId: transfer.sourceLocationId,
            productId: item.productId,
            movementType: MovementType.TRANSFER_OUT,
            quantity: item.requestedQty,
            unitCost: balance.averageUnitCost,
            balanceAfter: newOnHand,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            reason: `Dispatched in transfer ${transfer.transferNumber}`,
          },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: TransferStatus.DISPATCHED },
      });

      await tx.transferStatusHistory.create({
        data: {
          transferId: id,
          fromStatus: TransferStatus.APPROVED,
          toStatus: TransferStatus.DISPATCHED,
          changedById: userId,
          notes: 'Goods packaged and dispatched; in-transit to destination',
        },
      });

      return updated;
    });

    res.json({ success: true, transfer: result });
  } catch (error: any) {
    console.error('Dispatch transfer error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// 5. Receive Transfer: Increments destination stock, recalculates weighted average cost
router.post('/:id/receive', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { userId, receivedItems } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!transfer) throw new Error('Transfer not found');
      if (transfer.status !== TransferStatus.DISPATCHED) {
        throw new Error(`Cannot receive transfer with status: ${transfer.status}`);
      }

      for (const item of transfer.items) {
        const receivedEntry = receivedItems?.find((r: any) => r.itemId === item.id);
        const receivedQty = receivedEntry
          ? new Prisma.Decimal(receivedEntry.quantity)
          : item.dispatchedQty || item.requestedQty;

        // Get source average cost to transfer value
        const sourceBalance = await tx.stockBalance.findFirst({
          where: {
            locationId: transfer.sourceLocationId,
            productId: item.productId,
          },
        });
        const transferUnitCost = sourceBalance?.averageUnitCost || new Prisma.Decimal(0);

        // Get or initialize destination stock balance
        let destBalance = await tx.stockBalance.findFirst({
          where: {
            locationId: transfer.destinationLocationId,
            productId: item.productId,
          },
        });

        if (!destBalance) {
          destBalance = await tx.stockBalance.create({
            data: {
              organizationId: transfer.organizationId,
              locationId: transfer.destinationLocationId,
              productId: item.productId,
              onHand: new Prisma.Decimal(0),
              reserved: new Prisma.Decimal(0),
              averageUnitCost: transferUnitCost,
            },
          });
        }

        // Weighted average cost formula
        const oldQty = destBalance.onHand;
        const oldCost = destBalance.averageUnitCost;
        const newOnHand = oldQty.plus(receivedQty);

        let newAverageCost = transferUnitCost;
        if (newOnHand.greaterThan(0)) {
          const totalValue = oldQty.mul(oldCost).plus(receivedQty.mul(transferUnitCost));
          newAverageCost = totalValue.div(newOnHand);
        }

        await tx.stockBalance.update({
          where: { id: destBalance.id },
          data: {
            onHand: newOnHand,
            averageUnitCost: newAverageCost,
          },
        });

        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQty },
        });

        // Record stock movement IN at destination
        await tx.stockMovement.create({
          data: {
            organizationId: transfer.organizationId,
            locationId: transfer.destinationLocationId,
            productId: item.productId,
            movementType: MovementType.TRANSFER_IN,
            quantity: receivedQty,
            unitCost: transferUnitCost,
            balanceAfter: newOnHand,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            reason: `Received from transfer ${transfer.transferNumber}`,
          },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: TransferStatus.COMPLETED },
      });

      await tx.transferStatusHistory.create({
        data: {
          transferId: id,
          fromStatus: TransferStatus.DISPATCHED,
          toStatus: TransferStatus.COMPLETED,
          changedById: userId,
          notes: 'Transfer verified and intake completed',
        },
      });

      return updated;
    });

    res.json({ success: true, transfer: result });
  } catch (error: any) {
    console.error('Receive transfer error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
