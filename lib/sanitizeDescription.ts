/**
 * Production Description Sanitization & Normalization Utility
 * TVO Flavours — The All-in-one Bakery Shop
 *
 * Ensures customer-facing descriptions are 100% clean of:
 * - Raw HTML tags (<p>, <strong>, <span>, <h3>, etc.)
 * - Rich editor metadata (data-start, data-end, data-section-id, data-*)
 * - Dangling or unclosed tags (<p data-start=...)
 * - Escaped backslash artifacts (\n, \r, \t)
 * - Stray punctuation and duplicate whitespace
 */

/**
 * Strips all HTML tags, dangling tags, and editor-generated metadata, returning clean plain text.
 * Ideal for short descriptions, card previews, SEO meta tags, and accessibility labels.
 */
export function stripHtmlAndMetadata(input?: string | null): string {
  if (!input) return '';
  let text = String(input);

  // Normalize escaped newline characters from raw JSON / DB strings
  text = text.replace(/\\r\\n|\\n|\\r/g, ' ');

  // Remove editor attributes like data-start="...", data-end="...", data-section-id="..."
  text = text.replace(/\s*data-[a-zA-Z0-9_-]+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');

  // Remove unclosed or dangling HTML tags at the end of text (e.g. "<p data-start=")
  text = text.replace(/<[a-zA-Z0-9]+[^>]*$/g, ' ');

  // Remove empty opening/closing tags like <h3 ...></h3>, <p></p>
  text = text.replace(/<([a-zA-Z0-9]+)[^>]*>\s*<\/\1>/gi, ' ');

  // Strip all remaining HTML tags (both complete and unclosed)
  text = text.replace(/<\/?[a-zA-Z0-9]+(?:\s+[^>]*?)?\/?>/gi, ' ');
  text = text.replace(/<[^>]*>/g, ' ');

  // Decode standard HTML entities
  text = text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');

  // Collapse multiple whitespace/tabs/newlines into a single clean space
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Normalizes rich long descriptions into clean, formatted paragraphs:
 * - Strips all editor metadata (data-start, data-end, data-*)
 * - Strips unsafe tags, unclosed tags, and unescaped HTML
 * - Converts raw HTML or mixed text into clean array of paragraphs
 * - Never exposes raw tags like "<p>" or "<strong>" to customers
 */
export function normalizeDescriptionParagraphs(input?: string | null): string[] {
  if (!input) return [];
  let raw = String(input);

  // Normalize literal escaped newlines from DB / JSON strings
  raw = raw.replace(/\\r\\n|\\n|\\r/g, '\n');

  // Remove editor attributes from all tags first
  raw = raw.replace(/\s*data-[a-zA-Z0-9_-]+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');

  // Remove unclosed or dangling HTML tags at line ends
  raw = raw.replace(/<[a-zA-Z0-9]+[^>]*$/gm, ' ');

  // Convert HTML block ends to double newlines to delineate clean paragraphs
  raw = raw
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|article)>/gi, '\n\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n');

  // Split by double newlines into candidate paragraph blocks
  const blocks = raw.split(/\n\n+/);
  const paragraphs: string[] = [];

  for (const block of blocks) {
    const cleaned = stripHtmlAndMetadata(block);
    // Ignore empty blocks or stray single-character artifacts
    if (cleaned && cleaned.length > 2) {
      paragraphs.push(cleaned);
    }
  }

  // If no blocks were found but input exists, fallback to stripped text
  if (paragraphs.length === 0) {
    const fallback = stripHtmlAndMetadata(input);
    if (fallback) paragraphs.push(fallback);
  }

  return paragraphs;
}

/**
 * Recombines sanitized paragraphs into a clean, normalized multi-line string.
 */
export function cleanDescription(input?: string | null): string {
  return normalizeDescriptionParagraphs(input).join('\n\n');
}
