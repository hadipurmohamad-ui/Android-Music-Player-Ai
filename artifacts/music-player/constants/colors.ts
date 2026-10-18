/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#171d16',
    tint: '#59792c',

    // Core surfaces
    background: '#f2f3ea',
    foreground: '#171d16',

    // Cards / elevated surfaces
    card: '#fafbf5',
    cardForeground: '#171d16',

    // Primary action color (buttons, links, active states)
    primary: '#59792c',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e6e9dc',
    secondaryForeground: '#30392a',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#e9ebe1',
    mutedForeground: '#73796f',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#d8eea0',
    accentForeground: '#253317',

    // Destructive actions (delete, error states)
    destructive: '#b84e43',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#dde1d4',
    input: '#dde1d4',
  },
  dark: {
    text: '#f2f5e9',
    tint: '#d7f16d',
    background: '#0d1512',
    foreground: '#f2f5e9',
    card: '#15211b',
    cardForeground: '#f2f5e9',
    primary: '#d7f16d',
    primaryForeground: '#17200d',
    secondary: '#1d2b24',
    secondaryForeground: '#d7e0d1',
    muted: '#1a2821',
    mutedForeground: '#9baa9d',
    accent: '#2b4131',
    accentForeground: '#e1f3ae',
    destructive: '#f17b6f',
    destructiveForeground: '#24100e',
    border: '#29382f',
    input: '#29382f',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 20,
};

export default colors;
