<script lang="ts">
    /**
     * FilterBar - Composant de filtrage réutilisable pour toutes les pages
     *
     * @param searchQuery - Bindable search string
     * @param placeholder - Placeholder for search input
     * @param filters - Array of filter options {label, value, options}
     * @param selectedFilters - Bindable object with selected filter values
     */

    interface FilterOption {
        label: string;
        value: string;
        options: { label: string; value: string }[];
    }

    let {
        searchQuery = $bindable(""),
        placeholder = "Rechercher...",
        filters = [],
        selectedFilters = $bindable({} as Record<string, string>),
        onSearch = null,
    } = $props<{
        searchQuery?: string;
        placeholder?: string;
        filters?: FilterOption[];
        selectedFilters?: Record<string, string>;
        onSearch?: (() => void) | null;
    }>();

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        searchQuery = target.value;
        onSearch?.();
    }

    function handleFilterChange(filterKey: string, value: string) {
        selectedFilters = { ...selectedFilters, [filterKey]: value };
        onSearch?.();
    }

    function clearFilters() {
        searchQuery = "";
        selectedFilters = {};
        onSearch?.();
    }

    let hasActiveFilters = $derived(
        searchQuery.length > 0 ||
            Object.values(selectedFilters).some((v) => v !== "" && v !== "all"),
    );
</script>

<div
    class="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
>
    <!-- Search Input -->
    <div class="relative flex-1">
        <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
        <input
            type="text"
            value={searchQuery}
            oninput={handleInput}
            {placeholder}
            class="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
    </div>

    <!-- Filter Dropdowns -->
    {#each filters as filter}
        <select
            value={selectedFilters[filter.value] || ""}
            onchange={(e) =>
                handleFilterChange(
                    filter.value,
                    (e.target as HTMLSelectElement).value,
                )}
            class="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
        >
            <option value="">{filter.label}</option>
            {#each filter.options as opt}
                <option value={opt.value}>{opt.label}</option>
            {/each}
        </select>
    {/each}

    <!-- Clear Button -->
    {#if hasActiveFilters}
        <button
            onclick={clearFilters}
            class="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
            ✕ Effacer
        </button>
    {/if}
</div>
