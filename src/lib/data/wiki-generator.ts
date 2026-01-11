import type { Item, Recipe, Technology } from "$lib/types/game";
import type { WikiArticle } from "$lib/data/wiki-categories";
import { getItemName, getAllRecipes } from "$lib/data/game-static";

// --- Generators ---

export function generateItemArticle(item: Item): WikiArticle {
  const isMachine = item.type === "Machine";
  const isStorage = item.type === "Stockage";
  const allRecipes = getAllRecipes();
  
  let content = `
    <h2>Caractéristiques</h2>
    <div class="grid grid-cols-2 gap-4 mb-8 not-prose">
        <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-wider">Type</div>
            <div class="font-bold text-white">${item.type}</div>
        </div>
        <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-wider">Prix de Base</div>
            <div class="font-bold text-emerald-400">${item.base_price.toLocaleString()} ₭</div>
        </div>
        <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-wider">Unité</div>
            <div class="font-bold text-slate-300">${item.unit}</div>
        </div>
    </div>
  `;

  if (isMachine || isStorage) {
    content += `
        <h2>Spécifications Industrielles</h2>
        <ul class="list-none pl-0 space-y-2">
            ${item.production_time ? `<li>⏱️ <strong>Temps de cycle:</strong> ${item.production_time}s</li>` : ''}
            ${item.max_employee ? `<li>👥 <strong>Employés Max:</strong> ${item.max_employee}</li>` : ''}
            ${item.energy_type ? `<li>⚡ <strong>Énergie:</strong> ${item.energy_type}</li>` : ''}
            ${item.product ? `<li>📦 <strong>Produit Direct:</strong> ${getItemName(item.product)} (x${item.product_quantity})</li>` : ''}
        </ul>
    `;
    
    // Find recipes that use this machine
    const machineRecipes = allRecipes.filter(r => r.machine_type === item.id);
    if (machineRecipes.length > 0) {
      const recipeLinks = machineRecipes.map(r => 
        `<a href="/wiki/recipe-${r.id}" class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
            📋 ${r.name}
        </a>`
      ).join(" ");
      
      content += `
        <h2>Recettes Compatibles (${machineRecipes.length})</h2>
        <p class="text-slate-400 text-sm mb-4">Cette machine peut exécuter les recettes suivantes :</p>
        <div class="flex flex-wrap gap-2 not-prose">
            ${recipeLinks}
        </div>
      `;
    }
  } else {
    // Resource/Item details
    content += `
        <h2>Usage et Disponibilité</h2>
        <ul class="list-disc pl-5 space-y-2">
            <li><strong>Minable par le CEO:</strong> ${item.minable ? 'Oui' : 'Non'}</li>
            <li><strong>Explorable:</strong> ${item.is_explorable ? 'Oui via expéditions' : 'Non'}</li>
            <li><strong>Marché Global:</strong> ${item.market_available ? "Disponible à l'achat" : 'Restreint / Craft uniquement'}</li>
        </ul>
    `;
    
    // Find recipes that PRODUCE this item
    const producingRecipes = allRecipes.filter(r => r.output_item === item.id);
    if (producingRecipes.length > 0) {
      const recipeList = producingRecipes.map(r => {
        const machineName = r.machine_type ? getItemName(r.machine_type) : "Manuel";
        return `<li class="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
            <a href="/wiki/recipe-${r.id}" class="text-indigo-400 hover:text-indigo-300">${r.name}</a>
            <span class="text-sm text-slate-500">via ${machineName}</span>
        </li>`;
      }).join("");
      
      content += `
        <h2>Comment Produire</h2>
        <p class="text-slate-400 text-sm mb-4">Cet item peut être fabriqué avec les recettes suivantes :</p>
        <ul class="list-none bg-slate-900/30 rounded-xl p-4 not-prose">
            ${recipeList}
        </ul>
      `;
    }
    
    // Find recipes that USE this item as input
    const usingRecipes = allRecipes.filter(r => 
      r.inputs.some(i => (i.item_id || i.item) === item.id)
    );
    if (usingRecipes.length > 0) {
      const recipeList = usingRecipes.map(r => {
        const outputName = getItemName(r.output_item);
        return `<li class="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
            <a href="/wiki/recipe-${r.id}" class="text-indigo-400 hover:text-indigo-300">${r.name}</a>
            <span class="text-sm text-slate-500">→ ${outputName}</span>
        </li>`;
      }).join("");
      
      content += `
        <h2>Utilisé Dans (${usingRecipes.length} recettes)</h2>
        <p class="text-slate-400 text-sm mb-4">Cet item est requis pour fabriquer :</p>
        <ul class="list-none bg-slate-900/30 rounded-xl p-4 not-prose">
            ${recipeList}
        </ul>
      `;
    }
  }

  return {
    slug: `item-${item.id}`,
    title: item.name,
    category: isMachine ? "machines" : "items",
    excerpt: `Fiche technique pour : ${item.name} (${item.type})`,
    content,
  };
}

