# SpendLens

**See every rupee. Keep more of it.**

A mobile-first, private personal money tracker built with React, Vite, TypeScript, Tailwind CSS, Dexie, Zustand and Recharts. No backend, login, bank connection, analytics, or SMS access.

## Run locally

Requires Node.js 24 LTS and npm. A `.nvmrc` is included for nvm users.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://localhost:5173). The app fits a 480px column on larger screens. Complete the three-slide introduction, enter your monthly take-home salary, then confirm a balanced split. Settings → **Load demo data** provides two months of example transactions and category budgets; it asks before replacing existing data.

## Test, build and preview

```sh
npm test
npm run build
npm run preview
```

The production app is generated in `dist/`. Preview normally runs at http://localhost:4173. Service workers are enabled in production builds; use the production preview to test installation and offline reloads. Wait for the first load to finish before going offline. `npm run icons` regenerates PNG and maskable icons from `public/logo.svg` (the generated icons are already included).

## Features

- First-launch onboarding with salary and adjustable ratio or rupee allocations; four quick presets.
- Exact integer-paise amounts, Indian currency grouping, largest-remainder allocation, and live validation.
- Monthly budget snapshots, automatic carry-forward, and a new-month review prompt. Editing today's plan leaves past snapshots intact.
- Custom subcategories across Needs, Wants and Savings: limits, names, icons, reorder arrows, safe removal, unallocated totals and over-allocation warnings.
- Dashboard with today's spend, salary, remaining bucket budgets, expandable subcategories and recent transactions.
- Expense sheet with remembered category/subcategory, note, date, editing, confirmed deletion, undo and over-limit warnings.
- Transactions grouped by day, month navigation, search, bucket/subcategory filters and date ranges.
- Recharts donut and Monday-based weekly chart, sorted subcategory spending, budget comparisons, top expenses and data-driven observations.
- System, light and dark themes; locally bundled Inter; keyboard-accessible dialogs, reduced-motion support and focus states.
- Validated JSON backup/restore, transaction CSV export, confirmed demo replacement and double-confirmed reset.
- Installable, offline-first PWA with service worker, 192/512px regular and maskable icons, Apple touch icon, update notice and install guidance.
- Optional daily notification with a time picker, subject to the browser limitations below.

## Data and calculation assumptions

- All stored amounts, including salary and category limits, are **integer paise**. Forms accept rupees with up to two decimal places. A salary must be greater than zero; bucket allocations can be zero.
- Ratio mode accepts percentages to two decimals and requires exactly 100%. Amount mode requires allocations to equal the salary; it preserves the exact allocation weights when the salary changes. Largest-remainder allocation uses BigInt multiplication so every paise is assigned consistently.
- Savings contributions are logged in the same way as expenses and count toward the salary allocated/used, today's total and chart totals. The interface labels savings progress accordingly.
- Transactions can be dated today or earlier, starting in 2000. Future-dated entries and recurring automatic transactions are outside this app's scope.
- Monthly salary, bucket amounts, and category records/limits are snapshotted. A new month clones the most recent previous plan, including any month gaps. When you add a transaction to a past month without a snapshot, its starting plan is the nearest earlier snapshot, or the current setup if there is no earlier snapshot. Past budgets are read-only; their transactions remain editable.
- Removing a subcategory archives it so existing entries remain readable. Renaming current subcategories does not rename snapshots from past months. Reorder arrows work with both touch and keyboard.
- Weekly charts group dates by their Monday. The first/last week can cross a month boundary; only transactions from the selected month contribute.
- Demo data uses a ₹70,000 salary and includes dates up to today in the current month, plus a complete sample prior month. Early in a month, current charts naturally have fewer entries.

## Privacy, storage and backups

IndexedDB database **SpendLens** contains `settings`, `categories`, `transactions`, and `monthlyBudgets`. Zustand supplies the in-memory UI state; Dexie writes are the source of truth. Multi-table imports, plan changes, reset and demo loading are atomic IndexedDB transactions. Import validates format/version, money amounts, references, dates, duplicate keys, and budget totals before replacing data. CSV exports escape formula-like text.

