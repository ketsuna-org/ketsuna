<script lang="ts">
    import { createEventDispatcher } from "svelte";

    let name = "";
    let description = "";
    let headquarters_location = "";
    let loading = false;
    let error = "";

    const dispatch = createEventDispatcher();

    async function createCompany() {
        if (!name.trim()) {
            error = "Le nom de la compagnie est requis";
            return;
        }

        loading = true;
        error = "";

        dispatch("create", {
            name: name.trim(),
            description: description.trim() || null,
            headquarters_location: headquarters_location.trim() || null,
        });
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

<div class="bg-white/10 backdrop-blur-sm rounded-lg p-8">
    <h2 class="text-3xl font-bold mb-6">Créer une Nouvelle Compagnie</h2>

    {#if error}
        <div class="bg-red-500 text-white p-4 rounded mb-6">
            {error}
        </div>
    {/if}

    <form on:submit|preventDefault={createCompany} class="space-y-6">
        <div>
            <label for="name" class="block text-white mb-2 font-semibold">
                Nom de la Compagnie *
            </label>
            <input
                id="name"
                type="text"
                bind:value={name}
                class="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
                placeholder="Entrez le nom de votre entreprise"
                required
            />
        </div>

        <div>
            <label
                for="description"
                class="block text-white mb-2 font-semibold"
            >
                Description
            </label>
            <textarea
                id="description"
                bind:value={description}
                rows="4"
                class="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white resize-vertical"
                placeholder="Décrivez votre entreprise (secteur d'activité, objectifs, etc.)"
            ></textarea>
        </div>

        <div>
            <label for="location" class="block text-white mb-2 font-semibold">
                Siège Social
            </label>
            <input
                id="location"
                type="text"
                bind:value={headquarters_location}
                class="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
                placeholder="Ville, Pays"
            />
        </div>

        <div class="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h3 class="font-semibold mb-2">Capital de départ</h3>
            <p class="text-sm text-gray-300">
                Chaque nouvelle compagnie commence avec <strong>10 000 $</strong
                >
                de trésorerie et une réputation de <strong>50/100</strong>.
                Utilisez ces ressources pour développer votre entreprise !
            </p>
        </div>

        <div class="flex gap-4">
            <button
                type="submit"
                disabled={loading}
                class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                {loading ? "Création..." : "Créer la Compagnie"}
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
