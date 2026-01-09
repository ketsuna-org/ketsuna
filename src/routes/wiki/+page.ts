
import type { WikiArticle } from "$lib/data/wiki-categories";

// Import all markdown files to get their frontmatter
const markdownFiles = import.meta.glob<string>('$lib/data/wiki/*.md', { 
  query: '?raw', 
  import: 'default'
});

function parseFrontmatter(raw: string) {
    const match = raw.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { data: {}, content: raw };
    }

    const frontmatterBlock = match[1];
    const data: Record<string, string> = {};

    frontmatterBlock.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join(':').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            data[key] = value;
        }
    });

    return { data };
}

export const load = async () => {
  const articles: WikiArticle[] = [];

  for (const path in markdownFiles) {
    const slug = path.split('/').pop()?.replace('.md', '');
    const rawContent = await markdownFiles[path]();
    const { data } = parseFrontmatter(rawContent);
    
    if (slug) {
        articles.push({
            slug,
            title: data.title || slug,
            category: data.category || 'other',
            excerpt: data.excerpt || '',
            content: '' // Content not needed for listing
        });
    }
  }

  return {
    articles
  };
};
