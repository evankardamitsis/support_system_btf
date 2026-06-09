/**
 * Syncs token values from tokens.json back into the CSS source files.
 *
 * Updates exactly three blocks:
 *   globals.css   → :root { ... }                             (dark base tokens)
 *   globals.css   → [data-theme="dashboard"] .ops-layout { }  (ops dark tokens)
 *   color-mode.css → html[data-color-mode='light'] { ... }    (light overrides)
 *
 * Usage: node scripts/sync-tokens.mjs [--dry-run]
 *
 * --dry-run  Print diffs without writing files.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Token Studio {ref} syntax back to CSS var(--ref) */
function toCSS(value) {
  return value.replace(/\{([\w-]+)\}/g, (_, name) => `var(--${name})`);
}

/**
 * Find the character-index boundaries of the first CSS block whose
 * opening line contains `selectorFragment`.
 * Returns { blockStart, blockEnd } where blockStart is the '{' position
 * and blockEnd is the '}' position (inclusive).
 */
function findBlock(css, selectorFragment) {
  const idx = css.indexOf(selectorFragment);
  if (idx === -1) throw new Error(`Selector not found: ${selectorFragment}`);
  const open = css.indexOf('{', idx);
  if (open === -1) throw new Error(`No opening brace after: ${selectorFragment}`);

  let depth = 1;
  let i = open + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  return { blockStart: open, blockEnd: i - 1 };
}

/**
 * Within `blockContent`, replace the value of a CSS custom property.
 * Handles multi-line values (everything between `:` and the terminating `;`).
 * Returns the updated block string, or null if the property wasn't found.
 */
function replaceVarInBlock(blockContent, varName, newValue) {
  // Match: --varName, colon, then everything up to the terminating semicolon (multi-line ok).
  const re = new RegExp(
    `(--${escapeRegex(varName)})(\\s*:)([^;]+)(;)`,
    's',
  );
  if (!re.test(blockContent)) return null;

  return blockContent.replace(re, (_, prop, colon, oldVal, semi) => {
    const cssVal = toCSS(newValue);
    // Preserve the original whitespace/alignment between the colon and the value.
    // oldVal may be "          #0e0e0e" (aligned) or " #0e0e0e" (plain) or
    // "\n    val1,\n    val2" (multi-line shadow).
    const leadingWs = oldVal.match(/^(\s*)/)[1];
    if (leadingWs.startsWith('\n')) {
      // Original had value on the next line — keep colon + newline, indent first line
      const innerIndent = leadingWs.slice(1); // whitespace after the \n
      return `${prop}${colon}\n${innerIndent}${cssVal}${semi}`;
    }
    return `${prop}${colon}${leadingWs}${cssVal}${semi}`;
  });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Patch a CSS file by updating vars inside a specific block.
 * `tokens` is a Record<varName, { value: string }>.
 * Only vars that already exist in the block are updated; extras are skipped.
 */
function patchBlock(css, selectorFragment, tokens) {
  const { blockStart, blockEnd } = findBlock(css, selectorFragment);

  const before = css.slice(0, blockStart + 1);   // up to and including '{'
  let block = css.slice(blockStart + 1, blockEnd); // interior of the block
  const after = css.slice(blockEnd);              // '}' onwards

  let updated = 0;
  const skipped = [];

  for (const [varName, token] of Object.entries(tokens)) {
    const result = replaceVarInBlock(block, varName, token.value);
    if (result !== null) {
      block = result;
      updated++;
    } else {
      skipped.push(varName);
    }
  }

  if (skipped.length) {
    console.log(`  ↷ skipped (not in block): ${skipped.join(', ')}`);
  }

  return { css: before + block + after, updated };
}

// ─── Determine which tokens belong to each block ─────────────────────────────

/** Ops-specific vars that live in .ops-layout, not :root */
const OPS_VARS = new Set([
  'ops-surface', 'ops-surface-2', 'ops-surface-muted', 'ops-border-soft',
  'ops-accent-backlog', 'ops-accent-progress', 'ops-accent-review',
  'ops-accent-done', 'ops-accent-hold', 'ops-accent-active', 'ops-accent-completed',
  'ops-progress-label', 'ops-progress-copy',
  'ops-shadow-panel', 'ops-shadow-card', 'ops-shadow-card-hover', 'ops-shadow-card-drag',
]);

// ─── Main ─────────────────────────────────────────────────────────────────────

const tokensPath = resolve(root, 'tokens.json');
const globalsCssPath = resolve(root, 'app/globals.css');
const colorModeCssPath = resolve(root, 'app/color-mode.css');

const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
const darkTokens = tokens['core/dark'] ?? {};
const lightTokens = tokens['core/light'] ?? {};

// Split dark tokens: :root gets non-ops vars, .ops-layout gets ops vars
const rootTokens = Object.fromEntries(
  Object.entries(darkTokens).filter(([k]) => !OPS_VARS.has(k)),
);
const opsTokens = Object.fromEntries(
  Object.entries(darkTokens).filter(([k]) => OPS_VARS.has(k)),
);

// Light overrides = only tokens where light value differs from dark value
const lightOnlyTokens = Object.fromEntries(
  Object.entries(lightTokens).filter(
    ([k, v]) => !darkTokens[k] || darkTokens[k].value !== v.value,
  ),
);

// ─── Patch globals.css ────────────────────────────────────────────────────────

console.log('\nPatching globals.css → :root');
let globalsCss = readFileSync(globalsCssPath, 'utf8');
const rootResult = patchBlock(globalsCss, ':root', rootTokens);
globalsCss = rootResult.css;
console.log(`  ✓ ${rootResult.updated} vars updated`);

console.log('\nPatching globals.css → .ops-layout');
const opsResult = patchBlock(globalsCss, '[data-theme="dashboard"] .ops-layout', opsTokens);
globalsCss = opsResult.css;
console.log(`  ✓ ${opsResult.updated} vars updated`);

// ─── Patch color-mode.css ─────────────────────────────────────────────────────

console.log("\nPatching color-mode.css → html[data-color-mode='light']");
let colorModeCss = readFileSync(colorModeCssPath, 'utf8');
const lightResult = patchBlock(colorModeCss, "html[data-color-mode='light']", lightOnlyTokens);
colorModeCss = lightResult.css;
console.log(`  ✓ ${lightResult.updated} vars updated`);

// ─── Write or dry-run ─────────────────────────────────────────────────────────

if (DRY_RUN) {
  console.log('\n[dry-run] No files written.');
  console.log('Remove --dry-run to apply changes.');
} else {
  writeFileSync(globalsCssPath, globalsCss);
  writeFileSync(colorModeCssPath, colorModeCss);
  console.log('\n✓ Files updated.');
  console.log('  app/globals.css');
  console.log('  app/color-mode.css');
}
