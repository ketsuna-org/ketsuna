<script lang="ts">
    import { goto } from "$app/navigation";
    import pb from "$lib/pocketbase";

    function startPlaying() {
        if (pb.authStore.isValid) {
            goto("/dashboard");
        } else {
            goto("/login");
        }
    }
</script>

<div
    class="min-h-screen bg-background text-content-primary font-sans selection:bg-primary-500/30"
>
    <section
        class="relative flex items-center justify-center min-h-[80vh] px-4 overflow-hidden"
    >
        <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-900/20 rounded-full blur-[120px] pointer-events-none"
        ></div>

        <div class="relative z-10 text-center max-w-4xl">
            <div
                class="inline-flex items-center px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-sm font-medium mb-6"
            >
                <span
                    class="flex w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse"
                ></span>
                v0.1 Beta Launch - Rejoignez-nous sur
                <a
                    href="https://discord.gg/97qSsc6Vrs"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="ml-1 underline hover:text-primary-300 transition-colors"
                    >Discord</a
                >
            </div>

            <h1
                class="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight"
            >
                Ketsuna <span class="text-primary-500">Business</span>
            </h1>

            <p
                class="text-lg sm:text-xl md:text-2xl mb-10 text-content-secondary max-w-2xl mx-auto leading-relaxed"
            >
                Devenez un magnat des affaires. Créez des sociétés innovantes,
                investissez en bourse et dominez le marché mondial dans ce
                simulateur économique.
            </p>

            <div
                class="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
                <button
                    on:click={startPlaying}
                    class="w-full sm:w-auto bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3.5 px-8 rounded-lg shadow-lg shadow-primary-900/20 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                    Commencer à Jouer
                </button>

                <button
                    class="w-full sm:w-auto bg-surface hover:bg-surface-highlight border border-border text-content-secondary hover:text-white font-medium py-3.5 px-8 rounded-lg transition-colors duration-200"
                >
                    Découvrir Plus
                </button>
            </div>
        </div>
    </section>

    <section class="py-24 px-4 border-t border-border">
        <div class="max-w-7xl mx-auto">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">
                    Fonctionnalités Principales
                </h2>
                <p class="text-content-secondary max-w-2xl mx-auto">
                    Tous les outils nécessaires pour bâtir votre empire,
                    accessibles depuis un tableau de bord unifié.
                </p>
            </div>

            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    class="bg-surface border border-border rounded-card p-6 hover:border-primary-500/50 transition-colors group"
                >
                    <div
                        class="w-12 h-12 bg-surface-highlight rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:text-primary-400 transition-colors"
                    >
                        🏢
                    </div>
                    <h3 class="text-xl font-semibold mb-3 text-white">
                        Création d'Entreprises
                    </h3>
                    <p class="text-content-secondary text-sm leading-relaxed">
                        Lancez votre propre entreprise, choisissez votre secteur
                        d'activité et développez-la de zéro à multinationale.
                    </p>
                </div>

                <div
                    class="bg-surface border border-border rounded-card p-6 hover:border-primary-500/50 transition-colors group"
                >
                    <div
                        class="w-12 h-12 bg-surface-highlight rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:text-primary-400 transition-colors"
                    >
                        👥
                    </div>
                    <h3 class="text-xl font-semibold mb-3 text-white">
                        Gestion des Employés
                    </h3>
                    <p class="text-content-secondary text-sm leading-relaxed">
                        Recrutez, formez et gérez une équipe talentueuse pour
                        booster la productivité de vos entreprises.
                    </p>
                </div>

                <div
                    class="bg-surface border border-border rounded-card p-6 hover:border-primary-500/50 transition-colors group"
                >
                    <div
                        class="w-12 h-12 bg-surface-highlight rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:text-primary-400 transition-colors"
                    >
                        📊
                    </div>
                    <h3 class="text-xl font-semibold mb-3 text-white">
                        Rapports Financiers
                    </h3>
                    <p class="text-content-secondary text-sm leading-relaxed">
                        Suivez vos performances financières avec précision.
                        Analysez revenus et dépenses pour optimiser vos marges.
                    </p>
                </div>

                <div
                    class="bg-surface border border-border rounded-card p-6 hover:border-primary-500/50 transition-colors group"
                >
                    <div
                        class="w-12 h-12 bg-surface-highlight rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:text-primary-400 transition-colors"
                    >
                        📈
                    </div>
                    <h3 class="text-xl font-semibold mb-3 text-white">
                        Marché Boursier
                    </h3>
                    <p class="text-content-secondary text-sm leading-relaxed">
                        Investissez intelligemment, suivez les tendances du
                        marché et maximisez vos profits grâce à des stratégies
                        avancées.
                    </p>
                </div>

                <div
                    class="bg-surface border border-border rounded-card p-6 hover:border-primary-500/50 transition-colors group md:col-span-2 lg:col-span-2"
                >
                    <div
                        class="w-12 h-12 bg-surface-highlight rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:text-primary-400 transition-colors"
                    >
                        🤝
                    </div>
                    <h3 class="text-xl font-semibold mb-3 text-white">
                        Acquisitions & Fusions
                    </h3>
                    <p class="text-content-secondary text-sm leading-relaxed">
                        Rachetez des concurrents, négociez des fusions et
                        étendez votre empire économique dans un monde
                        multi-joueur compétitif.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-24 px-4 bg-surface-alt border-t border-border">
        <div class="max-w-5xl mx-auto">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 class="text-3xl md:text-4xl font-bold mb-6">
                        À Propos de <span class="text-primary-500">Ketsuna</span
                        >
                    </h2>
                    <p class="text-content-secondary mb-6 leading-relaxed">
                        Ketsuna Business est le jeu ultime de simulation
                        économique. De la startup au conglomérat, chaque
                        décision impacte votre succès dans un environnement
                        temps réel.
                    </p>
                    <ul class="space-y-4">
                        <li class="flex items-start">
                            <span
                                class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm mr-3 mt-0.5"
                                >✓</span
                            >
                            <span class="text-gray-300"
                                >Simulation de marché réaliste</span
                            >
                        </li>
                        <li class="flex items-start">
                            <span
                                class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm mr-3 mt-0.5"
                                >✓</span
                            >
                            <span class="text-gray-300"
                                >Compétition Joueur contre Joueur</span
                            >
                        </li>
                        <li class="flex items-start">
                            <span
                                class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm mr-3 mt-0.5"
                                >✓</span
                            >
                            <span class="text-gray-300"
                                >Système bancaire et emprunts</span
                            >
                        </li>
                    </ul>
                </div>

                <div class="grid gap-4">
                    <div
                        class="bg-surface border border-border p-6 rounded-card"
                    >
                        <h3 class="text-lg font-semibold mb-2 text-white">
                            Économie Dynamique
                        </h3>
                        <p class="text-content-secondary text-sm">
                            Cycles économiques, crises et opportunités qui
                            récompensent les stratèges.
                        </p>
                    </div>
                    <a
                        href="https://discord.gg/97qSsc6Vrs"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="bg-surface border border-border p-6 rounded-card transition-colors hover:border-primary-500/50 hover:bg-surface-highlight block"
                    >
                        <h3 class="text-lg font-semibold mb-2 text-white">
                            Communauté
                        </h3>
                        <p class="text-content-secondary text-sm">
                            Rejoignez une communauté mondiale, partagez vos
                            stratégies et participez aux classements.
                        </p>
                    </a>
                </div>
            </div>
        </div>
    </section>
</div>
