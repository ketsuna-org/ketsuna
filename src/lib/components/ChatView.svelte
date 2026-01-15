<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import pb from "$lib/pocketbase";

    let messages: any[] = $state([]);
    let newMessage = $state("");
    let chatBody: HTMLElement;

    // Load messages
    async function loadMessages() {
        try {
            const result = await pb.collection("messages").getList(1, 100, {
                sort: "-created",
                expand: "user",
            });
            messages = result.items.reverse();
            scrollToBottom();
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    }

    // Realtime subscription
    async function subscribe() {
        pb.collection("messages").subscribe("*", async (e) => {
            if (e.action === "create") {
                const record = await pb
                    .collection("messages")
                    .getOne(e.record.id, { expand: "user" });
                messages = [...messages, record];
                scrollToBottom();
            }
        });
    }

    async function sendMessage() {
        if (!newMessage.trim() || !pb.authStore.record?.id) return;

        const content = newMessage;
        newMessage = "";

        try {
            await pb.collection("messages").create({
                user: pb.authStore.record?.id,
                message: content,
            });
        } catch (err) {
            console.error("Failed to send message", err);
            newMessage = content;
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            if (chatBody) {
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }, 50);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    onMount(() => {
        loadMessages();
        subscribe();
    });

    onDestroy(() => {
        pb.collection("messages").unsubscribe("*");
    });

    function formatTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const timeStr = date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });

        if (diffDays === 0) {
            return timeStr;
        } else if (diffDays === 1) {
            return `Hier ${timeStr}`;
        } else if (diffDays < 7) {
            const dayName = date.toLocaleDateString("fr-FR", {
                weekday: "short",
            });
            return `${dayName} ${timeStr}`;
        } else {
            return (
                date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                }) +
                " " +
                timeStr
            );
        }
    }
</script>

<div class="chat-view">
    <div class="messages-list" bind:this={chatBody}>
        {#each messages as msg (msg.id)}
            {@const isMe =
                pb.authStore.record?.id && msg.user === pb.authStore.record?.id}
            {@const username =
                msg.expand?.user?.name ||
                msg.expand?.user?.username ||
                "Unknown"}

            <div class="message-row {isMe ? 'me' : 'other'}">
                {#if !isMe}
                    <div class="avatar" title={username}>
                        {username[0]?.toUpperCase() || "?"}
                    </div>
                {/if}
                <div class="bubble">
                    {#if !isMe}<div class="sender-name">{username}</div>{/if}
                    <div class="text">{msg.message}</div>
                    <div class="timestamp">{formatTime(msg.created)}</div>
                </div>
            </div>
        {/each}

        {#if messages.length === 0}
            <div class="empty-state">
                <span class="empty-icon">💬</span>
                <p>Aucun message pour l'instant</p>
                <p class="hint">Soyez le premier à envoyer un message !</p>
            </div>
        {/if}
    </div>

    <div class="input-area">
        <input
            type="text"
            placeholder="Écrire un message..."
            bind:value={newMessage}
            onkeydown={handleKeydown}
        />
        <button
            class="send-btn"
            onclick={sendMessage}
            disabled={!newMessage.trim()}
            aria-label="Envoyer"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><line x1="22" y1="2" x2="11" y2="13"></line><polygon
                    points="22 2 15 22 11 13 2 9 22 2"
                ></polygon></svg
            >
        </button>
    </div>
</div>

<style>
    .chat-view {
        display: flex;
        flex-direction: column;
        height: 60vh;
        min-height: 400px;
    }

    .messages-list {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(15, 23, 42, 0.3);
        border-radius: 8px;
        margin-bottom: 16px;
    }

    .messages-list::-webkit-scrollbar {
        width: 6px;
    }
    .messages-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: #64748b;
        text-align: center;
        padding: 40px;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    .empty-state p {
        margin: 0;
        font-weight: 500;
    }

    .empty-state .hint {
        font-size: 12px;
        margin-top: 8px;
        opacity: 0.7;
    }

    .message-row {
        display: flex;
        gap: 10px;
        align-items: flex-end;
    }

    .message-row.me {
        justify-content: flex-end;
    }

    .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #475569 0%, #334155 100%);
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: bold;
        flex-shrink: 0;
        border: 2px solid #1e293b;
    }

    .bubble {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 0.9rem;
        line-height: 1.5;
        word-break: break-word;
        position: relative;
    }

    .me .bubble {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        color: white;
        border-bottom-right-radius: 4px;
    }

    .other .bubble {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        border-bottom-left-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .sender-name {
        font-size: 0.7rem;
        color: #94a3b8;
        margin-bottom: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .timestamp {
        font-size: 0.65rem;
        color: rgba(148, 163, 184, 0.6);
        margin-top: 6px;
        text-align: right;
    }

    .me .timestamp {
        color: rgba(255, 255, 255, 0.5);
    }

    .input-area {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: rgba(30, 41, 59, 0.5);
        border-radius: 12px;
        border: 1px solid #334155;
    }

    input {
        flex: 1;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid #334155;
        border-radius: 24px;
        padding: 12px 20px;
        color: white;
        font-size: 0.9rem;
        transition: border-color 0.2s;
    }

    input:focus {
        outline: none;
        border-color: #3b82f6;
    }

    input::placeholder {
        color: #64748b;
    }

    .send-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        color: white;
        border: none;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .send-btn:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }

    .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
