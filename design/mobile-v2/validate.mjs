// Run: node design/mobile-v2/validate.mjs. Validates design data, not rendered UI.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const tokens = JSON.parse(
  await readFile(new URL('./tokens.json', import.meta.url), 'utf8'),
);
const luminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255);
  return channels
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
};
const contrast = (first, second) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
for (const [name, value] of Object.entries(tokens.color))
  assert.match(value, /^#[0-9A-F]{6}$/, name);
for (const pair of tokens.contrastPairs) {
  assert.ok(
    tokens.color[pair.foreground] && tokens.color[pair.background],
    'Unknown contrast token',
  );
  assert.ok(
    contrast(tokens.color[pair.foreground], tokens.color[pair.background]) >=
      pair.minimum,
    `${pair.foreground} / ${pair.background} fails ${pair.minimum}:1`,
  );
}
for (const pair of tokens.restrictedPairs)
  assert.ok(
    contrast(tokens.color[pair.foreground], tokens.color[pair.background]) <
      4.5,
  );
for (const variant of Object.values(tokens.button).filter(
  (value) => value.foreground,
)) {
  if (variant.background !== 'transparent')
    assert.ok(
      contrast(
        tokens.color[variant.foreground],
        tokens.color[variant.background],
      ) >= 4.5,
    );
  if (variant.pressedBackground)
    assert.ok(
      contrast(
        tokens.color[variant.foreground],
        tokens.color[variant.pressedBackground],
      ) >= 4.5,
    );
}
assert.deepEqual(
  Object.values(tokens.space),
  [4, 8, 12, 16, 20, 24, 32, 40, 48],
);
assert.ok(tokens.size.touchTargetMin >= 48);
for (const role of Object.values(tokens.typography))
  assert.ok(role.size >= 14 && role.lineHeight >= role.size);
assert.equal(new Set(tokens.components).size, 30);
assert.deepEqual(tokens.navigation.faculty, [
  'Home',
  'Timetable',
  'Attendance',
  'Leave',
  'Profile',
]);
assert.deepEqual(tokens.navigation.hod, [
  'Home',
  'Approvals',
  'Timetable',
  'Workload',
  'Profile',
]);
assert.equal(tokens.navigation.floatingSettings, false);
assert.equal(tokens.motion.decorativeMotion, false);
console.log(
  `V2 design data validated: ${Object.keys(tokens.color).length} color roles, ${tokens.contrastPairs.length} approved contrast pairs, 30 component contracts.`,
);
