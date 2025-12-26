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
            goto("/dashboard");
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
            goto("/dashboard");
        } catch (err: any) {
            error = err.message || "Erreur lors de la connexion Discord";
        } finally {
            loading = false;
        }
    }
</script>

<div
    class="min-h-screen bg-background flex items-center justify-center px-4 py-8"
>
    <div
        class="bg-surface border border-border rounded-card p-6 md:p-8 max-w-md w-full shadow-2xl"
    >
        <div class="text-center mb-8">
            <h1
                class="text-2xl md:text-3xl font-bold text-content-primary mb-2"
            >
                {isLogin ? "Connexion" : "Inscription"}
            </h1>
            <p class="text-content-secondary text-sm">
                {isLogin
                    ? "Heureux de vous revoir, Patron."
                    : "Commencez votre empire aujourd'hui."}
            </p>
        </div>

        {#if error}
            <div
                class="bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm p-4 rounded-lg mb-6 flex items-start gap-2"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                    />
                </svg>
                <span>{error}</span>
            </div>
        {/if}

        <form on:submit|preventDefault={handleAuth} class="space-y-5">
            {#if !isLogin}
                <div>
                    <label
                        for="username"
                        class="block text-sm font-medium text-content-secondary mb-2"
                        >Nom d'utilisateur</label
                    >
                    <input
                        id="username"
                        type="text"
                        bind:value={username}
                        class="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-content-primary placeholder-content-tertiary focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                        placeholder="Ex: ElonM"
                        required
                    />
                </div>
            {/if}

            <div>
                <label
                    for="email"
                    class="block text-sm font-medium text-content-secondary mb-2"
                    >Email</label
                >
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    class="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-content-primary placeholder-content-tertiary focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                    placeholder="votre@email.com"
                    required
                />
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <label
                        for="password"
                        class="block text-sm font-medium text-content-secondary"
                        >Mot de passe</label
                    >
                    {#if isLogin}
                        <a
                            href="#"
                            class="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                            >Oublié ?</a
                        >
                    {/if}
                </div>
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    class="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-content-primary placeholder-content-tertiary focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                    placeholder="••••••••"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                class="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-surface-highlight disabled:text-content-tertiary text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-primary-900/20 transform active:scale-[0.98]"
            >
                {loading
                    ? "Chargement..."
                    : isLogin
                      ? "Se connecter"
                      : "Créer un compte"}
            </button>
        </form>

        <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-border"></div>
            </div>
            <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-surface text-content-tertiary">ou</span>
            </div>
        </div>

        <button
            on:click={handleDiscordAuth}
            disabled={loading}
            class="w-full bg-surface-highlight hover:bg-surface-selected border border-border text-content-primary hover:text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
        >
            <svg
                class="w-5 h-5 text-[#5865F2]"
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
                />
            </svg>
            Continuer avec Discord
        </button>

        <div class="mt-6 text-center space-y-3">
            <button
                on:click={() => {
                    isLogin = !isLogin;
                    error = "";
                }}
                class="text-content-secondary hover:text-white transition duration-300 text-sm"
            >
                {isLogin
                    ? "Pas encore de compte ? S'inscrire"
                    : "Vous avez déjà un compte ? Se connecter"}
            </button>

            <div class="block">
                <a
                    href="/"
                    class="text-content-tertiary hover:text-content-secondary transition duration-300 text-xs"
                >
                    ← Retour à l'accueil
                </a>
            </div>
        </div>
    </div>
</div>
