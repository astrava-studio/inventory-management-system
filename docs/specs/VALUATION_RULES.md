# Inventory Valuation Specification — Perpetual Weighted Average Cost

## 1. Overview
The ASTRAVA Inventory Management System calculates inventory valuation using the **Perpetual Weighted Average Cost** method on a per-product, per-location basis.

$$ \text{Weighted Average Unit Cost} = \frac{\text{Current Total Value} + \text{Incoming Total Value}}{\text{Current Quantity on Hand} + \text{Incoming Quantity}} $$

---

## 2. Invariant Rules

1. **Floating-point Math Prohibition:**  
   All monetary calculations and quantities must use fixed-point arithmetic (`Decimal(12, 4)` for quantities, `Decimal(14, 2)` for currency) in Node.js via `decimal.js` or `Prisma.Decimal`. Floating-point IEEE-754 numbers (`number` in TS) are prohibited for inventory and currency calculations.

2. **Incoming Stock (Goods Receipts / Purchase):**  
   - Given:
     - $Q_0$: Current on-hand quantity
     - $C_0$: Current weighted average unit cost
     - $Q_{\text{in}}$: Newly received quantity
     - $P_{\text{in}}$: Purchase price per unit of newly received goods
   - New Weighted Average Cost ($C_{\text{new}}$):
     $$ C_{\text{new}} = \frac{(Q_0 \times C_0) + (Q_{\text{in}} \times P_{\text{in}})}{Q_0 + Q_{\text{in}}} $$
   - The balance record `average_unit_cost` is updated to $C_{\text{new}}$ atomically with the creation of the `PURCHASE_RECEIPT` stock movement.

3. **Outgoing Stock (Sales / Stock Out / Transfers Out):**  
   - Outgoing quantities leave at the current average unit cost $C_0$.
   - **Unit cost does not change** during outgoing movements.
   - Total inventory value reduces proportionally:  
     $$ V_{\text{new}} = (Q_0 - Q_{\text{out}}) \times C_0 $$

4. **Inter-Location Transfers:**  
   - The unit cost at the source location at dispatch time is transferred as the incoming unit cost to the destination location.
   - Destination location recalculates its weighted average cost using its existing stock and the incoming transferred stock and cost.

5. **Adjustments:**  
   - **Positive Adjustments (Found stock):** Evaluated at the current weighted average unit cost (or standard replacement cost if on-hand was 0).
   - **Negative Adjustments (Damaged / Lost / Expired):** Reduce on-hand inventory value at the current weighted average cost, with zero impact on the unit cost.
