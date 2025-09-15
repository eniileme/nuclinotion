import { ParsedNote, Heading, Link, Image } from './types';

/**
 * Parse YAML front matter from markdown content
 */
export function parseFrontMatter(content: string): { frontMatter: Record<string, unknown>; content: string } {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    return { frontMatter: {}, content };
  }
  
  const frontMatterText = match[1];
  const contentWithoutFrontMatter = match[2];
  
  // Simple YAML parser for basic key-value pairs
  const frontMatter: Record<string, unknown> = {};
  const lines = frontMatterText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Handle arrays (simple format: - item1, - item2)
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      frontMatter[key] = arrayContent.split(',').map(item => item.trim().replace(/['"]/g, ''));
    } else {
      frontMatter[key] = value;
    }
  }
  
  return { frontMatter, content: contentWithoutFrontMatter };
}

/**
 * Extract headings from markdown content
 */
export function extractHeadings(content: string): Heading[] {
  const headingRegex = /^(#+)\s+(.*)$/gm;
  const headings: Heading[] = [];
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const line = content.substring(0, match.index).split('\n').length;
    
    headings.push({
      level,
      text,
      line
    });
  }
  
  return headings;
}

/**
 * Extract links from markdown content
 */
export function extractLinks(content: string): Link[] {
  const links: Link[] = [];
  
  // Regular markdown links [text](href)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[1];
    const href = match[2];
    const line = content.substring(0, match.index).split('\n').length;
    
    links.push({
      text,
      href,
      isInternal: !href.startsWith('http') && !href.startsWith('mailto:'),
      isWikiLink: false,
      line
    });
  }
  
  // Wiki links [[Title]]
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const text = match[1];
    const line = content.substring(0, match.index).split('\n').length;
    
    links.push({
      text,
      href: text, // Wiki links use the text as the href
      isInternal: true,
      isWikiLink: true,
      line
    });
  }
  
  return links;
}

/**
 * Extract images from markdown content
 */
export function extractImages(content: string): Image[] {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: Image[] = [];
  let match;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const alt = match[1];
    const src = match[2];
    const line = content.substring(0, match.index).split('\n').length;
    
    images.push({
      alt,
      src,
      line
    });
  }
  
  return images;
}

/**
 * Extract note ID from filename (trailing hex pattern)
 */
export function extractNoteId(filename: string): string | undefined {
  const hexRegex = /([a-f0-9]{6,})\.md$/i;
  const match = filename.match(hexRegex);
  return match ? match[1] : undefined;
}

/**
 * Normalize content for vectorization
 */
export function normalizeContentForVectorization(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert wiki links to text
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Parse a markdown file into a ParsedNote
 */
export function parseMarkdownFile(filename: string, content: string): ParsedNote {
  const { frontMatter, content: cleanContent } = parseFrontMatter(content);
  
  // Extract title from front matter or filename
  const title = (frontMatter.title as string) || 
                (frontMatter.Title as string) || 
                filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
  
  // Extract tags from front matter
  const tags = frontMatter.tags || frontMatter.Tags || [];
  const tagArray = Array.isArray(tags) ? tags : 
                   typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [];
  
  // Extract other elements
  const headings = extractHeadings(cleanContent);
  const links = extractLinks(cleanContent);
  const images = extractImages(cleanContent);
  const noteId = extractNoteId(filename);
  const normalizedContent = normalizeContentForVectorization(cleanContent);
  
  return {
    id: filename,
    filename,
    title,
    content: cleanContent,
    normalizedContent,
    tags: tagArray,
    headings,
    links,
    images,
    noteId,
    frontMatter
  };
}

/**
 * Rewrite internal links in markdown content
 */
export function rewriteInternalLinks(
  content: string,
  notePath: string,
  linkMapping: Map<string, string>
): { content: string; rewrittenCount: number } {
  let rewrittenCount = 0;
  
  // Rewrite regular markdown links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let newContent = content.replace(linkRegex, (match, text, href) => {
    if (href.startsWith('http') || href.startsWith('mailto:')) {
      return match; // Keep external links unchanged
    }
    
    const newHref = linkMapping.get(href);
    if (newHref) {
      rewrittenCount++;
      return `[${text}](${newHref})`;
    }
    
    return match;
  });
  
  // Rewrite wiki links
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  newContent = newContent.replace(wikiLinkRegex, (match, text) => {
    const newHref = linkMapping.get(text);
    if (newHref) {
      rewrittenCount++;
      return `[${text}](${newHref})`;
    }
    
    return match;
  });
  
  return { content: newContent, rewrittenCount };
}

/**
 * Rewrite image links in markdown content
 */
export function rewriteImageLinks(
  content: string,
  imageMapping: Map<string, string>
): { content: string; rewrittenCount: number } {
  let rewrittenCount = 0;
  
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const newContent = content.replace(imageRegex, (match, alt, src) => {
    const newSrc = imageMapping.get(src);
    if (newSrc) {
      rewrittenCount++;
      return `![${alt}](${newSrc})`;
    }
    
    return match;
  });
  
  return { content: newContent, rewrittenCount };
}

/**
 * Generate section index markdown
 */
export function generateSectionIndex(notes: ParsedNote[]): string {
  if (notes.length === 0) {
    return '# Section\n\nNo notes in this section.';
  }
  
  const lines = ['# Section Contents', '', 'This section contains the following notes:', ''];
  
  for (const note of notes) {
    const filename = note.filename;
    const title = note.title;
    lines.push(`- [${title}](${filename})`);
  }
  
  return lines.join('\n');
}

/**
 * Resolve link target to actual file
 */
export function resolveLinkTarget(
  linkHref: string,
  currentNotePath: string,
  noteIndex: Map<string, ParsedNote>
): string | null {
  // Try exact match first
  if (noteIndex.has(linkHref)) {
    return linkHref;
  }
  
  // Try with .md extension
  const withExtension = linkHref.endsWith('.md') ? linkHref : `${linkHref}.md`;
  if (noteIndex.has(withExtension)) {
    return withExtension;
  }
  
  // Try filename stem match
  const stem = linkHref.replace(/\.md$/i, '');
  for (const [filename, note] of noteIndex) {
    const noteStem = filename.replace(/\.md$/i, '');
    if (noteStem.toLowerCase() === stem.toLowerCase()) {
      return filename;
    }
  }
  
  // Try title match
  for (const [filename, note] of noteIndex) {
    if (note.title.toLowerCase() === linkHref.toLowerCase()) {
      return filename;
    }
  }
  
  return null;
}
