
import { error } from '@sveltejs/kit';
import matter from 'gray-matter';
import { marked } from 'marked';
import { getArticleBySlug } from '$lib/data/wiki';

export const prerender = true;

// Dynamic import of markdown files (works in production/Vercel/etc)
const markdownFiles = import.meta.glob<string>('/src/lib/data/wiki/*.md', { 
  query: '?raw', 
  import: 'default'
});

// Define all routes to generate at build time (SSG)
export function entries() {
  return Object.keys(markdownFiles).map(path => {
    // Extract slug from path: /src/lib/data/wiki/slug.md -> slug
    const slug = path.split('/').pop()?.replace('.md', '') || '';
    return { slug };
  });
}

export async function load({ params }) {
  const { slug } = params;
  
  // 1. Get metadata
  const articleMeta = getArticleBySlug(slug);
  if (!articleMeta) {
    throw error(404, 'Article non trouvé dans le registre');
  }

  // 2. Resolve the file loader
  const filePath = `/src/lib/data/wiki/${slug}.md`;
  const fileLoader = markdownFiles[filePath];

  if (!fileLoader) {
    console.error(`Wiki file not found: ${filePath}`);
    throw error(404, 'Fichier source introuvable');
  }

  try {
    // 3. Load content
    const rawContent = await fileLoader();
    
    // 4. Parse frontmatter and content
    const { data: frontmatter, content: rawMarkdown } = matter(rawContent);
    
    // 5. Convert markdown to HTML
    const htmlContent = await marked.parse(rawMarkdown);

    return {
      article: {
        ...articleMeta,
        title: frontmatter.title || articleMeta.title,
        excerpt: frontmatter.excerpt || articleMeta.excerpt,
        content: htmlContent
      }
    };
  } catch (err: any) {
    console.error(`Error loading wiki article ${slug}:`, err);
    throw error(500, 'Erreur lors du chargement de l\'article');
  }
}
