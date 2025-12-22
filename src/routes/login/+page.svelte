<script lang="ts">
    import { goto } from "$app/navigation";
    import pb from "$lib/pocketbase";

    let email = "";
    let password = "";
    let username = "";
    let isLogin = true; // true for login, false for register
    let error = "";
    let loading = false;

    async function handleAuth() {
        if (!email || !password) {
            error = "Veuillez remplir tous les champs";
            return;
        }

        loading = true;
        error = "";

        try {
            if (isLogin) {
                await pb.collection("users").authWithPassword(email, password);
            } else {
                if (!username) {
                    error =
                        "Le nom d'utilisateur est requis pour l'inscription";
                    loading = false;
                    return;
                }
                await pb.collection("users").create({
                    username,
                    email,
                    password,
                    passwordConfirm: password,
                });
                await pb.collection("users").authWithPassword(email, password);
            }
            goto("/compagnies");
        } catch (err: any) {
            error = err.message || "Une erreur est survenue";
        } finally {
            loading = false;
        }
    }

    async function handleDiscordAuth() {
        loading = true;
        error = "";

        try {
            await pb
                .collection("users")
                .authWithOAuth2({ provider: "discord" });
            goto("/compagnies");
        } catch (err: any) {
            error = err.message || "Erreur lors de la connexion Discord";
        } finally {
            loading = false;
        }
    }
</script>

<div
    class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center px-4 py-8"
>
    <div
        class="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:p-8 max-w-md w-full"
    >
        <h1
            class="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-white"
        >
            {isLogin ? "Connexion" : "Inscription"}
        </h1>

        {#if error}
            <div class="bg-red-500 text-white p-3 rounded mb-4">
                {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleAuth} class="space-y-4">
            {#if !isLogin}
                <div>
                    <label for="username" class="block text-white mb-2"
                        >Nom d'utilisateur</label
                    >
                    <input
                        id="username"
                        type="text"
                        bind:value={username}
                        class="w-full px-3 py-2 bg-gray-800 border border-white/30 rounded text-white placeholder-white/70 focus:outline-none focus:border-white"
                        placeholder="Votre nom d'utilisateur"
                        required
                    />
                </div>
            {/if}

            <div>
                <label for="email" class="block text-white mb-2">Email</label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    class="w-full px-3 py-2 bg-gray-800 border border-white/30 rounded text-white placeholder-white/70 focus:outline-none focus:border-white"
                    placeholder="votre@email.com"
                    required
                />
            </div>

            <div>
                <label for="password" class="block text-white mb-2"
                    >Mot de passe</label
                >
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    class="w-full px-3 py-2 bg-gray-800 border border-white/30 rounded text-white placeholder-white/70 focus:outline-none focus:border-white"
                    placeholder="Votre mot de passe"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded transition duration-300"
            >
                {loading
                    ? "Chargement..."
                    : isLogin
                      ? "Se connecter"
                      : "S'inscrire"}
            </button>
        </form>

        <div class="mt-6">
            <button
                on:click={handleDiscordAuth}
                disabled={loading}
                class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white font-semibold py-3 px-4 rounded transition duration-300 flex items-center justify-center gap-2"
            >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
                    />
                </svg>
                Continuer avec Discord
            </button>
        </div>

        <div class="mt-6 text-center">
            <button
                on:click={() => {
                    isLogin = !isLogin;
                    error = "";
                }}
                class="text-white hover:text-gray-300 transition duration-300"
            >
                {isLogin
                    ? "Pas de compte ? S'inscrire"
                    : "Déjà un compte ? Se connecter"}
            </button>
        </div>

        <div class="mt-4 text-center">
            <a
                href="/"
                class="text-white hover:text-gray-300 transition duration-300"
            >
                Retour à l'accueil
            </a>
        </div>
    </div>
</div>
