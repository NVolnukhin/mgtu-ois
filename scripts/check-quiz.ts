// npm run check — проверяет контент квиза, прогоняет персоны и случайные анкеты.
// Завершается с ошибкой, если веса нарушают принципы из docs/methodology.md.

import { DIRECTION_IDS } from '../src/engine/types.ts';
import { allQuestions, maxScores } from '../src/engine/scoring.ts';
import { loadQuiz, percent, runPersonas, simulate, validateQuiz } from './lib.ts';

/** Допустимая доля побед одного направления на случайных ответах. */
const FAIR_SHARE = { min: 0.2, max: 0.3 };

const quiz = loadQuiz();
const short = Object.fromEntries(quiz.directions.map((d) => [d.id, d.short]));
let failed = false;

const errors = validateQuiz(quiz);
const questions = allQuestions(quiz);
const single = questions.filter((q) => q.type === 'single');
const situational = single.filter((q) => q.situational).length;
console.log(
  `Контент: ${questions.length} вопросов в ${quiz.blocks.length} блоках. ` +
    `Один ответ — ${single.length} (из них ${situational} ситуационные задачи), ` +
    `несколько ответов — ${questions.length - single.length}.`,
);
if (errors.length > 0) {
  failed = true;
  console.log(`\n✗ Ошибки в контенте (${errors.length}):`);
  for (const error of errors) console.log(`  – ${error}`);
}

const max = maxScores(quiz);
console.log(`Максимум по направлениям (M): ${DIRECTION_IDS.map((id) => `${short[id]} ${max[id]}`).join(' · ')}`);

console.log('\nПерсоны:');
for (const { persona, evaluation, problems } of runPersonas(quiz)) {
  const { winner, runnerUp } = evaluation;
  const flags = [evaluation.isClose && 'почти равное второе место', evaluation.isWeak && 'склонность слабая']
    .filter(Boolean)
    .join(', ');
  console.log(
    `  ${problems.length ? '✗' : '✓'} ${persona.name}: ${winner.direction.short} ${percent(winner.percent)}, ` +
      `второе — ${runnerUp.direction.short} ${percent(runnerUp.percent)}${flags ? ` (${flags})` : ''}`,
  );
  for (const problem of problems) console.log(`      ${problem}`);
  if (problems.length > 0) failed = true;
}

const sim = simulate(quiz);
console.log(`\nСлучайные ответы, ${sim.runs.toLocaleString('ru-RU')} анкет:`);
console.log(`  Побед: ${DIRECTION_IDS.map((id) => `${short[id]} ${percent(sim.wins[id], sim.runs)}`).join(' · ')}`);
console.log(`  Средний процент: ${DIRECTION_IDS.map((id) => `${short[id]} ${percent(sim.meanPercent[id])}`).join(' · ')}`);
console.log(`  Слабая склонность: ${percent(sim.weak, sim.runs)} анкет, почти равное второе место: ${percent(sim.close, sim.runs)}`);
for (const id of DIRECTION_IDS) {
  const share = sim.wins[id] / sim.runs;
  if (share < FAIR_SHARE.min || share > FAIR_SHARE.max) {
    failed = true;
    console.log(`  ✗ ${short[id]} побеждает в ${percent(share, 1)} случаев — веса несбалансированы`);
  }
}

console.log(failed ? '\nПроверка не пройдена.' : '\nВсё в порядке.');
process.exit(failed ? 1 : 0);
