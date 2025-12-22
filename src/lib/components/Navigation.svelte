<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    export let currentPage: string;
    let mobileMenuOpen = false;

    function navigateTo(pageName: string) {
        mobileMenuOpen = false;
        switch (pageName) {
            case "companies":
                goto("/compagnies");
                break;
            case "employees":
                goto("/employes");
                break;
            case "financial":
                goto("/rapports");
                break;
            case "dashboard":
                goto("/dashboard");
                break;
        }
    }

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }
</script>

<nav class="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
    <!-- Desktop Navigation -->
    <div class="hidden md:flex flex-wrap gap-4 justify-center">
        <button
            on:click={() => navigateTo("companies")}
            class="px-4 py-2 rounded transition duration-300 {currentPage ===
            'companies'
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:bg-white/20'}"
        >
            🏢 Compagnies
        </button>
        <button
            on:click={() => navigateTo("employees")}
            class="px-4 py-2 rounded transition duration-300 {currentPage ===
            'employees'
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:bg-white/20'}"
        >
            👥 Employés
        </button>
        <button
            on:click={() => navigateTo("financial")}
            class="px-4 py-2 rounded transition duration-300 {currentPage ===
            'financial'
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:bg-white/20'}"
        >
            📊 Rapports Financiers
        </button>
        <button
            on:click={() => navigateTo("dashboard")}
            class="px-4 py-2 rounded transition duration-300 {currentPage ===
            'dashboard'
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:bg-white/20'}"
        >
            📈 Tableau de Bord
        </button>
    </div>

    <!-- Mobile Navigation -->
    <div class="md:hidden">
        <button
            on:click={toggleMobileMenu}
            class="w-full flex items-center justify-between px-4 py-2 text-white"
            aria-label="Toggle menu"
        >
            <span class="font-semibold">Menu</span>
            <svg
                class="w-6 h-6 transition-transform {mobileMenuOpen
                    ? 'rotate-180'
                    : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </button>

        {#if mobileMenuOpen}
            <div class="mt-2 space-y-2 animate-slide-down">
                <button
                    on:click={() => navigateTo("dashboard")}
                    class="w-full text-left px-4 py-2 rounded transition duration-300 {currentPage ===
                    'dashboard'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-white/20'}"
                >
                    📈 Tableau de Bord
                </button>
                <button
                    on:click={() => navigateTo("companies")}
                    class="w-full text-left px-4 py-2 rounded transition duration-300 {currentPage ===
                    'companies'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-white/20'}"
                >
                    🏢 Compagnies
                </button>
                <button
                    on:click={() => navigateTo("employees")}
                    class="w-full text-left px-4 py-2 rounded transition duration-300 {currentPage ===
                    'employees'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-white/20'}"
                >
                    👥 Employés
                </button>
                <button
                    on:click={() => navigateTo("financial")}
                    class="w-full text-left px-4 py-2 rounded transition duration-300 {currentPage ===
                    'financial'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-white/20'}"
                >
                    📊 Rapports Financiers
                </button>
            </div>
        {/if}
    </div>
</nav>

<style>
    @keyframes slide-down {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-down {
        animation: slide-down 0.2s ease-out;
    }
</style>
