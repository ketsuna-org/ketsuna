// Wiki data types and utilities
// Articles are loaded from markdown files in ./wiki/ directory

export interface WikiArticle {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
}

export interface WikiCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const wikiCategories: WikiCategory[] = [
  {
    id: "getting-started",
    title: "Bien Débuter",
    description: "Les bases pour survivre dans l'économie corporatiste.",
    icon: "🚀"
  },
  {
    id: "ressources",
    title: "Ressources",
    description: "Tous les matériaux exploitables et leur utilisation.",
    icon: "⛏️"
  },
  {
    id: "production",
    title: "Production",
    description: "Machines, recettes et chaînes de fabrication.",
    icon: "🏭"
  },
  {
    id: "technologies",
    title: "Arbre Technologique",
    description: "Recherche et progression technologique.",
    icon: "🔬"
  },
  {
    id: "factions",
    title: "Les Corporations",
    description: "Tout savoir sur les 5 géants qui dominent le monde.",
    icon: "🏢"
  },
  {
    id: "economy",
    title: "Économie & Finance",
    description: "Comprendre la bourse, les salaires et le marché.",
    icon: "📈"
  }
];

// Article metadata - content is loaded from markdown files
export const wikiArticles: WikiArticle[] = [
  // Getting Started
  { slug: "premiers-pas", title: "Vos premières minutes", category: "getting-started", excerpt: "Guide de survie pour tout nouveau PDG.", content: "" },
  { slug: "interface-jeu", title: "L'Interface du Jeu", category: "getting-started", excerpt: "Comprendre les différentes pages et mécaniques.", content: "" },
  { slug: "energie", title: "Système Énergétique", category: "getting-started", excerpt: "Comprendre la production et consommation d'électricité.", content: "" },
  
  // Ressources
  { slug: "ressources-brutes", title: "Ressources Brutes", category: "ressources", excerpt: "Les matériaux de base à extraire ou récolter.", content: "" },
  { slug: "composants", title: "Composants", category: "ressources", excerpt: "Les pièces intermédiaires pour la fabrication avancée.", content: "" },
  { slug: "produits-finis", title: "Produits Finis", category: "ressources", excerpt: "Les biens de consommation à forte valeur ajoutée.", content: "" },
  
  // Production
  { slug: "machines", title: "Liste des Machines", category: "production", excerpt: "Toutes les machines disponibles et leurs caractéristiques.", content: "" },
  { slug: "recettes", title: "Recettes de Fabrication", category: "production", excerpt: "Comment transformer vos ressources en produits.", content: "" },
  
  // Technologies
  { slug: "arbre-tech", title: "Arbre Technologique", category: "technologies", excerpt: "Toutes les technologies à débloquer.", content: "" },
  
  // Factions
  { slug: "les-cinq-piliers", title: "Les Cinq Piliers", category: "factions", excerpt: "Les corporations qui dominent le monde.", content: "" },
  { slug: "lore-entropie", title: "L'Entropie & L'Étincelle", category: "factions", excerpt: "La menace qui pèse sur le système.", content: "" },
  
  // Economy
  { slug: "marche-volatilite", title: "Marché & Volatilité", category: "economy", excerpt: "Comment fonctionnent les prix du marché.", content: "" },
  { slug: "employes-salaires", title: "Employés & Salaires", category: "economy", excerpt: "Gérer votre main d'œuvre efficacement.", content: "" },
];

export function getArticlesByCategory(categoryId: string): WikiArticle[] {
  return wikiArticles.filter(article => article.category === categoryId);
}

export function getArticleBySlug(slug: string): WikiArticle | undefined {
  return wikiArticles.find(article => article.slug === slug);
}
