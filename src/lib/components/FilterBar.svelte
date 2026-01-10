<script lang="ts">
  /**
   * FilterBar - Composant de filtrage réutilisable pour toutes les pages
   *
   * @param searchQuery - Bindable search string
   * @param placeholder - Placeholder for search input
   * @param filters - Array of filter options {label, value, options}
   * @param selectedFilters - Bindable object with selected filter values
   * @param onFilterChange - Callback when filters change (debounced)
   * @param debounceMs - Debounce delay in ms for search input (default 300)
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
    onFilterChange = null,
    debounceMs = 300,
    class: className = "",
  } = $props<{
    searchQuery?: string;
    placeholder?: string;
    filters?: FilterOption[];
    selectedFilters?: Record<string, string>;
    onFilterChange?:
      | ((filters: {
          searchQuery: string;
          selectedFilters: Record<string, string>;
        }) => void)
      | null;
    debounceMs?: number;
    class?: string;
  }>();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function triggerFilterChange(immediate = false) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (!onFilterChange) return;

    const doTrigger = () => {
      onFilterChange?.({ searchQuery, selectedFilters });
    };

    if (immediate) {
      doTrigger();
    } else {
      debounceTimer = setTimeout(doTrigger, debounceMs);
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
    triggerFilterChange(false); // Debounced for typing
  }

  function handleFilterChange(filterKey: string, value: string) {
    selectedFilters = { ...selectedFilters, [filterKey]: value };
    triggerFilterChange(true); // Immediate for dropdown changes
  }

  function clearFilters() {
    searchQuery = "";
    selectedFilters = {};
    triggerFilterChange(true); // Immediate
  }

  let hasActiveFilters = $derived(
    searchQuery.length > 0 ||
      Object.values(selectedFilters).some((v) => v !== "" && v !== "all")
  );
</script>

<div
  class="flex flex-col sm:flex-row gap-3 p-4 bg-[#1e293b] rounded-xl border border-[#334155] shadow-sm relative overflow-hidden {className}"
>
  <!-- Background accent -->
  <div
    class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"
  ></div>

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
      class="w-full pl-10 pr-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white font-medium text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all uppercase placeholder:normal-case tracking-wide shadow-inner"
    />
  </div>

  <!-- Filter Dropdowns -->
  {#each filters as filter}
    <div class="relative">
      <select
        value={selectedFilters[filter.value] || ""}
        onchange={(e) =>
          handleFilterChange(
            filter.value,
            (e.target as HTMLSelectElement).value
          )}
        class="appearance-none pl-3 pr-8 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500 transition-all cursor-pointer hover:border-[#475569] shadow-inner min-w-[140px]"
      >
        <option value="" class="bg-[#0f172a] text-slate-400 font-normal"
          >{filter.label}</option
        >
        {#each filter.options as opt}
          <option value={opt.value} class="bg-[#0f172a] font-medium"
            >{opt.label}</option
          >
        {/each}
      </select>
      <div
        class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
        >
      </div>
    </div>
  {/each}

  <!-- Clear Button -->
  {#if hasActiveFilters}
    <button
      onclick={clearFilters}
      class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-[#334155] rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-[#475569]"
    >
      ✕ Effacer
    </button>
  {/if}
</div>
