// Общие функции скриптов: загрузка и проверка контента, прогон персон, симуляция случайных ответов.

import { existsSync, readFileSync } from 'node:fs';
import { DIRECTION_IDS } from '../src/engine/types.ts';
import type { Answers, DirectionId, Images, Quiz, Weights } from '../src/engine/types.ts';
import { allQuestions, evaluate, maxScores, zeroWeights } from '../src/engine/scoring.ts';
import type { Evaluation } from '../src/engine/scoring.ts';
import { PERSONAS } from './personas.ts';
import type { Persona } from './personas.ts';

export function loadQuiz(): Quiz {
  return JSON.parse(readFileSync(new URL('../content/quiz.json', import.meta.url), 'utf8')) as Quiz;
}

export function loadImages(): Images {
  return JSON.parse(readFileSync(new URL('../content/images.json', import.meta.url), 'utf8')) as Images;
}

/** У каждой картинки из квиза есть файл, описание для незрячих и автор с лицензией. */
export function validateImages(quiz: Quiz, images: Images): string[] {
  const errors: string[] = [];
  const used = [
    quiz.image,
    ...quiz.directions.map((d) => d.image),
    ...allQuestions(quiz).flatMap((q) => [q.image, ...q.options.flatMap((o) => (o.image ? [o.image] : []))]),
  ];
  for (const key of used) {
    if (!images[key]) errors.push(`Картинки «${key}» нет в content/images.json`);
  }
  for (const [key, image] of Object.entries(images)) {
    if (!used.includes(key)) errors.push(`Картинка «${key}» нигде не используется`);
    if (!existsSync(new URL(`../public/${image.file}`, import.meta.url))) errors.push(`Нет файла public/${image.file}`);
    if (!image.alt?.trim()) errors.push(`У картинки «${key}» нет описания (alt)`);
    const { author, source, url, license } = image.credit ?? {};
    if (!author || !source || !url || !license) errors.push(`У картинки «${key}» не указаны автор, источник или лицензия`);
  }
  return errors;
}

/** Проверяет структуру контента и принципы расстановки весов. Возвращает список ошибок. */
export function validateQuiz(quiz: Quiz): string[] {
  const errors: string[] = [];

  if (quiz.directions.map((d) => d.id).join() !== DIRECTION_IDS.join()) {
    errors.push(`Направления должны быть ровно такими и в таком порядке: ${DIRECTION_IDS.join(', ')}`);
  }

  const seen = new Set<string>();
  for (const block of quiz.blocks) {
    const own = block.direction;
    if (own && !DIRECTION_IDS.includes(own)) errors.push(`Блок ${block.id}: неизвестное направление ${own}`);

    for (const question of block.questions) {
      const at = `Вопрос ${question.id}`;
      if (seen.has(question.id)) errors.push(`${at}: id повторяется`);
      seen.add(question.id);

      if (question.type !== 'single' && question.type !== 'multiple') {
        errors.push(`${at}: тип должен быть single (один ответ) или multiple (несколько ответов)`);
      }
      if (!question.text?.trim() || !question.note?.trim()) errors.push(`${at}: нет текста или обоснования весов`);
      if (question.options.length < 3) errors.push(`${at}: меньше трёх вариантов`);
      if (question.options.map((o) => o.id).join('') !== 'abcdefgh'.slice(0, question.options.length)) {
        errors.push(`${at}: варианты должны идти по порядку a, b, c…`);
      }
      if (own && !question.options.some((o) => o.weights[own] > 0)) {
        errors.push(`${at}: ни один вариант не даёт баллов направлению своего блока`);
      }
      if (question.reasonTemplate && question.type !== 'multiple') {
        errors.push(`${at}: общее объяснение (reasonTemplate) бывает только в вопросах с несколькими ответами`);
      }
      for (const template of Object.values(question.reasonTemplate ?? {})) {
        if (!template.includes('{options}')) errors.push(`${at}: в общем объяснении нет {options}`);
      }

      for (const option of question.options) {
        const opt = `${at}, вариант ${option.id}`;
        const keys = Object.keys(option.weights ?? {}).sort().join();
        if (keys !== [...DIRECTION_IDS].sort().join()) errors.push(`${opt}: веса нужны ровно по четырём направлениям`);

        for (const id of DIRECTION_IDS) {
          const weight = option.weights?.[id];
          if (!Number.isInteger(weight) || weight < 0 || weight > 3) {
            errors.push(`${opt}: вес «${id}» должен быть целым числом от 0 до 3`);
            continue;
          }
          const template = question.reasonTemplate?.[id];
          if (template && weight > 0 && !option.short) errors.push(`${opt}: нужна короткая формулировка (short)`);
          if (!template && weight >= 2 && !option.reasons?.[id]) errors.push(`${opt}: вес ${weight} для «${id}» без объяснения`);
        }
        for (const id of Object.keys(option.reasons ?? {}) as DirectionId[]) {
          if (!(option.weights[id] > 0)) errors.push(`${opt}: есть объяснение для «${id}», но вес 0`);
        }
        if (option.exclusive) {
          if (question.type !== 'multiple') errors.push(`${opt}: «ничего из этого» бывает только при нескольких ответах`);
          if (DIRECTION_IDS.some((id) => option.weights[id] !== 0)) errors.push(`${opt}: у «ничего из этого» все веса должны быть 0`);
        }
      }
    }
  }

  const max = maxScores(quiz);
  const values = DIRECTION_IDS.map((id) => max[id]);
  if (Math.min(...values) !== Math.max(...values)) {
    errors.push(`Максимумы направлений различаются: ${DIRECTION_IDS.map((id) => `${id} ${max[id]}`).join(', ')}`);
  }
  return errors;
}

