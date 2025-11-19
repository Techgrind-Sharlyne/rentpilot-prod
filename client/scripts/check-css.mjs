// Post-build guard: warn (do not fail) if Tailwind markers are missing
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const cssDir = join(process.cwd(), 'dist', 'assets');
let files = [];
try {
  files = readdirSync(cssDir).filter(f => f.endsWith('.css'));
} catch (e) {
  console.warn('[postbuild:warn-css] dist/assets/ not found; did build run?');
  process.exit(0);
}

let ok = false;
for (const f of files) {
  const css = readFileSync(join(cssDir, f), 'utf8');
  if (css.includes('/*! tailwindcss')) ok = true;
  if (!css.includes('--background:')) {
    console.warn(`[postbuild:warn-css] WARNING: CSS variables not found in ${f}. Ensure src/index.css is imported first.`);
  }
}
if (!ok) {
  console.warn('[postbuild:warn-css] WARNING: Tailwind did not emit its preflight/utilities (/*! tailwindcss marker missing). Check Tailwind/PostCSS config and content globs.');
}
