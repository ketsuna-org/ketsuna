# Ketsuna Project Instructions

## Project Overview
Ketsuna is a modern web application built with **SvelteKit**, deployed to **Cloudflare Pages/Workers**, and using **PocketBase** as the backend.

## Tech Stack
- **Framework**: SvelteKit (v2)
- **UI Library**: Svelte 5 (Runes syntax required)
- **Styling**: Tailwind CSS v4 (configured via `@tailwindcss/vite`)
- **Backend/DB**: PocketBase
- **Runtime/Deployment**: Cloudflare (`@sveltejs/adapter-cloudflare`)
- **Package Manager**: Bun
- **Environment**: Devenv (Nix-based)

## Core Architecture

### SvelteKit & Cloudflare
- This project uses `adapter-cloudflare`. Ensure all server-side code is compatible with the Cloudflare Workers runtime (Edge).
- Avoid Node.js specific APIs (like `fs`, `path`) in runtime code.
- Use `platform.env` to access Cloudflare bindings (KV, D1, etc.) if needed.

### PocketBase Integration
- PocketBase is installed (`pocketbase` package).
- Initialize the PocketBase client in a singleton (e.g., `src/lib/pocketbase.ts`).
- For server-side usage, ensure you handle authentication state properly (e.g., passing auth store to client).

## Coding Standards

### Svelte 5 (Runes)
- **ALWAYS** use Svelte 5 Runes syntax.
- Use `$state()` for reactive state.
- Use `$derived()` for computed values.
- Use `$effect()` for side effects.
- Use `$props()` for component props.
- **DO NOT** use legacy Svelte 4 syntax (`export let`, `$:`, etc.).

### Tailwind CSS v4
- Use utility classes directly in markup.
- Configuration is handled in `src/routes/layout.css` and `vite.config.ts`.
- Use `@apply` sparingly; prefer utility classes.

### TypeScript
- Use strict typing.
- Define interfaces/types in `src/lib/types.ts` or co-located with components if specific.
- Use `app.d.ts` for global app types (Locals, Platform, etc.).

## Development Workflow

### Environment
- The project uses `devenv`. Run `devenv up` or enter `devenv shell` to ensure all dependencies are available.
- Use `bun` for script execution.

### Commands
- **Dev Server**: `bun run dev --open`
- **Build**: `bun run build`
- **Type Check**: `bun run check`
- **Lint**: `bun run lint`

## Directory Structure
- `src/lib/`: Shared utilities, components, and PocketBase client.
- `src/routes/`: SvelteKit file-based routing.
- `static/`: Static assets.
