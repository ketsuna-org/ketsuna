
import { error } from '@sveltejs/kit';
import { getArticlesByCategory } from '$lib/data/wiki-categories';
import { loadGameData } from '$lib/stores/game-data-store';
import { getItem, getRecipe, getTechnology, getAllItems, getAllRecipes, getAllTechnologies } from '$lib/data/game-static';
import { generateItemArticle, generateRecipeArticle, generateTechArticle } from '$lib/data/wiki-generator';
// Markdown support
import { marked } from 'marked';

export const prerender = true;

// Dynamic import of markdown files
// Use relative path to ensure keys are simpler to reason about or consistent
const markdownFiles = import.meta.glob<string>('$lib/data/wiki/*.md', { 
  query: '?raw', 
  import: 'default'
});

// Pre-render all possible slugs
export async function entries() {
  await loadGameData();
  const entriesList = [];

  // 1. Markdown Files
  for (const path in markdownFiles) {
    const slug = path.split('/').pop()?.replace('.md', '');
    if (slug) entriesList.push({ slug });
  }



  // 3. Dynamic Items
  for (const item of getAllItems()) {
     entriesList.push({ slug: `item-${item.id}` });
  }

  // 4. Dynamic Recipes
  for (const recipe of getAllRecipes()) {
     entriesList.push({ slug: `recipe-${recipe.id}` });
  }

  // 5. Dynamic Techs
  for (const tech of getAllTechnologies()) {
     entriesList.push({ slug: `tech-${tech.id}` });
  }

  return entriesList;
}

// Simple Frontmatter Parser (Avoiding gray-matter buffer issues in browser)
function parseFrontmatter(raw: string) {
    const match = raw.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { data: {}, content: raw };
    }

    const frontmatterBlock = match[1];
    const content = match[2];
    const data: Record<string, string> = {};

    frontmatterBlock.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join(':').trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            data[key] = value;
        }
    });

    return { data, content };
}

export const load = async ({ params }) => {
  const { slug } = params;

  // 1. Try Loading Markdown File 
  // (Priority: Markdown File > Static Registry > Dynamic Data)
  // Use endsWith to match the slug regardless of absolute/relative path keys
  const markdownKey = Object.keys(markdownFiles).find(path => path.endsWith(`/${slug}.md`));
  const fileLoader = markdownKey ? markdownFiles[markdownKey] : undefined;

  if (fileLoader) {
    try {
        const rawContent = await fileLoader();
        const { data: frontmatter, content: rawMarkdown } = parseFrontmatter(rawContent);
        const htmlContent = await marked.parse(rawMarkdown);

        return {
            article: {
                slug,
                title: frontmatter.title || slug,
                category: frontmatter.category || 'guides',
                excerpt: frontmatter.excerpt || '',
                content: htmlContent
            },
            generated: false
        };
    } catch (e) {
        console.error(`Error parsing markdown for ${slug}`, e);
    }
  }



  // 3. Check Dynamic Game Data
  await loadGameData();

  if (slug.startsWith('item-')) {
    const id = slug.replace('item-', '');
    const item = getItem(id);
    if (item) return { article: generateItemArticle(item), generated: true };
  }

  if (slug.startsWith('recipe-')) {
    const id = slug.replace('recipe-', '');
    const recipe = getRecipe(id);
    if (recipe) return { article: generateRecipeArticle(recipe), generated: true };
  }

  if (slug.startsWith('tech-')) {
    const id = slug.replace('tech-', '');
    const tech = getTechnology(id);
    if (tech) return { article: generateTechArticle(tech), generated: true };
  }

  throw error(404, `Article encyclopédique '${slug}' introuvable.`);
};
