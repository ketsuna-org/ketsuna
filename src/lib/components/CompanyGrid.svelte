<script lang="ts">
    import { goto } from "$app/navigation";
    import type { CompanyWithCounts } from "$lib/services/companyLoader";
    import { filterCompanies } from "$lib/services/companyLoader";

    interface Props {
        companies: CompanyWithCounts[];
    }

    const { companies = [] }: Props = $props();

    let searchQuery = $state("");
    let sortBy = $state<"balance" | "name" | "employees" | "machines">(
        "balance",
    );
    let showNPC = $state(false);
    let minLevel = $state(0);
    let maxLevel = $state(100);

    let filteredCompanies = $derived.by(() => {
        return filterCompanies(companies, {
            search: searchQuery,
            sortBy,
            sortOrder: "desc",
            minLevel,
            maxLevel,
            hideNPC: !showNPC,
        });
    });

    function visitCompany(companyId: string) {
        goto(`/factory?visit=${companyId}`);
    }

    function getCompanyColor(company: CompanyWithCounts) {
        if (company.is_npc) {
            return "from-slate-700 to-slate-800";
        }

        const balance = company.balance || 0;
        if (balance > 1_000_000_000) {
            return "from-amber-600 to-amber-700";
        } else if (balance > 10_000_000) {
            return "from-indigo-600 to-indigo-700";
        } else if (balance > 100_000) {
            return "from-emerald-600 to-emerald-700";
        } else {
            return "from-slate-600 to-slate-700";
        }
    }

    function formatBalance(balance: number): string {
        if (balance >= 1_000_000_000) {
            return (balance / 1_000_000_000).toFixed(1) + "B";
        } else if (balance >= 1_000_000) {
            return (balance / 1_000_000).toFixed(1) + "M";
        } else if (balance >= 1_000) {
            return (balance / 1_000).toFixed(1) + "K";
        }
        return balance.toString();
    }

    function getLevelColor(level: number): string {
        if (level >= 80) return "text-amber-400";
        if (level >= 60) return "text-indigo-400";
        if (level >= 40) return "text-emerald-400";
        if (level >= 20) return "text-cyan-400";
        return "text-slate-400";
    }
</script>

<div
    class="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950"