export function generateRecipeArticle(recipe: Recipe): WikiArticle {
  const inputsList = recipe.inputs.map(i => 
    `<li class="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
        <span>${getItemName(i.item_id || i.item)}</span>
        <span class="font-mono text-indigo-400">x${i.quantity}</span>
    </li>`
  ).join("");

  const content = `
    <h2>Détails de Fabrication</h2>
    <div class="flex flex-col md:flex-row gap-8 mb-8 items-start not-prose">
        <!-- Inputs -->
        <div class="flex-1 w-full bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <h3 class="text-slate-400 text-sm uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Entrées Requises</h3>
            <ul class="text-sm text-slate-300">
                ${inputsList}
            </ul>
        </div>

        <div class="hidden md:flex flex-col items-center justify-center pt-8 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-slate-500 mb-1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <div class="text-xs font-mono text-slate-500">${recipe.production_time}s</div>
        </div>

        <!-- Output -->
        <div class="flex-1 w-full bg-slate-900/50 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
            <div class="absolute inset-0 bg-emerald-900/5"></div>
            <h3 class="text-emerald-400 text-sm uppercase tracking-wider mb-4 border-b border-emerald-900/30 pb-2 relative z-10">Production</h3>
            <div class="flex justify-between items-center relative z-10">
                <span class="font-bold text-white text-lg">${getItemName(recipe.output_item)}</span>
                <span class="font-mono text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">x${recipe.output_quantity}</span>
            </div>
        </div>
    </div>

    <h2>Conditions</h2>
    <ul class="list-disc pl-5">
        <li><strong>Machine requise:</strong> ${recipe.machine_type ? getItemName(recipe.machine_type) : "Aucune (Manuel)"}</li>
        <li><strong>Temps de production:</strong> ${recipe.production_time} secondes</li>
        <li><strong>Tech requise:</strong> ${recipe.required_tech || "Aucune"}</li>
    </ul>
  `;

  return {
    slug: `recipe-${recipe.id}`,
    title: `Recette: ${recipe.name}`,
    category: "recipes",
    excerpt: `Procédé de fabrication pour ${recipe.name}.`,
    content,
  };
}

export function generateTechArticle(tech: Technology): WikiArticle {
  const unlocksList = tech.item_unlocked?.map(id => 
    `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        ${getItemName(id)}
    </span>`
  ).join(" ") || "Aucun item direct";

  const content = `
    <div class="p-6 bg-slate-900/50 border-l-4 border-purple-500 rounded-r-xl mb-8 not-prose">
        <p class="text-lg text-slate-200 italic">"${tech.description}"</p>
    </div>

    <h2>Pré-requis</h2>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 not-prose">
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase">Coût Recherche</div>
            <div class="font-bold text-amber-400">${tech.cost.toLocaleString()} ₭</div>
        </div>
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase">Temps</div>
            <div class="font-bold text-slate-300">${tech.unlock_time > 0 ? tech.unlock_time + 's' : 'Instant'}</div>
        </div>
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase">Niveau requis</div>
            <div class="font-bold text-white">Lvl ${tech.required_level}</div>
        </div>
    </div>

    <h2>Déblocages</h2>
    <div class="flex flex-wrap gap-2 not-prose">
        ${unlocksList}
    </div>
  `;

  return {
    slug: `tech-${tech.id}`,
    title: `Tech: ${tech.name}`,
    category: "technologies",
    excerpt: tech.description,
    content,
  };
}
