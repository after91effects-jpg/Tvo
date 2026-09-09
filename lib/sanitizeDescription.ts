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

/**
 * Generates an ecommerce-friendly, scannable short description for product cards.
 *
 * Rules:
 * - Target length: ~60–100 characters (hard maximum target ~120 characters).
 * - Strips all HTML tags, editor metadata, unclosed tags, and emoji artifacts.
 * - Strips repetitive marketing preamble (e.g. "Enjoy the refreshing taste of our Pineapple Cake, made with...")
 * - Strips repetitive boilerplate outro (e.g. "A delicious treat perfect for every celebration. Weight 0.5 Kg")
 * - Preserves key product features, flavours, and characteristics.
 * - Stops at natural sentence or word boundaries.
 * - Falls back safely to a minimal, verified brand message if empty.
 */
export function getProductShortDescription(productOrDesc?: any, maxLength: number = 100): string {
  let text = '';
  if (typeof productOrDesc === 'string') {
    text = productOrDesc;
  } else if (productOrDesc && typeof productOrDesc === 'object') {
    const rawShort = productOrDesc.shortDescription || productOrDesc.short_description || '';
    // If rawShort is purely generic SEO boilerplate, try fallback to product.description
    if (/^Buy\s+.*?online\s+at\s+TVO\s+Flavours/i.test(rawShort.trim()) && productOrDesc.description) {
      text = productOrDesc.description;
    } else {
      text = rawShort || productOrDesc.description || '';
    }
  }

  text = String(text || '').trim();
  if (!text) return 'Freshly prepared for your special moments.';

  // Normalize escaped newlines from DB / JSON strings
  text = text.replace(/\\r\\n|\\n|\\r/g, ' ');

  // Decode standard and numeric HTML entities
  text = text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#215;|&times;/gi, '×');

  // Strip rich editor attributes (data-start, data-end, data-section-id, etc.)
  text = text.replace(/\s*data-[a-zA-Z0-9_-]+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');

  // Strip all HTML tags
  text = text.replace(/<[^>]*>/g, ' ');

  // Strip emojis and decorative symbols
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');

  // Collapse consecutive whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Remove Quick Facts header if present: "Quick Facts: [Name] — Price: ₹123. "
  text = text.replace(/^Quick\s+Facts:\s*[^—–-]+[—–-]\s*Price:\s*₹\d+[\.\s]*/i, '');

  // Prevent abbreviation dots from prematurely triggering sentence boundary detection
  text = text.replace(/\bapprox\./gi, 'approx');
  text = text.replace(/\be\.g\./gi, 'eg');
  text = text.replace(/\bi\.e\./gi, 'ie');

  // Remove weight indicator strings (weight is rendered separately by the selling-unit system)
  text = text.replace(/\bWeight\s*:\s*\d+(\.\d+)?\s*(Kg|kg|g|gm|piece|pieces)?\b/gi, '');
  text = text.replace(/\bWeight\s+\d+(\.\d+)?\s*(Kg|kg|g|gm|piece|pieces)?\b/gi, '');

  // Remove SEO boilerplate if present
  text = text.replace(/^Buy\s+.*?online\s+at\s+TVO\s+Flavours\s*(?:at\s+the\s+best\s+price\s*)?(?:,\s*with\s+fresh\s+delivery\s+across\s+India)?\.?\s*/i, '');

  // Remove generic festive greeting opening
  text = text.replace(/^Celebrate\s+the\s+timeless\s+bond\s+of\s+[^.]*?\s+with\s+(?:the|our)\s+[^.]*?\.\s*/i, '');

  // Remove list/section header prefixes
  text = text.replace(/^(?:(?:THE\s+)?HAMPER|(?:THE\s+)?PRODUCTS?\s+(?:INSIDE|INCLUDED)(?:\s+(?:THIS\s+)?(?:HAMPER|PACK|BOX|SET))?|WHAT[’']S\s+INSIDE|KEY\s+FEATURES?|CONTENTS?(?:\s+OF\s+THE\s+HAMPER)?|PRODUCT\s+DETAILS?|THIS\s+SET(?:\s+INCLUDES)?|SET\s+INCLUDES?)\s*:?\s*/i, '');

  // Remove leading bullet dashes/symbols
  text = text.replace(/^[-•*—–\s]+/, '');

  // Remove numbered list prefixes like "1.", "2."
  text = text.replace(/\b\d+\.\s*/g, ', ');

  // Remove repetitive trailing boilerplate
  text = text.replace(/[,\s]*(?:this\s+cake\s+is|this\s+is|it\s+is)\s+a\s+(?:delightful|delicious|perfect|dream)\s+treat.*$/i, '');
  text = text.replace(/[,\s]*(?:this\s+cake\s+is|this\s+is|it\s+is)\s+perfect\s+for\s+every.*$/i, '');
  text = text.replace(/[,\s]*(?:A|An)\s+(?:light|rich|fruity|creamy|delicious|luxurious|perfect|delightful|sweet)?\s*(?:and\s+[a-z]+)?\s*(?:cake|dessert|treat)\s*(?:crafted|designed|ideal|perfect)?\s*for\s+every\s+(?:celebration|special\s+celebration|occasion|moment|chocolate\s+lover).*$/i, '');
  text = text.replace(/[,\s]*for\s+the\s+perfect\s+(?:dessert\s+experience|celebration|birthday\s+surprise).*$/i, '');
  text = text.replace(/[,\s]*making\s+it\s+the\s+perfect\s+(?:surprise|treat|choice).*$/i, '');

  // Remove leading marketing boilerplate to expose the core product characteristic
  text = text.replace(/^(?:Enjoy|Experience|Indulge in|Celebrate|Dive into|Treat yourself to|Express your sweetest emotions with)\s+(?:the\s+)?(?:refreshing|perfect|irresistible|ultimate|rich|classic|sweet|pure|heavenly|luxurious|delightful|deep)?\s*(?:blend|taste|delight|indulgence|flavou?rs?|moments?|day|emotions)?\s*(?:of|with|in)?\s*(?:our|the)?\s*[^,.]*?(?:,\s*(?:made with|layered with|crafted with|featuring|loaded with|finished with|topped with|a\s+perfect\s+fusion\s+of)\s*|\.\s*Made with\s+|\.\s*Loaded with\s+|\.\s*Layered with\s+|\.\s*Finished with\s+)/i, '');

  // Clean leading prepositions
  text = text.replace(/^(?:Made with|Crafted with|Layered with|Loaded with|Prepared with|Finished with|Topped with|Thoughtfully designed for[^,]+,\s*)/i, '');

  // Clean trailing filler clauses
  text = text.replace(/,\s*this cake is\.?$/i, '');
  text = text.replace(/\s+for\s+(?:the|a)\.?$/i, '');

  // Clean unclosed opening parentheses at the end
  text = text.replace(/\s*\([^\)]*$/, '');

  // Clean trailing punctuation
  text = text.trim().replace(/[,;:\-\s]+$/, '');

  // If text is still longer than maxLength (default 100), try first sentence
  if (text.length > (maxLength + 15)) {
    const firstSentenceMatch = text.match(/^([^.!?]+[.!?])/);
    if (firstSentenceMatch && firstSentenceMatch[1].length >= 35 && firstSentenceMatch[1].length <= (maxLength + 20)) {
      text = firstSentenceMatch[1].trim();
    } else {
      // Break at last natural word boundary before maxLength
      let truncated = text.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 40) {
        truncated = truncated.substring(0, lastSpace);
      }
      text = truncated.trim().replace(/[,;:\-\s]+$/, '') + '.';
    }
  }

  // Ensure capitalization and punctuation
  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/\s+\./g, '.');
    if (!/[.!?]$/.test(text)) text += '.';
  } else {
    text = 'Freshly prepared for your special moments.';
  }

  return text;
}

