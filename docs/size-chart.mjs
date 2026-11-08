// Generates docs/size-light.svg, docs/size-dark.svg and the wordmarks used at the top of the README.
// Numbers: latest npm source of each library, terser, gzip -9. Update the arrays and run `node docs/size-chart.mjs`.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const dir = path.dirname(new URL(import.meta.url).pathname);

const panels = [
  {
    title: 'Reactive core',
    note: 'state + effects, min+gzip',
    rows: [
      ['minim core', 516, true],
      ['usignal', 882],
      ['VanJS', 1153],
      ['hyperactiv', 1220],
      ['nanostores', 2339],
    ],
  },
  {
    title: 'HTML-first, no JavaScript on the page',
    note: 'bind data-* attributes, min+gzip',
    rows: [
      ['minim lite (everything)', 1260, true],
      ['petite-vue', 7080],
      ['Alpine.js', 19911],
    ],
  },
];

const themes = {
  // 'inline' uses the page's CSS variables, so the SVG can be inlined once and follow light/dark automatically
  inline: { bg: 'transparent', text: 'var(--ink)', muted: 'var(--mut)', bar: 'var(--sf2)', accent: 'var(--acc)', accentText: 'var(--bg)', grid: 'var(--sf2)' },
  light: { bg: 'transparent', text: '#1f2328', muted: '#59636e', bar: '#d0d7de', accent: '#1a7a37', accentText: '#ffffff', grid: '#d0d7de' },
  dark:  { bg: 'transparent', text: '#e6edf3', muted: '#9198a1', bar: '#3d444d', accent: '#3fb950', accentText: '#0d1117', grid: '#3d444d' },
};

const W = 880, LABEL = 200, PAD = 24, ROW = 30, BAR = 18, GAP = 26;
const fmt = n => n.toLocaleString('en-US') + ' B';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function chart(t) {
  let y = PAD, out = [];
  const font = `font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"`;
  for (const p of panels) {
    const max = Math.max(...p.rows.map(r => r[1]));
    const plotW = W - LABEL - PAD - 110;
    out.push(`<text x="${PAD}" y="${y + 14}" ${font} font-size="15" font-weight="700" fill="${t.text}">${esc(p.title)}</text>`);
    out.push(`<text x="${W - PAD}" y="${y + 14}" ${font} font-size="12" fill="${t.muted}" text-anchor="end">${esc(p.note)}</text>`);
    y += 30;
    for (const [name, bytes, hero] of p.rows) {
      const w = Math.max(4, Math.round(plotW * bytes / max));
      const cy = y + ROW / 2;
      out.push(`<text x="${LABEL - 12}" y="${cy + 4}" ${font} font-size="13" font-weight="${hero ? 700 : 400}" fill="${t.text}" text-anchor="end">${esc(name)}</text>`);
      out.push(`<rect x="${LABEL}" y="${cy - BAR / 2}" width="${w}" height="${BAR}" rx="4" fill="${hero ? t.accent : t.bar}"/>`);
      const ratio = hero ? '' : `  ·  ${(bytes / p.rows[0][1]).toFixed(bytes / p.rows[0][1] >= 10 ? 0 : 1)}× minim`;
      out.push(`<text x="${LABEL + w + 8}" y="${cy + 4}" ${font} font-size="12" font-weight="${hero ? 700 : 400}" fill="${hero ? t.accent : t.muted}">${fmt(bytes)}${esc(ratio)}</text>`);
      y += ROW;
    }
    y += GAP;
  }
  const H = y - GAP + PAD / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Size comparison: minim is the smallest in both groups">
<rect width="${W}" height="${H}" fill="${t.bg}"/>
${out.join('\n')}
</svg>
`;
}

function wordmark(t) {
  const font = `font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="132" viewBox="0 0 480 132" role="img" aria-label="minim">
<defs>
  <!-- gradient and clip are in the mirrored text's own coordinates: its baseline (local y=62) lands at screen y=70 -->
  <linearGradient id="fade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.4"/><stop offset="0.7" stop-color="${t.accent}" stop-opacity="0"/></linearGradient>
  <clipPath id="under"><rect x="0" y="34" width="480" height="30"/></clipPath>
</defs>
<text x="240" y="62" ${font} font-size="64" font-weight="700" letter-spacing="2" text-anchor="middle" fill="${t.text}">minim</text>
<text x="240" y="62" ${font} font-size="64" font-weight="700" letter-spacing="2" text-anchor="middle" fill="url(#fade)" clip-path="url(#under)" transform="translate(0,132) scale(1,-1)">minim</text>
<text x="240" y="118" ${font} font-size="11" letter-spacing="3" text-anchor="middle" fill="${t.muted}">READS THE SAME BACKWARDS · 1.2 KB GZIPPED</text>
</svg>
`;
}

for (const [name, t] of Object.entries(themes)) {
  const strip = (svg) => name === 'inline' ? svg.replace(/ width="\d+" height="\d+"/, '') : svg;   // page sizes inline SVGs with CSS
  await writeFile(path.join(dir, `size-${name}.svg`), strip(chart(t)));
  await writeFile(path.join(dir, `wordmark-${name}.svg`), strip(wordmark(t)));
}
console.log('docs: wrote size-{light,dark}.svg and wordmark-{light,dark}.svg');
