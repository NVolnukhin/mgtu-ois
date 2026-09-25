// Контент квиза для приложения. Структуру JSON проверяет npm run check, поэтому здесь только приведение типов.

import quizJson from '../content/quiz.json';
import imagesJson from '../content/images.json';
import type { Block, ImageInfo, Images, Question, Quiz } from './engine/types.ts';

export const quiz = quizJson as unknown as Quiz;
export const images = imagesJson as Images;

/** Вопрос вместе с блоком — в том порядке, в каком их проходит пользователь. */
export interface Step {
  index: number;
  question: Question;
  block: Block;
  blockIndex: number;
}

export const steps: Step[] = quiz.blocks
  .flatMap((block, blockIndex) => block.questions.map((question) => ({ question, block, blockIndex })))
  .map((step, index) => ({ ...step, index }));

export function image(key: string): ImageInfo & { src: string } {
  const info = images[key];
  return { ...info, src: `${import.meta.env.BASE_URL}${info.file}` };
}
