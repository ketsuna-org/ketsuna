<script lang="ts">
  import { notifications } from "$lib/notifications";
  import { flip } from "svelte/animate";
  import { fly, fade } from "svelte/transition";

  function getTypeStyles(type: string) {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/50",
          text: "text-emerald-400",
          icon: "✅",
          glow: "shadow-emerald-500/10",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/50",
          text: "text-red-400",
          icon: "🚫",
          glow: "shadow-red-500/10",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/50",
          text: "text-amber-400",
          icon: "⚠️",
          glow: "shadow-amber-500/10",
        };
      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/50",
          text: "text-blue-400",
          icon: "ℹ️",
          glow: "shadow-blue-500/10",
        };
    }
  }
</script>

<div
  class="fixed top-6 right-6 z-9999 flex flex-col gap-4 w-full max-w-sm pointer-events-none"
>
  {#each $notifications as note (note.id)}
    {@const styles = getTypeStyles(note.type)}
    <div
      animate:flip={{ duration: 300 }}
      in:fly={{ x: 100, duration: 400, opacity: 0 }}
      out:fade={{ duration: 300 }}
      class="pointer-events-auto"
    >
      <div
        class={`
          flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md
          ${styles.bg} ${styles.border} ${styles.glow} shadow-xl
        `}
      >
        <div class="text-2xl shrink-0">
          {styles.icon}
        </div>
        <div class="flex-1">
          <p class={`text-sm font-semibold tracking-tight ${styles.text}`}>
            {note.message}
          </p>
        </div>
        <button
          onclick={() => notifications.remove(note.id)}
          aria-label="Close notification"
          class="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
    </div>
  {/each}
</div>
