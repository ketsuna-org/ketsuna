<script lang="ts">
  import { resolve } from "$app/paths";

  const currentYear = new Date().getFullYear();
</script>

<footer
  class="bg-slate-950 border-t border-slate-900 text-slate-400 py-12 px-4 mt-auto"
>
  <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
    <!-- Brand -->
    <div class="space-y-4">
      <h3 class="text-white font-bold text-xl tracking-tight">
        Ketsuna: Iron Symphony
      </h3>
      <p class="text-sm leading-relaxed">
        Gérez votre empire, dominez le marché, et survivez aux corporations.
      </p>
    </div>

    <!-- Quick Links -->
    <div>
      <h4 class="text-white font-semibold mb-4">Navigation</h4>
      <ul class="space-y-2 text-sm">
        <li>
          <a
            href={resolve("/")}
            class="hover:text-indigo-400 transition-colors"
            >Accueil</a
          >
        </li>
        <li>
          <a
            href={resolve("/login")}
            class="hover:text-indigo-400 transition-colors"
            >Connexion</a
          >
        </li>
        <li>
          <a
            href={resolve("/wiki")}
            class="hover:text-indigo-400 transition-colors"
            >Wiki & Guides</a
          >
        </li>
      </ul>
    </div>

    <!-- Legal -->
    <div>
      <h4 class="text-white font-semibold mb-4">Légal</h4>
      <ul class="space-y-2 text-sm">
        <li>
          <a
            href={resolve("/legal/privacy")}
            class="hover:text-indigo-400 transition-colors">Confidentialité</a
          >
        </li>
        <li>
          <a
            href={resolve("/legal/terms")}
            class="hover:text-indigo-400 transition-colors"
            >Conditions d'utilisation</a
          >
        </li>
      </ul>
    </div>

    <!-- Community -->
    <div>
      <h4 class="text-white font-semibold mb-4">Communauté</h4>
      <a
        href="https://discord.gg/97qSsc6Vrs"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] hover:text-[#5865F2] border border-[#5865F2]/20 rounded-lg transition-all duration-200 group"
      >
        <svg
          class="w-5 h-5 group-hover:scale-110 transition-transform"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
          />
        </svg>
        Rejoindre Discord
      </a>
    </div>
  </div>

  <div
    class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 pt-8 border-t border-slate-900 text-xs text-slate-600"
  >
    <p>&copy; {currentYear} Ketsuna Business. Tous droits réservés.</p>
    <div class="flex gap-4 mt-4 md:mt-0">
      <span>Fait avec ❤️ pour les Tycoon lovers</span>
    </div>
  </div>
</footer>
