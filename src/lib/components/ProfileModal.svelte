<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import pb, { type User } from "$lib/pocketbase";
  import { currentUser } from "$lib/stores";
  import { notifications } from "$lib/notifications";

  let { onClose } = $props<{ onClose: () => void }>();

  let user = $derived(pb.authStore.record as User);

  // Form state
  let username = $state("");
  let email = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let avatarFile: File | null = $state(null);
  let avatarPreview = $state("");

  // Sync form fields when user changes
  $effect(() => {
    if (user) {
      username = user.username || "";
      email = user.email || "";
      avatarPreview = user.avatar
        ? pb.files.getURL(user, user.avatar, { thumb: "100x100" })
        : "";
    }
  });

  let loading = $state(false);
  let error = $state("");
  let activeTab = $state<"profile" | "password">("profile");

  // Handle avatar file selection
  function handleAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        error = "L'image ne doit pas dépasser 5 Mo";
        return;
      }

      if (!file.type.startsWith("image/")) {
        error = "Seules les images sont acceptées";
        return;
      }

      avatarFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async function updateProfile() {
    if (!user?.id) return;

    loading = true;
    error = "";

    try {
      const formData = new FormData();
      let hasChanges = false;

      // Only add changed fields
      if (username !== user.username) {
        formData.append("username", username);
        hasChanges = true;
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
        hasChanges = true;
      }

      if (hasChanges) {
        await pb.collection("users").update(user.id, formData);

        // Refresh user data
        const updatedUser = await pb.collection("users").getOne(user.id);
        currentUser.set(updatedUser);

        notifications.success("Profil mis à jour avec succès");
      }

      if (email !== user.email) {
        await pb.collection("users").requestEmailChange(email);
        notifications.success("Demande de changement d'email envoyée");
      }

      onClose();
    } catch (err: any) {
      error = err.message || "Erreur lors de la mise à jour du profil";
    } finally {
      loading = false;
    }
  }

  async function updatePassword() {
    if (!user?.id) return;

    if (!newPassword || !confirmPassword) {
      error = "Tous les champs sont requis";
      return;
    }

    if (newPassword !== confirmPassword) {
      error = "Les mots de passe ne correspondent pas";
      return;
    }

    if (newPassword.length < 8) {
      error = "Le nouveau mot de passe doit contenir au moins 8 caractères";
      return;
    }

    loading = true;
    error = "";

    try {
      await pb.collection("users").update(user.id, {
        password: newPassword,
        passwordConfirm: confirmPassword,
      });

      notifications.success("Mot de passe modifié avec succès");
      newPassword = "";
      confirmPassword = "";
    } catch (err: any) {
      error = err.message || "Erreur lors du changement de mot de passe";
    } finally {
      loading = false;
    }
  }
</script>

<!-- Backdrop -->
<button
  onclick={onClose}
  class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
  transition:fade={{ duration: 200 }}
  aria-label="Fermer"
></button>

<!-- Modal -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden pointer-events-auto"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    <!-- Header -->
    <div
      class="px-6 py-4 bg-linear-to-r from-indigo-600 to-purple-600 flex items-center justify-between"
    >
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">
        <svg
          class="w-6 h-6"
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
        Mon Profil
      </h2>
      <button
        onclick={onClose}
        class="text-white/80 hover:text-white transition-colors"
        aria-label="Fermer"
      >
        <svg
          class="w-6 h-6"
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

    <!-- Tabs -->
    <div class="flex border-b border-slate-700 bg-slate-900/50">
      <button
        onclick={() => {
          activeTab = "profile";
          error = "";
        }}
        class="flex-1 px-6 py-3 font-semibold transition-all {activeTab ===
        'profile'
          ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50'
          : 'text-slate-400 hover:text-slate-300'}"
      >
        Informations
      </button>
      <button
        onclick={() => {
          activeTab = "password";
          error = "";
        }}
        class="flex-1 px-6 py-3 font-semibold transition-all {activeTab ===
        'password'
          ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50'
          : 'text-slate-400 hover:text-slate-300'}"
      >
        Sécurité
      </button>
    </div>

    <!-- Content -->
    <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
      {#if error}
        <div
          class="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2"
        >
          <svg class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          {error}
        </div>
      {/if}

      {#if activeTab === "profile"}
        <form
          onsubmit={(e) => {
            e.preventDefault();
            updateProfile();
          }}
          class="space-y-6"
        >
          <!-- Avatar Upload -->
          <div class="flex flex-col items-center gap-4">
            <div class="relative">
              <div
                class="w-32 h-32 rounded-full overflow-hidden bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-slate-700"
              >
                {#if avatarPreview}
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <span class="uppercase"
                    >{user?.username?.charAt(0) || "U"}</span
                  >
                {/if}
              </div>
              <label
                class="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full cursor-pointer shadow-lg transition-all"
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onchange={handleAvatarChange}
                  class="hidden"
                  aria-label="Changer la photo de profil"
                />
              </label>
            </div>
            <p class="text-xs text-slate-400">
              Cliquez sur l'icône pour changer votre photo (max 5 Mo)
            </p>
          </div>

          <!-- Username -->
          <div>
            <label
              for="username"
              class="block text-sm font-medium text-slate-300 mb-2"
            >
              Nom d'utilisateur
            </label>
            <input
              id="username"
              type="text"
              bind:value={username}
              class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <!-- Email -->
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-slate-300 mb-2"
            >
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={loading}
            class="w-full py-3 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
      {:else}
        <form
          onsubmit={(e) => {
            e.preventDefault();
            updatePassword();
          }}
          class="space-y-6"
        >
          <div
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6"
          >
            <p class="text-sm text-slate-300 flex items-start gap-2">
              <svg
                class="w-5 h-5 text-indigo-400 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <span
                >Votre mot de passe doit contenir au moins 8 caractères pour
                assurer la sécurité de votre compte.</span
              >
            </p>
          </div>
          <!-- New Password -->
          <div>
            <label
              for="new-password"
              class="block text-sm font-medium text-slate-300 mb-2"
            >
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              bind:value={newPassword}
              class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <!-- Confirm Password -->
          <div>
            <label
              for="confirm-password"
              class="block text-sm font-medium text-slate-300 mb-2"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              bind:value={confirmPassword}
              class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={loading}
            class="w-full py-3 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>
