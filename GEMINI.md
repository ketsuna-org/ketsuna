# Project Overview: Ketsuna

Ketsuna is an **Idle Tycoon Web Game** built with **SvelteKit** and **PocketBase**. Players manage companies, build factories, manage resources, and participate in a virtual economy including a stock market.

## 🚀 Tech Stack

- **Frontend**: [Svelte 5](https://svelte.dev/) (using SvelteKit)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend/DB**: [PocketBase](https://pocketbase.io/) (Primary) & [Firebase](https://firebase.google.com/) (Secondary/Legacy Auth)
- **Canvas/Graphics**: [Konva](https://konvajs.org/) (via `svelte-konva`) and [@xyflow/svelte](https://svelte.flow.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Environment**: [devenv](https://devenv.sh/) (Nix-based)
- **Deployment**: Static build (via `@sveltejs/adapter-static`) targeted for Cloudflare Pages.

## 📂 Project Structure

- `src/lib/`: Core application logic.
    - `pocketbase.ts`: Typed PocketBase client and collection definitions.
    - `services/`: Business logic for game mechanics (company, employee, factory, market, etc.).
    - `components/`: UI components organized by feature (konva for canvas, machine, laboratory, nodes).
    - `stores/`: Svelte stores for state management (game data, refresh signals).
    - `data/`: Static game data, recipes, and wiki content (Markdown).
    - `types/`: Global TypeScript interfaces.
- `src/routes/`: SvelteKit pages and layouts.
    - `/factory`: Main factory management interface.
    - `/world`: World map and exploration.
    - `/employees`: Staff management.
    - `/laboratory`: Technology and R&D.
    - `/wiki`: Game documentation and guides.
- `.agent/rules/`: Specific AI agent guidelines for PocketBase and code conduct.

## 🛠 Building and Running

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
# Generate static build in /build directory
npm run build

# Preview the build locally
npm run preview
```

### Environment Setup
If you use `direnv` and `nix`, the environment will load automatically. Otherwise:
```bash
devenv up
```

## 📜 Development Conventions

1.  **PocketBase Integration**:
    - Always use the typed client in `src/lib/pocketbase.ts`.
    - Use `expand` to minimize API calls (jointures).
    - Refer to `pb_schema.json` for exact field names and types.
2.  **Svelte 5**:
    - The project uses Svelte 5 snippets and runes. Follow modern Svelte patterns.
3.  **State Management**:
    - Use `src/lib/stores/` for global state.
    - Preference for derived stores or dedicated refresh stores (`graphRefreshStore`, `machineRefreshStore`) to trigger UI updates.
4.  **Icons**: Custom game icons are located in `src/lib/components/GameIcon.svelte`.
5.  **Styling**: Use Tailwind CSS classes. The project uses the new Vite plugin for Tailwind v4.

## 📊 Key Data Entities

- **Company**: The player's main entity (balance, level, ceo).
- **Machine**: Placed in the factory, uses **Recipes** to transform items.
- **Deposit**: Resource nodes for harvesting.
- **Employee**: Assigned to machines, deposits, or exploration.
- **Item/Inventory**: Static definitions in `game-static.ts` and dynamic records in PocketBase.
