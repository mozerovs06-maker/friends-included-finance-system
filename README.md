# Friends Included Finance System

Production-oriented Day 4 homework application for the fictional Wedding Guests for Hire company. The Next.js website, Telegram webhook, and Google Sheets delivery worker share one validated server-side domain layer, while Supabase remains the source of truth.

## Architecture

- Next.js App Router and TypeScript on Vercel
- Supabase Postgres with RLS, database constraints, unique references, and an idempotent decision function
- Telegram Bot API webhook for `/start`, `/status`, `/sale`, and `/expense`
- Google Sheets API row upserts keyed by transaction reference
- Integer cents for money and deterministic commission rounding
- Exact S01–S05 and E01–E07 homework seed, with S05 and E07 left pending

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local`; keep it uncommitted.
3. Create a Supabase project and run `supabase/migrations/001_initial.sql` in the SQL editor.
4. Add `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
5. Run `pnpm seed` once. It inserts the exact homework records and never clears the database.
6. Run `pnpm dev`, then open `http://localhost:3000`.

Without Supabase configuration, the UI intentionally displays a read-only preview of the exact seed totals so the design can be reviewed. Writes require Supabase.

## Telegram setup

1. Create a bot with BotFather and place its token in `TELEGRAM_BOT_TOKEN` locally or in Vercel.
2. Set a long random `TELEGRAM_WEBHOOK_SECRET`.
3. Deploy the app, then set the webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR-DOMAIN/api/telegram/webhook&secret_token=<WEBHOOK_SECRET>`
4. Start the bot in a private chat and copy the user ID returned by `/start`.
5. In Manager setup, use the separate `MANAGER_SETUP_KEY` to map that ID to a fictional employee.

Do not paste tokens into chat or commit them. Website-originated records can notify a linked employee; Telegram-originated records preserve their original employee and chat ID forever.

## Google Sheets setup

1. Create a Google Cloud project, enable the Google Sheets API, and create a service account.
2. Create a spreadsheet with tabs named `Sales`, `Expenses`, and optionally `Public Tests`.
3. Add the headers listed in the homework document.
4. Share the spreadsheet with the service-account email as Editor and give the instructor Viewer access.
5. Store the spreadsheet ID in `GOOGLE_SHEET_ID` and the compact service-account JSON in `GOOGLE_SERVICE_ACCOUNT_JSON` as server-only variables.

Synchronization searches column A for the reference and updates that row. A retry therefore cannot append a duplicate.

## Vercel deployment

1. Push this repository to your GitHub repository.
2. Import that repository in Vercel.
3. Add every variable from `.env.example` in Project Settings. Never expose service-role, bot, manager, or Google credentials with a `NEXT_PUBLIC_` prefix.
4. Deploy, set the Telegram webhook to the final URL, seed Supabase, and run the end-to-end checklist below.

## Verification checklist

- Role selector exposes the five fictional employees; manager controls remain server-protected.
- Salespeople submit only sales; Kevin submits only expenses.
- Pending sales do not affect totals; every recorded expense affects company result immediately.
- Commission pool is 10%; shares total 100%; rounding follows largest-share and Richard/Anastasia/Jean-Claude tie order.
- Original proposals and final decisions are both visible.
- Repeated manager decisions are idempotent.
- Telegram confirms only after Supabase saves and stores failures for retry.
- Google Sheets updates an existing reference row and stores failures for retry.
- Public `TST-` records are isolated from assessed totals.
- Seed totals are Project A €2,050, Project B €2,180, and company €3,930; team commissions are €140/€175/€215.
- S05 remains a €600 pending sale and E07 remains a €140 awaiting-allocation expense.
- Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before deployment.
