<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import pb from "$lib/pocketbase";

    export let isOpen = false;

    let messages: any[] = [];
    let newMessage = "";
    let loading = true;
    let error = "";
    let messagesContainer: HTMLDivElement;
    let editingMessageId: string | null = null;
    let editingText = "";
    let typingUsers = new Set<string>();
    let typingTimeout: number | null = null;
    let isTyping = false;
    let unsubscribe: (() => void) | null = null;
    let userNames: Map<string, string> = new Map(); // Cache des noms d'utilisateurs

    // Charger l'historique des messages
    async function loadMessages() {
        loading = true;
        error = "";

        try {
            const records = await pb.collection("messages").getList(1, 100, {
                sort: "-created",
                expand: "user",
            });
            messages = records.items.reverse();

            // Charger les noms d'utilisateurs pour chaque message
            for (const msg of messages) {
                if (!userNames.has(msg.user)) {
                    const userName = await getUserName(
                        msg.user,
                        msg.expand?.user,
                    );
                    userNames.set(msg.user, userName);
                }
            }

            scrollToBottom();
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement des messages";
        } finally {
            loading = false;
        }
    }

    // S'abonner aux mises à jour en temps réel
    async function subscribeToMessages() {
        try {
            unsubscribe = await pb
                .collection("messages")
                .subscribe("*", async (e) => {
                    if (e.action === "create") {
                        // Charger le message avec l'utilisateur expand
                        const fullMessage = await pb
                            .collection("messages")
                            .getOne(e.record.id, {
                                expand: "user",
                            });

                        // Charger le nom d'utilisateur
                        if (!userNames.has(fullMessage.user)) {
                            const userName = await getUserName(
                                fullMessage.user,
                                fullMessage.expand?.user,
                            );
                            userNames.set(fullMessage.user, userName);
                        }

                        messages = [...messages, fullMessage];
                        scrollToBottom();
                    } else if (e.action === "update") {
                        const fullMessage = await pb
                            .collection("messages")
                            .getOne(e.record.id, {
                                expand: "user",
                            });

                        // Charger le nom d'utilisateur
                        if (!userNames.has(fullMessage.user)) {
                            const userName = await getUserName(
                                fullMessage.user,
                                fullMessage.expand?.user,
                            );
                            userNames.set(fullMessage.user, userName);
                        }

                        messages = messages.map((m) =>
                            m.id === e.record.id ? fullMessage : m,
                        );
                    } else if (e.action === "delete") {
                        messages = messages.filter((m) => m.id !== e.record.id);
                    }
                });
        } catch (err: any) {
            console.error("Erreur d'abonnement:", err);
        }
    }

    // Envoyer un message
    async function sendMessage() {
        if (!newMessage.trim()) return;

        try {
            await pb.collection("messages").create({
                user: pb.authStore.model?.id,
                message: newMessage.trim(),
            });
            newMessage = "";
            stopTyping();
        } catch (err: any) {
            error = err.message || "Erreur lors de l'envoi du message";
        }
    }

    // Commencer l'édition
    function startEdit(msg: any) {
        editingMessageId = msg.id;
        editingText = msg.message;
    }

    // Sauvegarder l'édition
    async function saveEdit(msgId: string) {
        if (!editingText.trim()) return;

        try {
            await pb.collection("messages").update(msgId, {
                message: editingText.trim(),
            });
            editingMessageId = null;
            editingText = "";
        } catch (err: any) {
            error = err.message || "Erreur lors de la modification";
        }
    }

    // Annuler l'édition
    function cancelEdit() {
        editingMessageId = null;
        editingText = "";
    }

    // Supprimer un message
    async function deleteMessage(msgId: string) {
        if (!confirm("Supprimer ce message ?")) return;

        try {
            await pb.collection("messages").delete(msgId);
        } catch (err: any) {
            error = err.message || "Erreur lors de la suppression";
        }
    }

    // Gérer l'indicateur "en train d'écrire"
    function handleTyping() {
        if (!isTyping) {
            isTyping = true;
            // Ici, on pourrait envoyer un événement à d'autres utilisateurs
        }

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        typingTimeout = setTimeout(() => {
            stopTyping();
        }, 2000) as unknown as number;
    }

    function stopTyping() {
        isTyping = false;
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
    }

    // Scroller vers le bas
    function scrollToBottom() {
        setTimeout(() => {
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    }

    // Récupérer le nom d'utilisateur avec fallback
    async function getUserName(userId: string, expandedUser: any) {
        // Si l'expand contient le user, utiliser ses infos
        if (expandedUser?.username) {
            return expandedUser.username;
        }
        if (expandedUser?.email) {
            return expandedUser.email;
        }

        // Si c'est l'utilisateur courant, utiliser les infos du authStore
        if (userId === pb.authStore.record?.id) {
            return (
                pb.authStore.record?.username ||
                pb.authStore.record?.email ||
                "Utilisateur"
            );
        }

        // Sinon, essayer de récupérer l'utilisateur directement
        try {
            const user = await pb.collection("users").getOne(userId);
            return user.username || user.email || "Utilisateur";
        } catch (err) {
            console.error("Erreur récupération user:", err);
            return "Utilisateur";
        }
    }

    // Formater la date
    function formatDate(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "À l'instant";
        if (minutes < 60) return `Il y a ${minutes}min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days < 7) return `Il y a ${days}j`;
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
        });
    }

    // Gérer la touche Entrée
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function handleEditKeydown(e: KeyboardEvent, msgId: string) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            saveEdit(msgId);
        } else if (e.key === "Escape") {
            cancelEdit();
        }
    }

    function toggleChat() {
        isOpen = !isOpen;
    }

    onMount(async () => {
        if (pb.authStore.isValid) {
            await loadMessages();
            await subscribeToMessages();
        }
    });

    onDestroy(() => {
        if (unsubscribe) {
            unsubscribe();
        }
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
    });

    // Charger les messages quand le chat s'ouvre
    $: if (isOpen && messages.length === 0 && pb.authStore.isValid) {
        loadMessages();
    }
</script>

{#if pb.authStore.isValid}
    <!-- Bouton flottant pour ouvrir/fermer le chat -->
    <button
        on:click={toggleChat}
        class="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full p-3 md:p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Chat global"
    >
        {#if isOpen}
            <svg
                class="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        {:else}
            <svg
                class="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
            </svg>
        {/if}
    </button>

    <!-- Popup du chat -->
    {#if isOpen}
        <div
            class="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 z-50 md:w-96 md:h-[600px] bg-gray-900 md:rounded-lg shadow-2xl border-0 md:border md:border-gray-700 flex flex-col animate-slide-up"
        >
            <!-- Header -->
            <div
                class="bg-gradient-to-r from-purple-600 to-blue-600 p-3 md:p-4 md:rounded-t-lg flex justify-between items-center"
            >
                <div>
                    <h3 class="text-base md:text-lg font-bold text-white">
                        💬 Chat Global
                    </h3>
                    <p class="text-xs text-purple-100">
                        {messages.length} message{messages.length > 1
                            ? "s"
                            : ""}
                    </p>
                </div>
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button
                    on:click={toggleChat}
                    class="text-white hover:bg-white/20 rounded p-1 transition"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {#if error}
                <div class="bg-red-500/20 text-red-300 p-2 text-sm">
                    {error}
                </div>
            {/if}

            <!-- Messages -->
            <div
                bind:this={messagesContainer}
                class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-800"
            >
                {#if loading}
                    <div class="text-center py-8 text-gray-400">
                        <div class="text-sm">Chargement...</div>
                    </div>
                {:else if messages.length === 0}
                    <div class="text-center py-8 text-gray-400">
                        <div class="text-4xl mb-2">💬</div>
                        <div class="text-sm">Aucun message</div>
                        <div class="text-xs">Soyez le premier à écrire !</div>
                    </div>
                {:else}
                    {#each messages as msg (msg.id)}
                        <div
                            class="group {msg.user === pb.authStore.model?.id
                                ? 'text-right'
                                : 'text-left'}"
                        >
                            <div
                                class="inline-block max-w-[80%] {msg.user ===
                                pb.authStore.model?.id
                                    ? 'bg-blue-600'
                                    : 'bg-gray-700'} rounded-lg p-3"
                            >
                                <!-- Nom de l'utilisateur -->
                                <div
                                    class="text-xs {msg.user ===
                                    pb.authStore.model?.id
                                        ? 'text-blue-200'
                                        : 'text-gray-400'} mb-1 font-medium"
                                >
                                    {userNames.get(msg.user) || "Chargement..."}
                                </div>

                                <!-- Message ou édition -->
                                {#if editingMessageId === msg.id}
                                    <input
                                        type="text"
                                        bind:value={editingText}
                                        on:keydown={(e) =>
                                            handleEditKeydown(e, msg.id)}
                                        class="bg-gray-900 text-white px-2 py-1 rounded w-full text-sm"
                                    />
                                    <div class="flex gap-2 mt-2">
                                        <button
                                            on:click={() => saveEdit(msg.id)}
                                            class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
                                        >
                                            ✓ Sauver
                                        </button>
                                        <button
                                            on:click={cancelEdit}
                                            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
                                        >
                                            ✕ Annuler
                                        </button>
                                    </div>
                                {:else}
                                    <div class="text-sm text-white break-words">
                                        {msg.message}
                                    </div>
                                {/if}

                                <!-- Date et actions -->
                                <div class="flex items-center gap-2 mt-1">
                                    <div
                                        class="text-xs {msg.user ===
                                        pb.authStore.model?.id
                                            ? 'text-blue-200'
                                            : 'text-gray-400'}"
                                    >
                                        {formatDate(msg.created)}
                                        {#if msg.created !== msg.updated}
                                            <span class="italic">(modifié)</span
                                            >
                                        {/if}
                                    </div>

                                    <!-- Boutons d'édition/suppression -->
                                    {#if msg.user === pb.authStore.model?.id && editingMessageId !== msg.id}
                                        <div
                                            class="opacity-0 group-hover:opacity-100 transition flex gap-1"
                                        >
                                            <button
                                                on:click={() => startEdit(msg)}
                                                class="text-xs hover:text-yellow-400"
                                                title="Éditer"
                                                aria-label="Éditer le message"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                on:click={() =>
                                                    deleteMessage(msg.id)}
                                                class="text-xs hover:text-red-400"
                                                title="Supprimer"
                                                aria-label="Supprimer le message"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}

                <!-- Indicateur "en train d'écrire" (version simplifiée) -->
                {#if isTyping && newMessage.trim()}
                    <div class="text-xs text-gray-500 italic">
                        Vous écrivez...
                    </div>
                {/if}
            </div>

            <!-- Input -->
            <div
                class="p-3 md:p-4 bg-gray-900 border-t border-gray-700 md:rounded-b-lg"
            >
                <div class="flex gap-2">
                    <input
                        type="text"
                        bind:value={newMessage}
                        on:keydown={handleKeydown}
                        on:input={handleTyping}
                        placeholder="Écrivez un message..."
                        class="flex-1 bg-gray-800 text-white px-3 md:px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                    />
                    <button
                        on:click={sendMessage}
                        disabled={!newMessage.trim()}
                        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition"
                        aria-label="Envoyer le message"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    </button>
                </div>
                <div class="text-xs text-gray-500 mt-2">
                    Appuyez sur Entrée pour envoyer
                </div>
            </div>
        </div>
    {/if}
{/if}

<style>
    @keyframes slide-up {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }

    /* Scrollbar personnalisée */
    ::-webkit-scrollbar {
        width: 6px;
    }

    ::-webkit-scrollbar-track {
        background: #1f2937;
    }

    ::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }
</style>