/** Превращает анкету персоны ('a', 'ac', …) в ответы по id вопросов. */
export function sheetToAnswers(quiz: Quiz, sheet: string[]): Answers {
  const questions = allQuestions(quiz);
  if (sheet.length !== questions.length) {
    throw new Error(`В анкете ${sheet.length} ответов, а вопросов ${questions.length}`);
  }
  return Object.fromEntries(
    questions.map((question, index) => {
      const ids = [...sheet[index]];
      const where = `Вопрос ${index + 1} (${question.id})`;
      if (question.type === 'single' && ids.length !== 1) throw new Error(`${where}: нужен ровно один ответ`);
      for (const id of ids) {
        const option = question.options.find((o) => o.id === id);
        if (!option) throw new Error(`${where}: нет варианта ${id}`);
        if (option.exclusive && ids.length > 1) throw new Error(`${where}: «ничего из этого» нельзя совмещать`);
      }
      return [question.id, ids];
    }),
  );
}

export interface PersonaResult {
  persona: Persona;
  evaluation: Evaluation;
  problems: string[];
}

export function runPersonas(quiz: Quiz): PersonaResult[] {
  return PERSONAS.map((persona) => {
    const evaluation = evaluate(quiz, sheetToAnswers(quiz, persona.sheet));
    const problems: string[] = [];
    if (!persona.expect.includes(evaluation.winner.direction.id)) {
      problems.push(`ожидали ${persona.expect.join(' или ')}, получили ${evaluation.winner.direction.id}`);
    }
    if (persona.expectClose !== undefined && persona.expectClose !== evaluation.isClose) {
      problems.push(persona.expectClose ? 'второе место должно быть почти равным' : 'второе место не должно быть почти равным');
    }
    if ((persona.expectWeak ?? false) !== evaluation.isWeak) {
      problems.push(persona.expectWeak ? 'склонность должна быть слабой' : 'склонность должна быть выраженной');
    }
    return { persona, evaluation, problems };
  });
}

/** Точное матожидание баллов при случайных ответах — по той же модели, что и simulate. */
export function expectedRandomScores(quiz: Quiz): Weights {
  const expected = zeroWeights();
  for (const question of allQuestions(quiz)) {
    const regular = question.options.filter((o) => !o.exclusive);
    const n = regular.length;
    // Если в вопросе с несколькими ответами нет «ничего из этого», пустой выбор заменяется случайным вариантом.
    const fallback = question.options.some((o) => o.exclusive) ? 0 : 0.5 ** n;
    for (const id of DIRECTION_IDS) {
      const total = regular.reduce((sum, o) => sum + o.weights[id], 0);
      expected[id] += question.type === 'single' ? total / n : total / 2 + (fallback * total) / n;
    }
  }
  return expected;
}

export interface Simulation {
  runs: number;
  /** Сколько раз победило каждое направление. */
  wins: Weights;
  /** Средний процент направления. */
  meanPercent: Weights;
  weak: number;
  close: number;
}

/**
 * Прогоняет анкеты со случайными ответами: в вопросе с одним ответом вариант выбирается
 * равновероятно, с несколькими — каждый вариант отмечается с вероятностью 1/2.
 * Если веса сбалансированы, направления побеждают примерно поровну.
 */
export function simulate(quiz: Quiz, runs = 20000, seed = 2026): Simulation {
  const random = mulberry32(seed);
  const wins = zeroWeights();
  const percentSum = zeroWeights();
  let weak = 0;
  let close = 0;

  for (let run = 0; run < runs; run++) {
    const answers: Answers = {};
    for (const question of allQuestions(quiz)) {
      const regular = question.options.filter((o) => !o.exclusive);
      if (question.type === 'single') {
        answers[question.id] = [regular[Math.floor(random() * regular.length)].id];
        continue;
      }
      const picked = regular.filter(() => random() < 0.5).map((o) => o.id);
      // Ничего не отмечено: берём «ничего из этого», а если его нет — любой вариант, иначе анкета неполная.
      const none = question.options.find((o) => o.exclusive);
      answers[question.id] =
        picked.length > 0 ? picked : [none?.id ?? regular[Math.floor(random() * regular.length)].id];
    }
    const evaluation = evaluate(quiz, answers);
    wins[evaluation.winner.direction.id]++;
    for (const score of evaluation.ranking) percentSum[score.direction.id] += score.percent;
    if (evaluation.isWeak) weak++;
    if (evaluation.isClose) close++;
  }

  const meanPercent = zeroWeights();
  for (const id of DIRECTION_IDS) meanPercent[id] = percentSum[id] / runs;
  return { runs, wins, meanPercent, weak, close };
}

/** Детерминированный генератор случайных чисел, чтобы отчёт не менялся от запуска к запуску. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function percent(value: number, total = 100): string {
  return `${Math.round((value / total) * 1000) / 10}`.replace('.', ',') + ' %';
}
