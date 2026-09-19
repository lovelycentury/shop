/**
 * A handful of common apparel colour names that aren't valid CSS colours on
 * their own. Everything else is passed straight through - most colour names
 * a "Color" option carries (black, white, navy, olive, ...) already are one.
 */
const NAMED_COLOR_OVERRIDES: Record<string, string> = {
  charcoal: "#36454f",
  stone: "#8f8578",
  sand: "#c2b280",
  cream: "#f5f0dc",
  denim: "#1560bd",
  rust: "#b7410e",
  mustard: "#e1ad01",
}

/**
 * Best-effort swatch colour for a "Color" option value. An unrecognised name
 * is handed to the browser as-is: an invalid `background-color` is simply
 * ignored, leaving the swatch's own neutral fallback fill showing through
 * rather than throwing or rendering empty.
 */
export const swatchColor = (value: string): string => {
  const normalized = value.trim().toLowerCase()

  return NAMED_COLOR_OVERRIDES[normalized] ?? normalized
}
