// npm run docs — собирает docs/questions.md, docs/questions.csv и docs/validation.md из content/quiz.json.

import { writeFileSync } from 'node:fs';
import type { Question } from '../src/engine/types.ts';
import { allQuestions, CLOSE_GAP, maxScores, WEAK_PERCENT } from '../src/engine/scoring.ts';
import { expectedRandomScores, loadImages, loadQuiz, percent, runPersonas, simulate, validateQuiz } from './lib.ts';

const quiz = loadQuiz();
const errors = validateQuiz(quiz);
if (errors.length > 0) {
  console.error(`В контенте ${errors.length} ошибок — подробности в npm run check.`);
  process.exit(1);
}

const questions = allQuestions(quiz);
const number = new Map(questions.map((question, index) => [question.id, index + 1]));
const short = Object.fromEntries(quiz.directions.map((d) => [d.id, d.short]));
const max = maxScores(quiz);
const generated = (source: string) =>
  `> Файл собирается из ${source} командой \`npm run docs\`. Правки вносятся туда, а не сюда.`;

const COUNT_GENITIVE: Record<number, string> = { 2: 'двух', 3: 'трёх', 4: 'четырёх', 5: 'пяти', 6: 'шести' };

function write(name: string, content: string): void {
  writeFileSync(new URL(`../docs/${name}`, import.meta.url), content);
  console.log(`docs/${name}`);
}

function typeLabel(question: Question): string {
  return question.type === 'single' ? 'Один ответ' : 'Несколько ответов';
}

function questionsMarkdown(): string {
  const single = questions.filter((q) => q.type === 'single');
  const situational = single.filter((q) => q.situational).map((q) => number.get(q.id));
  const multiple = questions.filter((q) => q.type === 'multiple').map((q) => number.get(q.id));
  const columns = quiz.directions.map((d) => d.short);

  const lines = [
    `# ${quiz.title} — вопросы и веса`,
    '',
    generated('`content/quiz.json`'),
    '',
    `Тест из ${questions.length} вопросов в ${quiz.blocks.length} блоках. По ответам рекомендуется одно из ${COUNT_GENITIVE[quiz.directions.length] ?? quiz.directions.length} направлений и объясняется, почему оно подходит.`,
    '',
    '## Как считается направление',
    '',
    '- У каждого варианта ответа есть вес от 0 до 3 по каждому направлению. Что означают веса и почему они такие — в [методике](methodology.md).',
    '- Веса отмеченных вариантов складываются по всем вопросам. Вопрос из блока одного направления может давать баллы и другому, если у них есть общая черта.',
    '- В вопросе с несколькими ответами можно отметить от одного варианта до всех, складываются веса всех отмеченных. Вариант «ничего из этого» снимает остальные отметки. Пропустить вопрос нельзя.',
    '- Сумма переводится в проценты от максимума M. В вопросе с одним ответом в M идёт наибольший вес среди вариантов, с несколькими — сумма всех весов. У всех направлений M одинаковый.',
    '- Рекомендуется направление с наибольшим процентом. При равенстве побеждает то, что набрало больше в общем блоке, а если и там поровну — то, что выше в таблице направлений.',
    `- Если второе место отстаёт меньше чем на ${CLOSE_GAP} п. п., оно показывается как почти равное. Если лучшее направление набрало меньше ${WEAK_PERCENT} %, склонность считается слабо выраженной.`,
    '',
    '## Направления',
    '',
    '| Приоритет | Направление | Коротко | Код | Максимум (M) |',
    '|:-:|---|---|---|:-:|',
    ...quiz.directions.map((d, i) => `| ${i + 1} | ${d.title} | ${d.short} | \`${d.id}\` | ${max[d.id]} |`),
    '',
    '## Вопросы',
    '',
    `Один ответ — ${single.length} вопросов (из них ${situational.length} — ситуационные задачи: № ${situational.join(', ')}), несколько ответов — ${multiple.length}: № ${multiple.join(', ')}.`,
  ];

  quiz.blocks.forEach((block, blockIndex) => {
    const owner = quiz.directions.find((d) => d.id === block.direction);
    lines.push(
      '',
      `### Блок ${blockIndex + 1}. ${block.title}`,
      '',
      owner
        ? `Блок направления «${owner.title}». ${block.description}.`
        : `Общий блок: варианты сравнивают направления между собой. ${block.description}.`,
    );
    for (const question of block.questions) {
      lines.push(
        '',
        `#### ${number.get(question.id)}. ${question.text}`,
        '',
        `**${typeLabel(question)}**${question.situational ? ' — ситуационная задача' : ''}`,
        '',
        `| | Вариант | ${columns.join(' | ')} |`,
        `|:-:|---|${columns.map(() => ':-:').join('|')}|`,
        ...question.options.map((option) => {
          const text = option.text.replaceAll('|', '\\|') + (option.exclusive ? ' _(снимает остальные отметки)_' : '');
          const weights = quiz.directions.map((d) => (option.weights[d.id] ? `**${option.weights[d.id]}**` : '0'));
          return `| ${option.id} | ${text} | ${weights.join(' | ')} |`;
        }),
        '',
        `*Обоснование весов.* ${question.note}`,
      );
    }
  });
  return lines.join('\n') + '\n';
}

