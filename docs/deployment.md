# Deployment

## Default Target: Cloudflare Pages

Use these Cloudflare Pages project settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root

Set these environment variables when Supabase auth and sync should be enabled:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Before testing sync, apply `supabase/schema.sql` to the Supabase project.

Cloudflare-specific files are copied from `public/` into `dist/` during build:

- `_redirects`: routes all SPA paths back to `index.html`
- `_headers`: sets service worker cache behavior and basic security headers

## Deploy From Dashboard

1. Create a Cloudflare Pages project.
2. Connect the Git repository.
3. Select `Vite` as the framework preset.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Add Supabase environment variables if auth and sync should be enabled.
7. Deploy.

## Optional: Vercel

`vercel.json` is kept as a fallback configuration, but Cloudflare Pages is the default deployment target for this project.

## Acceptance Checklist

1. Open the deployed URL on desktop.
2. Confirm Dashboard loads.
3. Enter Practice and answer one question.
4. Return to Dashboard and confirm local progress updates.
5. Open the deployed URL on a phone browser.
6. Start Mock exam and confirm the timer is visible while scrolling.
7. Sign in with the same Supabase account on desktop and phone.
8. On desktop, bookmark a question, mark it guessed, and add a note.
9. Click Sync.
10. On phone, click Sync with the same account.
11. Confirm the bookmark, guessed marker, and note are present on the phone.
12. Temporarily block network or use a bad Supabase config and confirm local Practice still works.
