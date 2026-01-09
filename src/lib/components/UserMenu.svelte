<script lang="ts">
  import { goto } from "$app/navigation";
  import { fly, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import pb, { type User } from "$lib/pocketbase";
  import { currentUser } from "$lib/stores";
  import ProfileModal from "./ProfileModal.svelte";

  let isOpen = $state(false);
  let showProfileModal = $state(false);
  let user = $derived($currentUser);

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }

  function logout() {
    pb.authStore.clear();
    closeMenu();
    goto("/");
  }

  function openProfileModal() {
    closeMenu();
    showProfileModal = true;
  }
</script>

{#if user}
  <div class="relative">
    <!-- User Avatar Button -->
    <button
      onclick={toggleMenu}
      class="group relative w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white/20"
      aria-label="Menu utilisateur"
    >
      {#if user.avatar}
        <img
          src={pb.files.getURL(
            pb.authStore.record as User,
            pb.authStore.record?.avatar,
            { thumb: "100x100" },
          )}
          alt={user.username}
          class="w-full h-full rounded-full object-cover"
        />
      {:else}
        <span class="text-sm uppercase">
          {user.username?.charAt(0) || "U"}
        </span>
      {/if}

      <!-- Online indicator -->
      <span
        class="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-950"
      ></span>
    </button>

    <!-- Dropdown Menu -->
    {#if isOpen}
      <!-- Backdrop -->
      <button
        onclick={closeMenu}
        class="fixed inset-0 z-40"
        transition:fade={{ duration: 200 }}
        aria-label="Fermer le menu"
      ></button>

      <!-- Menu Panel -->
      <div
        class="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden z-50"
        transition:fly={{ y: -10, duration: 300, easing: quintOut }}
      >
        <!-- User Info Header -->
        <div class="px-4 py-3 bg-linear-to-r from-indigo-600 to-purple-600">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-lg border-2 border-white/30"
            >
              {#if user.avatar}
                <img
                  src={pb.files.getURL(
                    pb.authStore.record as User,
                    pb.authStore.record?.avatar,
                    { thumb: "100x100" },
                  )}
                  alt={user.username}
                  class="w-full h-full rounded-full object-cover"
                />
              {:else}
                <span class="uppercase">
                  {user.username?.charAt(0) || "U"}
                </span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-white truncate">
                {user.username || "Utilisateur"}
              </p>
              <p class="text-xs text-indigo-100 truncate">
                {user.email || ""}
              </p>
              {#if user.is_premium}
                <span
                  class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-yellow-500/30 text-yellow-200 text-xs rounded-full border border-yellow-400/50"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                  Premium
                </span>
              {/if}
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-2">
          <button
            onclick={openProfileModal}
            class="w-full px-4 py-2.5 text-left text-slate-200 hover:bg-slate-700 transition-colors duration-200 flex items-center gap-3"
          >
            <svg
              class="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Mon profil</span>
          </button>
        </div>

        <!-- Separator -->
        <div class="border-t border-slate-700"></div>

        <!-- Logout -->
        <div class="py-2">
          <button
            onclick={logout}
            class="w-full px-4 py-2.5 text-left text-red-400 hover:bg-slate-700 transition-colors duration-200 flex items-center gap-3"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

{#if showProfileModal}
  <ProfileModal onClose={() => (showProfileModal = false)} />
{/if}
