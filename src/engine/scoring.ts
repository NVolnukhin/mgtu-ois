// Механизм вывода: считает баллы по направлениям, выбирает подходящее и объясняет выбор.
// Файл без зависимостей от React, чтобы его можно было запускать из скриптов проверки.

import { DIRECTION_IDS } from './types.ts';
import type { Answers, Direction, DirectionId, Option, Question, Quiz, Weights } from './types.ts';

/** Если даже лучшее направление набрало меньше этого процента, выраженной склонности нет. */
export const WEAK_PERCENT = 50;

/** Если второе место отстаёт меньше чем на столько процентных пунктов, оно почти равно первому. */
export const CLOSE_GAP = 10;

export function zeroWeights(): Weights {
  return Object.fromEntries(DIRECTION_IDS.map((id) => [id, 0])) as Weights;
}

export function allQuestions(quiz: Quiz): Question[] {
  return quiz.blocks.flatMap((block) => block.questions);
}

/**
 * Сколько вопрос максимально может дать направлению: в вопросе с одним ответом —
 * наибольший вес среди вариантов, с несколькими — сумма всех весов.
 */
export function questionMax(question: Question, direction: DirectionId): number {
  const weights = question.options.map((option) => option.weights[direction]);
  return question.type === 'single'
    ? Math.max(...weights)
    : weights.reduce((sum, weight) => sum + weight, 0);
}

/** M — максимальная сумма баллов по каждому направлению. */
export function maxScores(quiz: Quiz): Weights {
  const max = zeroWeights();
  for (const question of allQuestions(quiz)) {
    for (const id of DIRECTION_IDS) max[id] += questionMax(question, id);
  }
  return max;
}

export function selectedOptions(question: Question, answers: Answers): Option[] {
  const selected = answers[question.id] ?? [];
  return question.options.filter((option) => selected.includes(option.id));
}

export function isComplete(quiz: Quiz, answers: Answers): boolean {
  return allQuestions(quiz).every((question) => selectedOptions(question, answers).length > 0);
}

/** Сумма весов отмеченных вариантов по каждому направлению. */
export function scoreAnswers(quiz: Quiz, answers: Answers, blocks = quiz.blocks): Weights {
  const score = zeroWeights();
  for (const block of blocks) {
    for (const question of block.questions) {
      for (const option of selectedOptions(question, answers)) {
        for (const id of DIRECTION_IDS) score[id] += option.weights[id];
      }
    }
  }
  return score;
}

export interface DirectionScore {
  direction: Direction;
  points: number;
  max: number;
  /** Доля от максимума в процентах, без округления. */
  percent: number;
  /** Баллы из общего блока — решают при равенстве процентов. */
  generalPoints: number;
}

export interface Reason {
  questionId: string;
  points: number;
  text: string;
}

export interface Evaluation {
  /** Направления от самого подходящего к наименее подходящему. */
  ranking: DirectionScore[];
  winner: DirectionScore;
  runnerUp: DirectionScore;
  /** Второе место отстаёт меньше чем на CLOSE_GAP п. п. */
  isClose: boolean;
  /** Лучшее направление набрало меньше WEAK_PERCENT % максимума. */
  isWeak: boolean;
  /** Самые весомые ответы в пользу победившего направления. */
  reasons: Reason[];
}

export function evaluate(quiz: Quiz, answers: Answers): Evaluation {
  const points = scoreAnswers(quiz, answers);
  const max = maxScores(quiz);
  const general = scoreAnswers(quiz, answers, quiz.blocks.filter((block) => !block.direction));

  // Больший процент выигрывает; при равенстве — больше баллов в общем блоке (там человек
  // сам выбирает между направлениями); дальше — порядок направлений в контенте (сортировка стабильная).
  const ranking = quiz.directions
    .map((direction) => ({
      direction,
      points: points[direction.id],
      max: max[direction.id],
      percent: max[direction.id] > 0 ? (points[direction.id] / max[direction.id]) * 100 : 0,
      generalPoints: general[direction.id],
    }))
    .sort((a, b) => b.percent - a.percent || b.generalPoints - a.generalPoints);

  const [winner, runnerUp] = ranking;
  return {
    ranking,
    winner,
    runnerUp,
    isClose: winner.percent - runnerUp.percent < CLOSE_GAP,
    isWeak: winner.percent < WEAK_PERCENT,
    reasons: explain(quiz, answers, winner.direction.id),
  };
}

/** Какие ответы сильнее всего говорят в пользу направления — подсистема объяснений. */
export function explain(quiz: Quiz, answers: Answers, direction: DirectionId, limit = 5): Reason[] {
  const reasons: Reason[] = [];
  for (const question of allQuestions(quiz)) {
    const chosen = selectedOptions(question, answers).filter((option) => option.weights[direction] > 0);
    if (chosen.length === 0) continue;

    const template = question.reasonTemplate?.[direction];
    if (template) {
      reasons.push({
        questionId: question.id,
        points: chosen.reduce((sum, option) => sum + option.weights[direction], 0),
        text: template.replace('{options}', chosen.map((option) => option.short ?? option.text).join(', ')),
      });
      continue;
    }
    for (const option of chosen) {
      const text = option.reasons?.[direction];
      if (text) reasons.push({ questionId: question.id, points: option.weights[direction], text });
    }
  }
  // Сначала самые весомые ответы, при равных баллах — в порядке вопросов (сортировка стабильная).
  return reasons.sort((a, b) => b.points - a.points).slice(0, limit);
}
