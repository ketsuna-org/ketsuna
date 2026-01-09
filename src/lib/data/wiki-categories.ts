
export interface WikiArticle {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string; // HTML string or Markdown content
}

export interface WikiCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const wikiCategories: WikiCategory[] = [
  // Dynamic Categories (used by generator)
  {
    id: "items",
    title: "Ressources & Objets",
    description: "Matériaux bruts, composants et produits finis.",
    icon: "📦"
  },
  {
    id: "machines",
    title: "Parc Industriel",
    description: "Machines et outils de production.",
    icon: "🏭"
  },
  {
    id: "recipes",
    title: "Recettes",
    description: "Procédés de fabrication.",
    icon: "📜"
  },
  {
    id: "technologies",
    title: "Technologies",
    description: "Arbre de recherche et déblocages.",
    icon: "🔬"
  },
  {
    id: "guides",
    title: "Guide du Jeu",
    description: "Tutoriels et manuels pour assimiler les mécaniques.",
    icon: "📖" // Book Icon
  },
  {
    id: "context",
    title: "Le Contexte",
    description: "La fin des Nations et l'avènement du Secteur Omni.",
    icon: "🌍" // Globe/World Icon
  },
  {
    id: "graal",
    title: "Le Graal",
    description: "L'Étoile Zéro et la Singularité Économique.",
    icon: "🌟" // Star Icon
  },
  {
    id: "philosophy",
    title: "Philosophie",
    description: "L'Autre est l'Ennemi : Règles de survie.",
    icon: "⚖️" // Scales/Balance or Scroll
  },
  {
    id: "ascension",
    title: "L'Ascension",
    description: "Doctrines de Domination et Spécialisations.",
    icon: "👑" // Crown Icon
  }
];

export function getArticlesByCategory(categoryId: string, articles: WikiArticle[]): WikiArticle[] {
  return articles.filter(article => article.category === categoryId);
}
