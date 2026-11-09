# Onboarding — Inventory Management System

Welcome. This repository contains an ASTRAVA demonstration project for practical small-business inventory workflows.

## 1. Before you start

1. Make sure you have access to the astrava-studio/inventory-management-system repository.
2. Install Git and the editor/runtime required by the stack once it is selected.
3. Clone the repository and open the repository root in your editor.
4. Read these files in order:
   - README.md
   - docs/PROJECT_CONTEXT.md
   - docs/ASTRAVA_STUDIO_STANDARD.md

## 2. First AI-agent session

Use the coding agent and skills already installed on your machine. Do not install or copy another skill pack into this repository.

Paste this as the first task:

~~~text
You are joining the ASTRAVA Inventory Management System project.

First inspect the entire repository. Read README.md, docs/PROJECT_CONTEXT.md, docs/ASTRAVA_STUDIO_STANDARD.md, and docs/ONBOARDING.md.

Do not modify files, scaffold an app, install dependencies, or choose a framework yet.

Report:
1. What exists in the repository and what is missing.
2. The target user and the core inventory workflows.
3. The MVP candidates and the business rules that still need decisions.
4. Existing technical decisions and unresolved decisions.
5. A proposed implementation plan in small milestones.
6. Questions that need the project owner's decision.

Pay special attention to stock accuracy and traceability. Never silently overwrite stock quantities: stock changes should be represented by traceable transactions or adjustments with a reason. Do not invent business rules.

Follow the ASTRAVA Studio Working Standard. Use skills already installed in this environment; do not duplicate skills or agent configuration in the repository.
~~~

## 3. Agree the product scope before coding

The project owner should resolve at least:
- Single location or multiple locations.
- Product identifiers/SKUs, units of measure, and fractional quantities.
- Whether negative stock is prohibited.
- Stock-in, stock-out, and adjustment rules, including adjustment reasons.
- User roles and who may perform sensitive actions.
- Whether suppliers, purchase orders, valuation, and reports are in the MVP.
- Which dashboard information is genuinely useful.

Keep the first release small. Do not quietly expand into accounting, tax filing, warehouse automation, barcode hardware, multi-tenant SaaS, or payments.

## 4. First implementation milestones

1. Agree on MVP, business rules, stack, and architecture; record decisions.
2. Model products and stock movements, including validation and traceability.
3. Implement the smallest complete product and stock workflow.
4. Add low-stock visibility and history if included in the agreed MVP.
5. Add roles, reports, and optional workflows only when approved.
6. Test critical rules: stock cannot change incorrectly, adjustments are traceable, invalid quantities are rejected, and concurrent updates are handled appropriately for the chosen architecture.
7. Document setup, demo data, and verification steps.
8. Review with another founder before merging and demonstrating.

## 5. Before opening a pull request

Follow the shared definition of done in docs/ASTRAVA_STUDIO_STANDARD.md. Include tests actually run and explain any known limitations.

**Current status:** repository setup and planning. Confirm the actual MVP and stack before scaffolding.
