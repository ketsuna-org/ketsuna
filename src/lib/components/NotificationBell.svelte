<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import pb from "$lib/pocketbase";
  import { fly, fade } from "svelte/transition";

  let notifications: any[] = [];
  let isOpen = false;
  let unreadCount = 0;

  // Load notifications
  async function loadNotifications() {
    if (!pb.authStore.record?.id) return;
    try {
      const result = await pb.collection("notifications").getList(1, 20, {
        sort: "-created",
        filter: `user = "${pb.authStore.record?.id}"`,
      });
      notifications = result.items;
      updateUnreadCount();
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }

  function updateUnreadCount() {
    unreadCount = notifications.filter((n) => !n.is_read).length;
  }

  // Realtime subscription
  async function subscribe() {
    if (!pb.authStore.record?.id) return;
    pb.collection("notifications").subscribe("*", async (e) => {
      // Since filter is user-based, we receive mainly our own if rule works,
      // but subscription '*' receives all if we have permission.
      // We should check user ID.
      if (e.record.user === pb.authStore.record?.id) {
        if (e.action === "create") {
          notifications = [e.record, ...notifications];
          updateUnreadCount();
        } else if (e.action === "update") {
          notifications = notifications.map((n) =>
            n.id === e.record.id ? e.record : n,
          );
          updateUnreadCount();
        }
      }
    });
  }

  async function markAsRead(notification: any) {
    if (notification.is_read) return;
    try {
      await pb
        .collection("notifications")
        .update(notification.id, { is_read: true });
      notification.is_read = true;
      updateUnreadCount();
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  }

  async function markAllRead() {
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    if (unreadNotifications.length === 0) return;

    // Mise à jour locale (optimiste)
    notifications = notifications.map((n) => ({ ...n, is_read: true }));
    updateUnreadCount();

    try {
      // Mettre à jour dans PocketBase en parallèle
      await Promise.all(
        unreadNotifications.map((n) =>
          pb.collection("notifications").update(n.id, { is_read: true }),
        ),
      );
    } catch (err) {
      console.error("Failed to mark all as read in PocketBase", err);
    }
  }

  onMount(() => {
    loadNotifications();
    subscribe();
  });

  onDestroy(() => {
    pb.collection("notifications").unsubscribe("*");
  });

  function toggle() {
    isOpen = !isOpen;
    if (isOpen && unreadCount > 0) {
      // Optional: auto mark read on open? No, clickable is better usually.
    }
  }
</script>

<div class="notification-center">
  <button class="bell-btn" on:click={toggle}>
    <!-- Bell Icon -->
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
    {#if unreadCount > 0}
      <span class="badge" transition:fade>{unreadCount}</span>
    {/if}
  </button>

  {#if isOpen}
    <div class="dropdown" transition:fly={{ y: 10, duration: 200 }}>
      <div class="header">
        <h3>Notifications</h3>
        {#if unreadCount > 0}
          <button
            class="mark-read-btn"
            on:click={markAllRead}
            aria-label="Tout marquer comme lu">Tout lire</button
          >
        {/if}
      </div>
      <div class="list">
        {#if notifications.length === 0}
          <div class="empty">Aucune notification</div>
        {:else}
          {#each notifications as notif (notif.id)}
            <div
              class="item {notif.is_read ? 'read' : 'unread'}"
              on:click={() => markAsRead(notif)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === "Enter" && markAsRead(notif)}
            >
              <div class="item-header">
                <span class="title">{notif.title || "Notification"}</span>
                <span class="time"
                  >{new Date(notif.created).toLocaleTimeString()}</span
                >
              </div>
              <p class="content">{notif.content}</p>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notification-center {
    position: relative;
    pointer-events: auto;
  }

  .bell-btn {
    width: 40px;
    height: 40px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.2s;
    backdrop-filter: blur(8px);
  }

  .bell-btn:hover {
    background: rgba(51, 65, 85, 0.8);
    transform: scale(1.05);
  }

  .badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #ef4444;
    color: white;
    font-size: 0.65rem;
    font-weight: bold;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #0f172a;
  }

  .dropdown {
    position: absolute;
    top: 50px;
    right: 0;
    width: 300px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    overflow: hidden;
    z-index: 100;
  }

  .header {
    padding: 12px 16px;
    background: rgba(30, 41, 59, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #f8fafc;
  }

  .mark-read-btn {
    background: none;
    border: none;
    color: #38bdf8;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0;
  }

  .mark-read-btn:hover {
    text-decoration: underline;
  }

  .list {
    max-height: 350px;
    overflow-y: auto;
  }

  .list::-webkit-scrollbar {
    width: 4px;
  }

  .list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .empty {
    padding: 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .item {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background 0.2s;
  }

  .item:last-child {
    border-bottom: none;
  }

  .item:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .item.unread {
    background: rgba(56, 189, 248, 0.1);
    border-left: 3px solid #38bdf8;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    align-items: baseline;
  }

  .title {
    font-weight: 600;
    font-size: 0.85rem;
    color: #f1f5f9;
  }

  .time {
    font-size: 0.65rem;
    color: #64748b;
  }

  .content {
    margin: 0;
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.4;
  }
</style>
