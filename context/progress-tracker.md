# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Prisma Setup (04-prisma-setup.md)

## Completed

- Implement Design System (01-design-system.md)
- Implement Auth (02-auth.md)
  - Added @clerk/ui
  - Hid sign up option on SignIn page
  - Enforced light theme in ClerkProvider
- Implement Dashboard UI (03-dashboardDesign.md)
  - Created static Dashboard UI for admin-manager
- Prisma Setup (04-prisma-setup.md)
  - Created Prisma schema with all models
  - Ran initial migration
  - Seeded database with GST slabs and admin user
- **Outlet Authentication Refactor**
  - Removed `cashier`/`biller` user roles entirely.
  - Upgraded Outlets to act as authenticated entities (`clerkUserId` added to `Outlet` model).
  - Cleaned up relations (`outletId` removed from `User`, `createdById` removed from `Bill`).
  - Rewrote all `@context` markdown specs to reflect the new Outlet POS model.
  - Updated API validation schemas (`lib/validators/index.ts`) for user and outlet creation.
  - Pushed updated schema to live database (`npx prisma db push --accept-data-loss`).

## In Progress

- None yet.


## Next Up

- [First unit to build]

## Open Questions

- [Any unresolved product or technical decisions]

## Architecture Decisions

- **Outlet Identity over Cashier Users**: Removed the concept of assigning a user with a `cashier` role to an outlet. Instead, the physical outlet itself logs into the POS system using an outlet-specific email and password via Clerk. This removes the need to scope users to specific outlets, greatly simplifying data relations and guaranteeing isolated POS sessions.

## Session Notes

- [Context needed to resume work in the next session]
