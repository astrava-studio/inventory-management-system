# Concurrency & Transaction Strategy Specification

## 1. Goal
Ensure zero negative stock balances and eliminate race conditions under concurrent operations (e.g., two users issuing stock simultaneously).

---

## 2. PostgreSQL & Prisma Strategy

### A. Atomic Decrement with Invariant Guard
Direct atomic SQL execution inside transaction:
```sql
UPDATE stock_balances
SET 
    on_hand = on_hand - $delta,
    updated_at = NOW()
WHERE 
    organization_id = $orgId 
    AND location_id = $locationId 
    AND product_id = $productId
    AND (on_hand - reserved) >= $delta
RETURNING *;
```
If 0 rows are returned, the decrement violates the non-negative available quantity invariant and the transaction aborts with `INSUFFICIENT_STOCK`.

### B. Pessimistic Row Locking (`SELECT ... FOR UPDATE`)
For multi-item stock transfers, adjustments, and receipts:
```typescript
await prisma.$transaction(async (tx) => {
  // Lock target row across concurrent readers
  const balance = await tx.$queryRaw`
    SELECT * FROM stock_balances 
    WHERE organization_id = ${orgId} 
      AND location_id = ${locationId} 
      AND product_id = ${productId}
    FOR UPDATE
  `;
  
  // Safe validation and arithmetic
  // Write movements and balance updates
});
```

### C. Unique Constraints
- `stock_balances`: Unique on `(organization_id, location_id, product_id)`.
- `products`: Unique on `(organization_id, sku)`.
- `locations`: Unique on `(organization_id, code)`.
