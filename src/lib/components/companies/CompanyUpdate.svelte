<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let company: any = null;

    let name = "";
    let description = "";
    let headquarters_location = "";
    let loading = false;
    let error = "";

    const dispatch = createEventDispatcher();

    // Initialiser les valeurs quand la compagnie change
    $: if (company) {
        name = company.name || "";
        description = company.description || "";
        headquarters_location = company.headquarters_location || "";
    }

    async function updateCompany() {
        if (!name.trim()) {
            error = "Le nom de la compagnie est requis";
            return;
        }

        loading = true;
        error = "";

        dispatch("update", {
            companyId: company.id,
            data: {
                name: name.trim(),
                description: description.trim() || null,
                headquarters_location: headquarters_location.trim() || null,
            },
        });
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

{#if company}
    <div class="bg-white/10 backdrop-blur-sm rounded-lg p-8">
        <h2 class="text-3xl font-bold mb-6">Modifier la Compagnie</h2>

        {#if error}
            <div class="bg-red-500 text-white p-4 rounded mb-6">
                {error}
            </div>
        {/if}

        <form on:submit|preventDefault={updateCompany} class="space-y-6">
            <div>
                <label for="name" class="block text-white mb-2 font-semibold">
                    Nom de la Compagnie *
                </label>
                <input
                    id="name"
                    type="text"
                    bind:value={name}
                    class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
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
                    class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white resize-vertical"
                    placeholder="Décrivez votre entreprise (secteur d'activité, objectifs, etc.)"
                ></textarea>
            </div>

            <div>
                <label
                    for="location"
                    class="block text-white mb-2 font-semibold"
                >
                    Siège Social
                </label>
                <input
                    id="location"
                    type="text"
                    bind:value={headquarters_location}
                    class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:border-white"
                    placeholder="Ville, Pays"
                />
            </div>

            <!-- Informations actuelles (read-only) -->
            <div
                class="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4"
            >
                <h3 class="font-semibold mb-2">Informations actuelles</h3>
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-400">Trésorerie:</span>
                        <span class="ml-2 font-semibold"
                            >${company.cash?.toLocaleString() || 0}</span
                        >
                    </div>
                    <div>
                        <span class="text-gray-400">Réputation:</span>
                        <span class="ml-2 font-semibold"
                            >{company.reputation || 0}/100</span
                        >
                    </div>
                    <div>
                        <span class="text-gray-400">Statut:</span>
                        <span class="ml-2 font-semibold"
                            >{company.status || "active"}</span
                        >
                    </div>
                    {#if company.total_employees}
                        <div>
                            <span class="text-gray-400">Employés:</span>
                            <span class="ml-2 font-semibold"
                                >{company.total_employees.toLocaleString()}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <div class="flex gap-4">
                <button
                    type="submit"
                    disabled={loading}
                    class="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                >
                    {loading ? "Mise à jour..." : "Mettre à jour"}
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
{/if}
