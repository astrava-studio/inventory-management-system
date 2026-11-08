# Inventory Management System — Project Context

## Purpose
Create an inventory application for small businesses to maintain product records and understand stock levels and movement.

## Primary user
A small-business owner or staff member responsible for products and stock. Keep workflows understandable for non-technical users.

## Core workflows to explore
1. Create and maintain product records.
2. Group or categorize products.
3. Record stock received.
4. Record stock issued or sold.
5. Make a controlled adjustment with a reason.
6. Review current stock and low-stock items.
7. Inspect a product's movement history.

## MVP candidates
Dashboard; product catalogue with search and filters; stock-in, stock-out and adjustments; low-stock thresholds; supplier records; movement history; basic reports. The project owner decides which belong in the first release.

## Business rules to decide
- Single-location or multi-location inventory
- SKU and product identifier rules
- Units of measure and fractional quantities
- Whether negative stock is prohibited
- Who can perform adjustments
- Whether purchase orders are in scope
- Whether stock valuation is required and how it is calculated
- Which reports are useful to the target user

Every stock change should be traceable to a transaction or adjustment record. Do not silently overwrite quantities without history.

## Non-goals unless approved
Full accounting/tax software, complex procurement, warehouse automation, barcode hardware integration, multi-tenant SaaS infrastructure, or payment processing.

## Technical status
No framework, database, authentication approach, or deployment platform is prescribed yet. Inspect the repository and agree on architecture before generating the application.

## AI agent guidance
- Inspect the repository and this document before proposing changes.
- Ask the project owner to resolve important product and architecture decisions; do not invent business rules.
- Use relevant skills already installed in the agent environment. Do not duplicate skill definitions in the repository.
- Document setup, environment variables, and verification commands once chosen.
- Never commit secrets or real business/customer data.
- Never claim a feature is implemented or tested unless verified.

**Project status:** Initial repository setup. Update this as milestones are completed.
