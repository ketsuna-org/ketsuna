<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let employee: any = null;

    let name = "";
    let position = "";
    let department = "";
    let salary = "";
    let status = "";
    let loading = false;
    let error = "";

    const dispatch = createEventDispatcher();

    // Initialiser les valeurs quand l'employé change
    $: if (employee) {
        name = employee.name || "";
        position = employee.position || "";
        department = employee.department || "";
        salary = employee.salary ? employee.salary.toString() : "";
        status = employee.status || "active";
    }

    async function updateEmployee() {
        if (!name.trim() || !position.trim()) {
            error = "Le nom et le poste sont requis";
            return;
        }

        loading = true;
        error = "";

        dispatch("update", {
            employeeId: employee.id,
            data: {
                name: name.trim(),
                position: position.trim(),
                department: department || null,
                salary: salary ? parseFloat(salary) : null,
                status: status || "active",
            },
        });
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

{#if employee}
    <div class="bg-white/10 backdrop-blur-sm rounded-lg p-8">
        <h2 class="text-3xl font-bold mb-6">Modifier l'Employé</h2>

        {#if error}
            <div class="bg-red-500 text-white p-4 rounded mb-6">
                {error}
            </div>
        {/if}

        <form on:submit|preventDefault={updateEmployee} class="space-y-6">
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
                <label
                    for="position"
                    class="block text-white mb-2 font-semibold"
                >
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
                <label
                    for="department"
                    class="block text-white mb-2 font-semibold"
                >
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

            <div>
                <label for="status" class="block text-white mb-2 font-semibold">
                    Statut
                </label>
                <select
                    id="status"
                    bind:value={status}
                    class="w-full px-4 py-3 bg-gray-800 border border-white/30 rounded-lg text-white focus:outline-none focus:border-white"
                >
                    <option value="active">Actif</option>
                    <option value="on_leave">En congé</option>
                    <option value="fired">Licencié</option>
                </select>
            </div>

            <!-- Informations actuelles (read-only) -->
            <div
                class="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4"
            >
                <h3 class="font-semibold mb-2">Statistiques actuelles</h3>
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                    {#if employee.performance !== undefined}
                        <div>
                            <span class="text-gray-400">Performance:</span>
                            <span class="ml-2 font-semibold"
                                >{employee.performance}/100</span
                            >
                        </div>
                    {/if}
                    {#if employee.skill_level !== undefined}
                        <div>
                            <span class="text-gray-400">Compétence:</span>
                            <span class="ml-2 font-semibold"
                                >{employee.skill_level}/100</span
                            >
                        </div>
                    {/if}
                    {#if employee.morale !== undefined}
                        <div>
                            <span class="text-gray-400">Morale:</span>
                            <span class="ml-2 font-semibold"
                                >{employee.morale}/100</span
                            >
                        </div>
                    {/if}
                    {#if employee.experience_years !== undefined}
                        <div>
                            <span class="text-gray-400">Expérience:</span>
                            <span class="ml-2 font-semibold"
                                >{employee.experience_years} ans</span
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
