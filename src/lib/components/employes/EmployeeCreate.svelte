<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";

    let name = "";
    let position = "";
    let department = "";
    let company = "";
    let salary = "";
    let loading = false;
    let error = "";
    let userCompanies: any[] = [];

    const dispatch = createEventDispatcher();

    onMount(async () => {
        await loadUserCompanies();
    });

    async function loadUserCompanies() {
        try {
            userCompanies = await pb.collection("companies").getFullList({
                filter: `owner = "${pb.authStore.model?.id}"`,
            });
        } catch (err: any) {
            error = "Erreur lors du chargement des entreprises";
        }
    }

    async function createEmployee() {
        if (!name.trim() || !position.trim()) {
            error = "Le nom et le poste sont requis";
            return;
        }

        if (!company) {
            error = "Veuillez sélectionner une entreprise";
            return;
        }

        loading = true;
        error = "";

        dispatch("create", {
            name: name.trim(),
            position: position.trim(),
            department: department || null,
            company: company,
            salary: salary ? parseFloat(salary) : null,
        });
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

<div class="bg-white/10 backdrop-blur-sm rounded-lg p-8">
    <h2 class="text-3xl font-bold mb-6">Embaucher un Nouvel Employé</h2>

    {#if error}
        <div class="bg-red-500 text-white p-4 rounded mb-6">
            {error}
        </div>
    {/if}

    <form on:submit|preventDefault={createEmployee} class="space-y-6">
        <!-- Sélection de l'entreprise -->
        <div>
            <label for="company" class="block text-white mb-2 font-semibold">
                Entreprise *
            </label>
            <select
                id="company"
                bind:value={company}
                class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white focus:outline-none focus:border-white"
                required
            >
                <option value="">Sélectionner une entreprise</option>
                {#each userCompanies as comp}
                    <option value={comp.id}>{comp.name}</option>
                {/each}
            </select>
        </div>
        <div>
            <label for="name" class="block text-white mb-2 font-semibold">
                Nom complet *
            </label>
            <input
                id="name"
                type="text"
                bind:value={name}
                class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
                placeholder="Prénom Nom"
                required
            />
        </div>

        <div>
            <label for="position" class="block text-white mb-2 font-semibold">
                Poste *
            </label>
            <input
                id="position"
                type="text"
                bind:value={position}
                class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
                placeholder="Directeur Commercial, Développeur, etc."
                required
            />
        </div>

        <div>
            <label for="department" class="block text-white mb-2 font-semibold">
                Département
            </label>
            <select
                id="department"
                bind:value={department}
                class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white focus:outline-none focus:border-white"
            >
                <option value="">Sélectionner un département</option>
                <option value="management">Management</option>
                <option value="operations">Opérations</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Ventes</option>
                <option value="rd">R&D</option>
            </select>
        </div>

        <div>
            <label for="salary" class="block text-white mb-2 font-semibold">
                Salaire mensuel
            </label>
            <input
                id="salary"
                type="number"
                bind:value={salary}
                class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
                placeholder="3000"
                min="0"
                step="100"
            />
        </div>

        <div class="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h3 class="font-semibold mb-2">Informations sur l'embauche</h3>
            <p class="text-sm text-gray-300">
                Le nouvel employé commencera avec des statistiques de base
                (performance, compétence, morale) qui évolueront avec le temps.
                Vous pourrez les ajuster et les améliorer via les formations et
                les promotions.
            </p>
        </div>

        <div class="flex gap-4">
            <button
                type="submit"
                disabled={loading}
                class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                {loading ? "Embauche..." : "Embaucher l'employé"}
            </button>
            <button
                type="button"
                on:click={cancel}
                class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                Annuler
            </button>
        </div>
    </form>
</div>
