import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { test } from 'node:test';

const tokens = JSON.parse(
  readFileSync(new URL('../lib/stitch-tokens.json', import.meta.url)),
);
function luminance(hex) {
  const rgb = hex
    .match(/[a-f\d]{2}/gi)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
test('Stitch text and action roles retain AA contrast on their actual surfaces', () => {
  for (const [foreground, background] of [
    ['on-surface', 'surface'],
    ['on-surface-variant', 'surface'],
    ['on-surface-variant', 'surface-container-low'],
    ['surface-container-lowest', 'primary'],
    ['surface-container-lowest', 'primary-container'],
    ['primary-fixed', 'primary-container'],
    ['surface-container-lowest', 'secondary'],
    ['on-primary-fixed', 'primary-fixed'],
  ]) {
    const a = luminance(tokens.colors[foreground]),
      b = luminance(tokens.colors[background]);
    assert.ok(
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
      `${foreground} on ${background}`,
    );
  }
});
test('Stitch references retain all 14 source designs without reducing readable text', () => {
  assert.equal(tokens.project, '12747977855754983799');
  assert.deepEqual(
    [
      tokens.colors.primary,
      tokens.colors['primary-container'],
      tokens.colors.secondary,
      tokens.colors.surface,
      tokens.colors['surface-container-low'],
      tokens.colors['on-surface'],
    ],
    ['#000b31', '#051f5b', '#b22c00', '#f8f9ff', '#eff4ff', '#121c2a'],
  );
  assert.equal(tokens.title, 'CampusHR: Academic Workforce Platform');
  assert.equal(tokens.screens.length, 14);
  assert.equal(new Set(tokens.screens.map((s) => s.name)).size, 14);
  assert.ok(Object.values(tokens.typography).every((size) => size >= 14));
  assert.ok(
    tokens.screens.every((s) =>
      s.name.startsWith(`projects/${tokens.project}/screens/`),
    ),
  );
});
