<script lang="ts">
    import { goto } from "$app/navigation";
    import Footer from "$lib/components/Footer.svelte";
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
    class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white"
>
    <!-- Hero Section -->
    <section class="flex items-center justify-center min-h-screen px-4">
        <div class="text-center max-w-4xl">
            <h1
                class="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent"
            >
                Ketsuna Business
            </h1>
            <p class="text-base sm:text-lg md:text-xl mb-8 text-gray-300 px-4">
                Devenez un magnat des affaires dans ce jeu de gestion
                d'entreprise multi-joueur où vous créez des sociétés innovantes,
                investissez en bourse et dominez le marché mondial.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    on:click={startPlaying}
                    class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105"
                >
                    Commencer à Jouer
                </button>
                <button
                    class="border-2 border-white text-white hover:bg-white hover:text-blue-900 font-semibold py-3 px-8 rounded-lg transition duration-300"
                >
                    Découvrir Plus
                </button>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 px-4">
        <div class="max-w-6xl mx-auto">
            <h2 class="text-3xl md:text-4xl font-bold text-center mb-16">
                Fonctionnalités Principales
            </h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
                <div
                    class="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center"
                >
                    <div class="text-6xl mb-4">🏢</div>
                    <h3 class="text-2xl font-semibold mb-4">
                        Création d'Entreprises
                    </h3>
                    <p class="text-gray-300">
                        Lancez votre propre entreprise, choisissez votre secteur
                        d'activité et développez-la de zéro à multinationale.
                    </p>
                </div>
                <div
                    class="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center"
                >
                    <div class="text-6xl mb-4">👥</div>
                    <h3 class="text-2xl font-semibold mb-4">
                        Gestion des Employés
                    </h3>
                    <p class="text-gray-300">
                        Recrutez, formez et gérez une équipe talentueuse pour
                        booster la productivité de vos entreprises.
                    </p>
                </div>
                <div
                    class="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center"
                >
                    <div class="text-6xl mb-4">📊</div>
                    <h3 class="text-2xl font-semibold mb-4">
                        Rapports Financiers
                    </h3>
                    <p class="text-gray-300">
                        Suivez vos performances financières, analysez vos
                        revenus et dépenses pour prendre des décisions
                        stratégiques.
                    </p>
                </div>
                <div
                    class="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center"
                >
                    <div class="text-6xl mb-4">📈</div>
                    <h3 class="text-2xl font-semibold mb-4">Marché Boursier</h3>
                    <p class="text-gray-300">
                        Investissez intelligemment, suivez les tendances du
                        marché et maximisez vos profits grâce à des stratégies
                        boursières avancées.
                    </p>
                </div>
                <div
                    class="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center"
                >
                    <div class="text-6xl mb-4">🤝</div>
                    <h3 class="text-2xl font-semibold mb-4">
                        Acquisitions & Fusions
                    </h3>
                    <p class="text-gray-300">
                        Rachetez des concurrents, négociez des fusions et
                        étendez votre empire économique dans un monde
                        multi-joueur compétitif.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section class="py-20 px-4 bg-black/20">
        <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-4xl font-bold mb-8">
                À Propos de Ketsuna Business
            </h2>
            <p class="text-lg text-gray-300 mb-8">
                Ketsuna Business est le jeu ultime de simulation économique où
                vous prenez les rênes d'entreprises virtuelles. De la startup au
                conglomérat, chaque décision impacte votre succès.
            </p>
            <div class="grid md:grid-cols-2 gap-8">
                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                    <h3 class="text-2xl font-semibold mb-4">
                        Économie Dynamique
                    </h3>
                    <p class="text-gray-300">
                        Un marché en constante évolution avec des cycles
                        économiques, des crises et des opportunités qui
                        récompensent les joueurs les plus stratégiques.
                    </p>
                </div>
                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                    <h3 class="text-2xl font-semibold mb-4">
                        Communauté d'Entrepreneurs
                    </h3>
                    <p class="text-gray-300">
                        Rejoignez une communauté mondiale de joueurs passionnés,
                        partagez vos stratégies et participez à des défis
                        économiques collectifs.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <Footer />
</div>
