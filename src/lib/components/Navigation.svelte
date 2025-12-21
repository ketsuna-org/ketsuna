<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    export let currentPage: string;

    function navigateTo(pageName: string) {
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
</script>

<nav class="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
    <div class="flex flex-wrap gap-4 justify-center">
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
</nav>
