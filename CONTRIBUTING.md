# Contributing

Thanks for contributing to Commune Plus BackOffice.

## Setup

1. Install [pnpm](https://pnpm.io/) and Node.js 22+.
2. `pnpm install`
3. `cp .env.example .env` and fill in your own Firebase Admin / web, Resend, Cloudinary, and related values.

Never commit `.env`, service-account JSON files, or production secrets.

## Architecture conventions

In pages (`app/pages/**`) and UI components (`app/components/**`), do not call `useFetch`, `useAsyncData`, or `$fetch` directly.

Prefer composables under `app/composables/`:

- `useXxxService` — mutations and API methods
- `useXxxList` — list/read loading and refresh
- `useXxxPageState` — table/search/sort/pagination UI state

In `catch` blocks use `error: unknown` and `getErrorMessage(error, fallback)`.

## Development

```bash
pnpm dev
pnpm lint
pnpm typecheck
```

## Pull requests

- Keep changes focused; document significant decisions in `adr/` when relevant.
- Ensure lint and typecheck pass.
- Do not include secrets or production credentials.
