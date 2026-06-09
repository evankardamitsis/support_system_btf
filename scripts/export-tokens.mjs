/**
 * Extracts design tokens from CSS custom properties and outputs
 * a tokens.json compatible with Token Studio (Figma plugin).
 *
 * Usage: node scripts/export-tokens.mjs
 * Output: tokens.json (import via Token Studio → Figma Variables)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Parse CSS custom properties from a block of text ────────────────────────

function parseCssVars(css) {
  const vars = {};
  // Match: --name: value; (value may contain spaces, parens, commas)
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const name = m[1].trim();
    const value = m[2].trim();
    vars[name] = value;
  }
  return vars;
}

// ─── Extract a named CSS block (selector { ... }) ────────────────────────────

function extractBlock(css, selector) {
  // Escape special chars in selector for regex
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '\\s*\\{([^}]+)\\}', 's');
  const m = css.match(re);
  return m ? m[1] : '';
}

// ─── Convert hex/rgb to Token Studio value ───────────────────────────────────

function toTokenValue(value) {
  // Replace var(--x) references with {x} token references
  return value.replace(/var\(--([\w-]+)(?:,[^)]+)?\)/g, (_, name) => `{${name}}`);
}

// ─── Build Token Studio token set from vars map ──────────────────────────────

function buildTokenSet(vars) {
  const tokens = {};

  const COLOR_KEYS = [
    'bg', 'surface', 'surface-2', 'border', 'border-2',
    'accent', 'accent-fill', 'accent-dim', 'accent-dim-fill', 'accent-text',
    'accent-surface', 'accent-foreground',
    'text-1', 'text-2', 'text-3',
    'danger', 'warning', 'success',
    'background', 'foreground',
    'card', 'card-foreground',
    'popover', 'popover-foreground',
    'primary', 'primary-foreground',
    'secondary', 'secondary-foreground',
    'muted', 'muted-foreground',
    'destructive', 'destructive-foreground',
    'input', 'ring',
    'sidebar', 'sidebar-foreground', 'sidebar-border',
    'label-ink',
    'dash-chrome', 'dash-content', 'dash-ops-content',
    'ops-surface', 'ops-surface-2', 'ops-surface-muted', 'ops-border-soft',
    'ops-accent-backlog', 'ops-accent-progress', 'ops-accent-review',
    'ops-accent-done', 'ops-accent-hold', 'ops-accent-active', 'ops-accent-completed',
    'ops-progress-label', 'ops-progress-copy',
    'ops-accent-active', 'ops-accent-hold', 'ops-accent-completed',
    'overlay-scrim',
  ];

  const SHADOW_KEYS = [
    'shadow-panel', 'shadow-elevated', 'shadow-floating',
    'ops-shadow-panel', 'ops-shadow-card', 'ops-shadow-card-hover', 'ops-shadow-card-drag',
  ];

  const RADIUS_KEYS = ['radius', 'radius-sm', 'radius-md', 'radius-lg', 'radius-xl'];

  for (const key of COLOR_KEYS) {
    if (vars[key]) {
      tokens[key] = { value: toTokenValue(vars[key]), type: 'color' };
    }
  }
  for (const key of SHADOW_KEYS) {
    if (vars[key]) {
      tokens[key] = { value: toTokenValue(vars[key]), type: 'boxShadow' };
    }
  }
  for (const key of RADIUS_KEYS) {
    if (vars[key]) {
      tokens[key] = { value: vars[key], type: 'borderRadius' };
    }
  }

  return tokens;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const globalsCss = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
const colorModeCss = readFileSync(resolve(root, 'app/color-mode.css'), 'utf8');

// Dark mode: :root block in globals.css
const darkBlock = extractBlock(globalsCss, ':root');
const darkVars = parseCssVars(darkBlock);

// Light mode: html[data-color-mode='light'] block in color-mode.css
// This is the top-level block (not nested dashboard/theme blocks)
const lightBlock = extractBlock(colorModeCss, "html[data-color-mode='light']");
const lightVars = parseCssVars(lightBlock);

// Ops dark vars: .ops-layout block in globals.css
const opsDarkBlock = extractBlock(globalsCss, '.ops-layout');
const opsDarkVars = parseCssVars(opsDarkBlock);

// Merge ops dark into dark vars
const darkVarsFull = { ...darkVars, ...opsDarkVars };

const output = {
  // Token Studio uses sets; $metadata tells it which sets map to themes
  $metadata: {
    tokenSetOrder: ['core/dark', 'core/light'],
  },
  'core/dark': buildTokenSet(darkVarsFull),
  'core/light': buildTokenSet({ ...darkVarsFull, ...lightVars }),
};

const outPath = resolve(root, 'tokens.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✓ Wrote ${outPath}`);
console.log(`  dark tokens:  ${Object.keys(output['core/dark']).length}`);
console.log(`  light tokens: ${Object.keys(output['core/light']).length}`);
console.log('');
console.log('Next steps:');
console.log('  1. Install "Token Studio for Figma" plugin');
console.log('  2. In plugin → Settings → Token Storage → Local file / JSON');
console.log('  3. Import tokens.json');
console.log('  4. Enable both sets; set core/dark as the base theme, core/light as a theme override');