/** Таблица для Excel: разделитель «;» и BOM, чтобы кириллица открылась без танцев. */
function questionsCsv(): string {
  const rows = [
    ['№', 'Блок', 'Код вопроса', 'Вопрос', 'Можно выбрать', 'Ситуационная задача', 'Вариант', 'Текст варианта', ...quiz.directions.map((d) => d.title)],
  ];
  quiz.blocks.forEach((block, blockIndex) => {
    for (const question of block.questions) {
      for (const option of question.options) {
        rows.push([
          String(number.get(question.id)),
          `${blockIndex + 1}. ${block.title}`,
          question.id,
          question.text,
          typeLabel(question).toLowerCase(),
          question.situational ? 'да' : '',
          option.id,
          option.text,
          ...quiz.directions.map((d) => String(option.weights[d.id])),
        ]);
      }
    }
  });
  const escape = (value: string) => (/[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
  return String.fromCharCode(0xfeff) + rows.map((row) => row.map(escape).join(';')).join('\n') + '\n';
}

function validationMarkdown(): string {
  const sim = simulate(quiz);
  const expected = expectedRandomScores(quiz);
  const points = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',');

  return [
    '# Проверка весов',
    '',
    generated('`content/quiz.json` и `scripts/personas.ts`'),
    'Та же проверка, но с ошибкой при нарушениях, — `npm run check`.',
    '',
    '## Баланс',
    '',
    `Максимум M у всех направлений одинаковый: ${quiz.directions.map((d) => `${d.short} — ${max[d.id]}`).join(', ')}.`,
    `Ожидаемая сумма баллов при случайных ответах тоже одинаковая: ${quiz.directions.map((d) => `${d.short} — ${points(expected[d.id])}`).join(', ')}.`,
    '',
    '## Персоны',
    '',
    'Ответы персон подобраны по смыслу вариантов, а не по весам. Если после правки весов персона получает другое направление, значит, веса разошлись со смыслом ответов.',
    '',
    '| Персона | Кто это | Ожидали | Результат | Второе место | |',
    '|---|---|---|---|---|:-:|',
    ...runPersonas(quiz).map(({ persona, evaluation, problems }) => {
      const expect = [
        persona.expect.map((id) => short[id]).join(' или '),
        persona.expectClose && 'почти поровну',
        persona.expectWeak && 'склонность слабая',
      ]
        .filter(Boolean)
        .join(', ');
      const { winner, runnerUp } = evaluation;
      return `| ${persona.name} | ${persona.story} | ${expect} | ${winner.direction.short} ${percent(winner.percent)} | ${runnerUp.direction.short} ${percent(runnerUp.percent)} | ${problems.length ? '✗' : '✓'} |`;
    }),
    '',
    '## Случайные ответы',
    '',
    `${sim.runs.toLocaleString('ru-RU')} анкет: в вопросе с одним ответом вариант выбирается равновероятно, в вопросе с несколькими каждый вариант отмечается с вероятностью 1/2.`,
    '',
    '| Направление | Побед | Средний процент |',
    '|---|:-:|:-:|',
    ...quiz.directions.map((d) => `| ${d.title} | ${percent(sim.wins[d.id], sim.runs)} | ${percent(sim.meanPercent[d.id])} |`),
    '',
    `Слабо выраженная склонность (меньше ${WEAK_PERCENT} %) — у ${percent(sim.weak, sim.runs)} анкет, почти равное второе место — у ${percent(sim.close, sim.runs)}.`,
    '',
    'Средние проценты совпадают, потому что совпадают M и ожидаемые суммы. Небольшой перевес «Детей» по числу побед даёт последнее правило для полной ничьей — одинаковый процент и одинаковые баллы в общем блоке: тогда побеждает направление, которое выше в таблице. Такие анкеты всегда получают отметку «почти равное второе место», поэтому второе направление человек тоже увидит.',
    '',
  ].join('\n');
}

/** Авторы и лицензии фото — лицензии CC BY и CC BY-SA требуют их указывать. */
function creditsMarkdown(): string {
  const images = loadImages();
  const escape = (text: string) => text.replaceAll('|', '\\|');
  return [
    '# Фотографии',
    '',
    generated('`content/images.json`'),
    '',
    'Все фото взяты с Wikimedia Commons и Flickr под свободными лицензиями. Для сайта они обрезаны до 3:2, уменьшены и пересжаты в WebP. Фото под CC BY-SA распространяются на тех же условиях.',
    '',
    '| Файл | Что на фото | Автор | Лицензия | Источник |',
    '|---|---|---|---|---|',
    ...Object.values(images).map(({ file, alt, credit }) => {
      const license = credit.licenseUrl ? `[${credit.license}](${credit.licenseUrl})` : credit.license;
      return `| \`${file.replace('images/', '')}\` | ${escape(alt)} | ${escape(credit.author)} | ${license} | [${credit.source}](${credit.url}) |`;
    }),
    '',
  ].join('\n');
}

write('questions.md', questionsMarkdown());
write('questions.csv', questionsCsv());
write('validation.md', validationMarkdown());
write('credits.md', creditsMarkdown());
