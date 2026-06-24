const assert = require('node:assert/strict');
const test = require('node:test');

const { isBot } = require('../dist/utils/botFilter');

// Regression guard for the bug where `@users.noreply.github.com` was treated
// as a bot signal. That address is GitHub's default for any user who keeps
// their email private — on React it erased 212 of 1,010 real contributors
// (21%), including active core maintainers. These cases lock that shut.

test('GitHub noreply addresses are NOT bots (private-email real users)', () => {
  const realPeople = [
    ['Joseph Savona', '6425824+josephsavona@users.noreply.github.com'],
    ['Lauren Tan', 'poteto@users.noreply.github.com'],
    ['Ruslan Lesiutin', '28902667+hoxyq@users.noreply.github.com'],
    ['Brandon Dail', 'aweary@users.noreply.github.com'],
    ['Daishi Kato', 'dai-shi@users.noreply.github.com'],
  ];
  for (const [name, email] of realPeople) {
    assert.equal(isBot(name, email), false, `${name} <${email}> wrongly flagged as a bot`);
  }
});

test('human names containing the substring "bot" are NOT bots', () => {
  // Guards against a naive "bot" substring match.
  assert.equal(isBot('Brendan Abbott', 'brendan@bloodbone.ws'), false);
  assert.equal(isBot('Rune Botten', 'rbotten@gmail.com'), false);
});

test('genuine automation accounts ARE still detected', () => {
  const bots = [
    ['dependabot[bot]', '49699333+dependabot[bot]@users.noreply.github.com'],
    ['github-actions[bot]', 'github-actions[bot]@users.noreply.github.com'],
    ['renovate[bot]', '29139614+renovate[bot]@users.noreply.github.com'],
    ['Facebook Community Bot', 'facebook-github-bot@users.noreply.github.com'],
    ['semantic-release-bot', 'semantic-release-bot@martynus.net'],
  ];
  for (const [name, email] of bots) {
    assert.equal(isBot(name, email), true, `${name} <${email}> not detected as a bot`);
  }
});
