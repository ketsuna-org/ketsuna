<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import pb from "$lib/pocketbase";
  import { fly, fade } from "svelte/transition";

  let messages: any[] = [];
  let isOpen = false;
  let newMessage = "";
  let chatBody: HTMLElement;

  // Load messages
  async function loadMessages() {
    try {
      const result = await pb.collection("messages").getList(1, 100, {
        sort: "-created", // Newest first
        expand: "user",
      });
      // We want oldest at top for chat flow
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
    newMessage = ""; // Optimistic clear

    try {
      await pb.collection("messages").create({
        user: pb.authStore.record?.id,
        message: content,
      });
      // Subscription will handle the UI update
    } catch (err) {
      console.error("Failed to send message", err);
      newMessage = content; // Restore on error
    }
  }

  function scrollToBottom() {
    // Timeout to allow DOM update
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

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      scrollToBottom();
    }
  }

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
      const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });
      return `${dayName} ${timeStr}`;
    } else {
      return (
        date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
        " " +
        timeStr
      );
    }
  }
</script>

<div class="global-chat">
  {#if isOpen}
    <div class="chat-window" transition:fly={{ y: 20, duration: 200 }}>
      <div
        class="header"
        on:click={toggle}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === "Enter" && toggle()}
      >
        <h3>Messagerie Générale</h3>
        <button class="close-btn" aria-label="Fermer">
          <!-- Down Chevron -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
          >
        </button>
      </div>

      <div class="messages-list" bind:this={chatBody}>
        {#each messages as msg (msg.id)}
          {@const isMe =
            pb.authStore.record?.id && msg.user === pb.authStore.record?.id}
          <!-- Check expansion -->
          {@const username =
            msg.expand?.user?.name || msg.expand?.user?.username || "Unknown"}

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
      </div>

      <div class="input-area">
        <input
          type="text"
          placeholder="Écrire un message..."
          bind:value={newMessage}
          on:keydown={handleKeydown}
        />
        <button
          class="send-btn"
          on:click={sendMessage}
          disabled={!newMessage.trim()}
          aria-label="Envoyer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
  {/if}

  <button class="chat-toggle-btn {isOpen ? 'hidden' : ''}" on:click={toggle}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      ></path>
    </svg>
    <span class="sr-only">Ouvrir le chat</span>
  </button>
</div>

<style>
  .global-chat {
    pointer-events: auto;
    position: relative;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center; /* Center button and window */
  }

  .chat-toggle-btn {
    width: 48px;
    height: 48px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    border: none;
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 0.2s,
      background 0.2s;
  }

  .chat-toggle-btn:hover {
    transform: scale(1.1);
    background: #2563eb;
  }

  .chat-toggle-btn.hidden {
    display: none;
  }

  .chat-window {
    width: 320px;
    height: 400px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: absolute; /* Float */
    bottom: 60px; /* Above button */
    left: 50%;
    transform: translateX(-50%); /* Center perfectly */
  }

  .header {
    padding: 10px 15px;
    background: rgba(30, 41, 59, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
  }

  .messages-list {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .messages-list::-webkit-scrollbar {
    width: 4px;
  }
  .messages-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
  }

  .message-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .message-row.me {
    justify-content: flex-end;
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #475569;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .bubble {
    max-width: 80%;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 0.85rem;
    line-height: 1.4;
    word-break: break-word;
    position: relative;
  }

  .me .bubble {
    background: #3b82f6;
    color: white;
    border-bottom-right-radius: 2px;
  }

  .other .bubble {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    border-bottom-left-radius: 2px;
  }

  .sender-name {
    font-size: 0.65rem;
    color: #94a3b8;
    margin-bottom: 2px;
    margin-left: 2px;
  }

  .timestamp {
    font-size: 0.6rem;
    color: rgba(148, 163, 184, 0.6);
    margin-top: 4px;
    text-align: right;
  }

  .me .timestamp {
    color: rgba(255, 255, 255, 0.5);
  }

  .input-area {
    padding: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    gap: 8px;
    background: rgba(30, 41, 59, 0.3);
  }

  input {
    flex: 1;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 8px 12px;
    color: white;
    font-size: 0.85rem;
  }

  input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .send-btn {
    background: #3b82f6;
    color: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .send-btn:disabled {
    background: rgba(59, 130, 246, 0.5);
    cursor: not-allowed;
  }
</style>
