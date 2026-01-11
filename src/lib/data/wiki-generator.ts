import type { Item, Recipe, Technology } from "$lib/types/game";
import type { WikiArticle } from "$lib/data/wiki-categories";
import { getItemName, getAllRecipes } from "$lib/data/game-static";

// --- Generators ---

export function generateItemArticle(item: Item): WikiArticle {
  const isMachine = item.type === "Machine";
  const isStorage = item.type === "Stockage";
  const allRecipes = getAllRecipes();
  
  // Utiliser la description du backend si disponible, sinon un fallback générique
  const descriptionBlock = item.description 
    ? `<div class="p-6 bg-slate-900/50 border-l-4 border-indigo-500 rounded-r-xl mb-8 not-prose">
         <p class="text-lg text-slate-200 leading-relaxed italic">"${item.description}"</p>
       </div>`
    : '';

  // Bloc Conseil Stratégique
  const tipBlock = item.strategic_tip
    ? `<div class="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl mb-8 flex gap-4 items-start not-prose">
         <div class="text-2xl">💡</div>
         <div>
           <h3 class="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-1 mt-1">Conseil Stratégique</h3>
           <p class="text-slate-300 text-sm">${item.strategic_tip}</p>
         </div>
       </div>`
    : '';

  let content = `
    ${descriptionBlock}
    ${tipBlock}
    
    <h2>Caractéristiques</h2>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 not-prose">
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
        <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-wider">Volatilité</div>
            <div class="font-bold ${item.volatility > 0.4 ? 'text-red-400' : 'text-slate-300'}">${(item.volatility * 100).toFixed(0)}%</div>
        </div>
    </div>
  `;

  if (isMachine || isStorage) {
    content += `
        <h2>Spécifications Industrielles</h2>
        <ul class="list-none pl-0 space-y-2 mb-8">
            ${item.production_time ? `<li class="flex items-center gap-3"><span class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">⏱️</span> <span><strong>Temps de cycle:</strong> ${item.production_time}s</span></li>` : ''}
            ${item.max_employee ? `<li class="flex items-center gap-3"><span class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">👥</span> <span><strong>Employés Max:</strong> ${item.max_employee}</span></li>` : ''}
            ${item.energy_type ? `<li class="flex items-center gap-3"><span class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">⚡</span> <span><strong>Énergie:</strong> ${item.energy_type}</span></li>` : ''}
            ${item.product ? `<li class="flex items-center gap-3"><span class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">📦</span> <span><strong>Produit Direct:</strong> <a href="/wiki/item-${item.product}" class="text-indigo-400 hover:underline">${getItemName(item.product)}</a> (x${item.product_quantity})</span></li>` : ''}
        </ul>
    `;
    
    // Find recipes that use this machine
    const machineRecipes = allRecipes.filter(r => r.machine_type === item.id);
    if (machineRecipes.length > 0) {
      const recipeLinks = machineRecipes.map(r => 
        `<a href="/wiki/recipe-${r.id}" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
            <span>📋</span> ${r.name}
        </a>`
      ).join(" ");
      
      content += `
        <h2>Recettes Compatibles (${machineRecipes.length})</h2>
        <p class="text-slate-400 text-sm mb-4">Cette machine est configurée pour exécuter les protocoles suivants :</p>
        <div class="flex flex-wrap gap-2 not-prose">
            ${recipeLinks}
        </div>
      `;
    }
  } else {
    // Resource/Item details
    content += `
        <h2>Usage et Disponibilité</h2>
        <ul class="list-none pl-0 space-y-2 mb-8">
            <li class="flex items-center gap-3">
                <span class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs">${item.minable ? '✅' : '❌'}</span>
                <span class="text-slate-300">Minable par le CEO</span>
            </li>
            <li class="flex items-center gap-3">
                <span class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs">${item.is_explorable ? '✅' : '❌'}</span>
                <span class="text-slate-300">Trouvable en exploration</span>
            </li>
            <li class="flex items-center gap-3">
                <span class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs">${item.market_available ? '✅' : '⚠️'}</span>
                <span class="text-slate-300">${item.market_available ? "Disponible au Marché Global" : 'Restreint (Craft ou Exploration uniquement)'}</span>
            </li>
        </ul>
    `;
    
    // Find recipes that PRODUCE this item
    const producingRecipes = allRecipes.filter(r => r.output_item === item.id);
    if (producingRecipes.length > 0) {
      const recipeList = producingRecipes.map(r => {
        const machineName = r.machine_type ? getItemName(r.machine_type) : "Atelier Manuel";
        const machineSlug = r.machine_type ? `item-${r.machine_type}` : "";
        
        return `<li class="flex justify-between items-center py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 px-2 rounded transition-colors">
            <a href="/wiki/recipe-${r.id}" class="font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                <span>⚡</span> ${r.name}
            </a>
            <div class="text-sm text-slate-500 flex items-center gap-1">
                <span>via</span>
                ${machineSlug ? `<a href="/wiki/${machineSlug}" class="text-slate-400 hover:text-white underline decoration-dotted">${machineName}</a>` : machineName}
            </div>
        </li>`;
      }).join("");
      
      content += `
        <h2>Comment Produire</h2>
        <div class="bg-slate-900/30 rounded-xl border border-slate-800 p-2 not-prose overflow-hidden">
            <ul class="list-none m-0 p-0">
                ${recipeList}
            </ul>
        </div>
        <br>
      `;
    }
    
    // Find recipes that USE this item as input
    const usingRecipes = allRecipes.filter(r => 
      r.inputs?.some(i => (i.item_id || i.item) === item.id)
    );
    if (usingRecipes.length > 0) {
      const recipeList = usingRecipes.map(r => {
        const outputName = getItemName(r.output_item);
        const outputSlug = `item-${r.output_item}`;
        
        return `<li class="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0 px-2">
            <a href="/wiki/recipe-${r.id}" class="text-slate-300 hover:text-indigo-400 transition-colors">${r.name}</a>
            <a href="/wiki/${outputSlug}" class="text-sm px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-indigo-600 transition-all">
                → ${outputName}
            </a>
        </li>`;
      }).join("");
      
      content += `
        <h2>Utilisé Dans (${usingRecipes.length} recettes)</h2>
        <p class="text-slate-400 text-sm mb-4">Cet item est un composant requis pour :</p>
        <div class="bg-slate-900/30 rounded-xl border border-slate-800 p-2 not-prose max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <ul class="list-none m-0 p-0">
                ${recipeList}
            </ul>
        </div>
      `;
    }
  }

  return {
    slug: `item-${item.id}`,
    title: item.name,
    category: isMachine ? "machines" : "items",
    excerpt: item.description ? item.description.substring(0, 150) + "..." : `Fiche technique pour : ${item.name}`,
    content,
  };
}

export function generateRecipeArticle(recipe: Recipe): WikiArticle {
  const inputsList = recipe.inputs?.map(i => 
    `<li class="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
        <span>${getItemName(i.item_id || i.item)}</span>
        <span class="font-mono text-indigo-400">x${i.quantity}</span>
    </li>`
  ).join("") || "";

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
    `<a href="/wiki/item-${id}" class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
        ${getItemName(id)}
    </a>`
  ).join(" ") || "Aucun item direct";

  // Bloc Conseil Stratégique
  const tipBlock = tech.strategic_tip
    ? `<div class="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl mb-8 flex gap-4 items-start not-prose">
         <div class="text-2xl">💡</div>
         <div>
           <h3 class="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-1 mt-1">Conseil Stratégique</h3>
           <p class="text-slate-300 text-sm">${tech.strategic_tip}</p>
         </div>
       </div>`
    : '';

  const content = `
    <div class="p-6 bg-slate-900/50 border-l-4 border-purple-500 rounded-r-xl mb-8 not-prose">
        <p class="text-lg text-slate-200 italic">"${tech.description}"</p>
    </div>

    ${tipBlock}

    <h2>Pré-requis</h2>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 not-prose">
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-widest mb-1">Coût Recherche</div>
            <div class="font-bold text-amber-400 text-lg">${tech.cost.toLocaleString()} ₭</div>
        </div>
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-widest mb-1">Temps</div>
            <div class="font-bold text-slate-300 text-lg">${tech.unlock_time > 0 ? (tech.unlock_time/60).toFixed(0) + ' min' : 'Instant'}</div>
        </div>
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div class="text-xs text-slate-500 uppercase tracking-widest mb-1">Niveau requis</div>
            <div class="font-bold text-white text-lg">Lvl ${tech.required_level}</div>
        </div>
    </div>

    <h2>Déblocages</h2>
    <p class="text-slate-400 text-sm mb-4">Cette technologie donne accès aux plans suivants :</p>
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
