<script lang="ts">
    let { onclick } = $props<{ onclick: () => void }>();
</script>

<button
    {onclick}
    class="fixed bottom-6 right-6 z-40
           w-14 h-14 md:w-16 md:h-16
           bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
           rounded-full shadow-lg shadow-indigo-500/30
           flex items-center justify-center
           hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/40
           active:scale-95
           transition-all duration-200
           group"
    aria-label="Ouvrir le Tableau de Bord"
    title="Tableau de Bord"
>
    <!-- Animated Ring -->
    <div
        class="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-30"
    ></div>

    <!-- Icon - Grid/Apps symbol -->
    <svg
        class="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-lg group-hover:rotate-90 transition-transform duration-300"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
</button>