Everything stays in the browser profile for the deployed origin. A different browser, device or hostname has separate storage. Clearing site data or uninstalling with data removal may erase entries. Backups are plain JSON and should be stored privately. Export JSON before moving devices, resetting or restoring a different backup; CSV is a transaction report, not a restorable backup.

## PWA and reminders

Installation requires HTTPS (localhost is allowed) and browser support. Chromium can show the native **Install app** button after its installability checks. On iPhone/iPad use **Safari → Share → Add to Home Screen**. The complete app, charts, icons and fonts are precached, so no remote font requests are needed after installation.

The Notifications API does **not** provide reliable scheduled local wake-ups across browsers. With permission, SpendLens checks the chosen time while open and visible, sends at most one service-worker notification per day, and checks again when reopened. It does not promise notifications while closed. Exact background reminders would require a server/push service or a native app, which would change the no-backend requirement. See [MDN Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API). Service worker registration and update handling follow the [vite-plugin-pwa React integration](https://vite-pwa-org.netlify.app/frameworks/react.html).

## Deploy

### Vercel

Import this directory as a Git repository. Select the **Vite** framework preset, build command `npm run build`, and output directory `dist`. There are no environment variables or server dependencies. Deploy at the domain root.

### Netlify

Import the repository. Use build command `npm run build` and publish directory `dist`. `netlify.toml` is included. No functions or environment variables are required. Deploy at the domain root.

Both hosts provide HTTPS. Avoid putting authentication-gated pages, `sw.js`, or `manifest.webmanifest` behind a redirect or changing the origin without exporting a backup. The app uses tab state rather than URL routes, so no SPA fallback configuration is necessary.

## Project structure

```text
src/
  components/  Shared UI, sheets, budget editor, category manager
  screens/     Onboarding, Home, Transactions, Insights, Settings
  store/       Zustand actions and data hydration
  db/          Dexie schema and default categories
  utils/       Money, dates, validated backup and CSV helpers
  hooks/       Theme, month rollover, reminders, PWA lifecycle
  types.ts     Data contracts
scripts/       SVG-to-PNG icon generation
tests/         Money arithmetic, snapshots, backup validation and Monday grouping
public/        Local logo and install icons
```

## Verification

- 14 automated tests cover paise arithmetic, exact splits, remaining amounts, monthly carry-forward, historical snapshot isolation, archival, transaction recovery and safe backup restore.
- TypeScript and the optimized production build pass; the charts load as a separate precached bundle.
- Browser checks covered onboarding, invalid splits, amount-mode salary changes, mobile layout, both themes, expense save/undo, confirmed deletion/recovery, search, category over-allocation, past-month charts and JSON export/restore.
- Offline reload and chart loading were verified with the preview server stopped. Native install prompts and notification delivery still depend on the device/browser.
- `npm audit --omit=dev` reports no production dependency vulnerabilities. The full audit currently reports four low-severity transitive build-tool advisories in the Workbox dependency chain.

## Liquid-glass navigation

The bottom dock uses the supplied Nimbus UI “Waterline” component (attributed in its source), wired to SpendLens’s four screens. It follows the app theme, keeps labels visible on phones, supports arrow-key navigation, pauses when hidden, respects reduced motion, and uses a CSS fallback when WebGL is unavailable. Tap sound is disabled.

Reusable registry components live in `src/components/ui/`, separate from app-specific components in `src/components/`. The `@/` alias resolves to `src/` in TypeScript and Vite. `components.json` points shadcn-compatible tooling at this folder, `src/index.css` (Tailwind v4), and the shared `cn` helper. React, TypeScript and Tailwind were already configured, so no CLI migration is needed. The standalone supplied example is `src/components/ui/liquid-glass-navbar.demo.tsx`.

The three dashboard bucket cards use `src/components/ui/glowing-shadow.tsx` with colocated CSS. The supplied effect is adapted for Vite (no styled-jsx dependency): animated category-colored borders, soft shadows, pointer lighting and touch feedback. Needs remains indigo, Wants pink and Savings teal; reduced motion disables animation, and the effect pauses off-screen.