>
    <!-- Header -->
    <div
        class="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800/50"
    >
        <div class="max-w-7xl mx-auto px-4 py-6">
            <div class="flex flex-col gap-6">
                <!-- Title -->
                <div>
                    <h1
                        class="text-4xl font-black text-white tracking-tight mb-2"
                    >
                        Carte du Monde
                    </h1>
                    <p class="text-slate-400">
                        {filteredCompanies.length} / {companies.length}
                        entreprise{companies.length !== 1 ? "s" : ""}
                    </p>
                </div>

                <!-- Search Bar -->
                <div class="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Rechercher une entreprise..."
                        bind:value={searchQuery}
                        class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                </div>

                <!-- Filters Row -->
                <div class="flex flex-wrap gap-3 items-center">
                    <!-- Sort Dropdown -->
                    <select
                        bind:value={sortBy}
                        class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                        <option value="balance">Trier par Balance</option>
                        <option value="name">Trier par Nom</option>
                        <option value="employees">Trier par Employés</option>
                        <option value="machines">Trier par Machines</option>
                    </select>

                    <!-- Level Range -->
                    <div class="flex items-center gap-2">
                        <label for="minLevel" class="text-xs text-slate-400"
                            >Niveau:</label
                        >
                        <input
                            id="minLevel"
                            type="number"
                            bind:value={minLevel}
                            min="0"
                            max="100"
                            class="w-12 px-2 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <span class="text-slate-500">-</span>
                        <input
                            type="number"
                            bind:value={maxLevel}
                            min="0"
                            max="100"
                            class="w-12 px-2 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <!-- NPC Toggle -->
                    <label
                        class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition"
                    >
                        <input
                            type="checkbox"
                            bind:checked={showNPC}
                            class="w-4 h-4"
                        />
                        <span>PNJ</span>
                    </label>

                    <!-- Results Count -->
                    <div class="ml-auto text-sm text-slate-400">
                        {filteredCompanies.length} résultat{filteredCompanies.length !==
                        1
                            ? "s"
                            : ""}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Companies Grid -->
    <div class="max-w-7xl mx-auto px-4 py-8">
        {#if filteredCompanies.length === 0}
            <div class="text-center py-16">
                <p class="text-3xl mb-2">🔍</p>
                <p class="text-slate-400 text-lg">
                    Aucune entreprise ne correspond à vos critères
                </p>
            </div>
        {:else}
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
                {#each filteredCompanies as company (company.id)}
                    <button
                        type="button"
                        class="group relative overflow-hidden rounded-xl bg-linear-to-br {getCompanyColor(
                            company,
                        )} p-4 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-200 hover:scale-105 text-left"
                        onclick={() => visitCompany(company.id)}
                    >
                        <!-- Gradient Overlay -->
                        <div
                            class="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent opacity-60"
                        ></div>

                        <!-- Content -->
                        <div class="relative z-10 h-full flex flex-col">
                            <!-- Header Section -->
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex-1">
                                    <h3
                                        class="text-white font-bold text-lg line-clamp-2"
                                    >
                                        {company.name}
                                    </h3>
                                    <p
                                        class="text-xs {getLevelColor(
                                            company.level,
                                        )} font-semibold mt-1"
                                    >
                                        Niveau {company.level}
                                    </p>
                                </div>
                                {#if company.is_npc}
                                    <span class="text-xl ml-2">🤖</span>
                                {:else}
                                    <span class="text-xl ml-2">🏢</span>
                                {/if}
                            </div>

                            <!-- CEO Info -->
                            {#if company.expand?.ceo}
                                <p class="text-xs text-slate-300 mb-3">
                                    CEO: <span class="font-semibold"
                                        >{company.expand.ceo.username}</span
                                    >
                                </p>
                            {/if}

                            <!-- Stats Grid -->
                            <div class="grid grid-cols-2 gap-2 mb-4">
                                <!-- Balance -->
                                <div class="bg-black/30 rounded-lg p-2">
                                    <p class="text-xs text-slate-400">
                                        Balance
                                    </p>
                                    <p class="text-white font-bold text-sm">
                                        {formatBalance(company.balance || 0)}
                                    </p>
                                </div>

                                <!-- Employees -->
                                <div class="bg-black/30 rounded-lg p-2">
                                    <p class="text-xs text-slate-400">
                                        Employés
                                    </p>
                                    <p
                                        class="text-white font-bold text-sm flex items-center gap-1"
                                    >
                                        👥 {company.employee_count}
                                    </p>
                                </div>

                                <!-- Machines -->
                                <div class="bg-black/30 rounded-lg p-2">
                                    <p class="text-xs text-slate-400">
                                        Machines
                                    </p>
                                    <p
                                        class="text-white font-bold text-sm flex items-center gap-1"
                                    >
                                        ⚙️ {company.machine_count}
                                    </p>
                                </div>

                                <!-- Level -->
                                <div class="bg-black/30 rounded-lg p-2">
                                    <p class="text-xs text-slate-400">
                                        Progression
                                    </p>
                                    <div
                                        class="w-full bg-slate-700 rounded h-1.5 mt-1"
                                    >
                                        <div
                                            class="bg-linear-to-r from-indigo-500 to-purple-500 h-full rounded"
                                            style="width: {company.level}%"
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Visit Button -->
                            <div class="mt-auto w-full">
                                <p
                                    class="text-xs text-slate-300 text-center font-semibold"
                                >
                                    Cliquez pour visiter
                                </p>
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        appearance: textfield;
    }
</style>
