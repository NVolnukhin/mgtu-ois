// Модель данных квиза. Контент лежит в content/quiz.json и описан этими типами.

export const DIRECTION_IDS = ['children', 'inclusion', 'seniors', 'ecology'] as const;

export type DirectionId = (typeof DIRECTION_IDS)[number];

/** Вес варианта ответа по каждому направлению, целое число от 0 до 3. */
export type Weights = Record<DirectionId, number>;

/** single — один ответ, multiple — несколько ответов. */
export type QuestionType = 'single' | 'multiple';

export interface Direction {
  id: DirectionId;
  title: string;
  /** Короткое название для таблиц и графиков. */
  short: string;
  tagline: string;
  /** Ключ картинки в content/images.json. */
  image: string;
  description: string;
  activities: string[];
  qualities: string[];
  firstSteps: string[];
}

export interface Option {
  /** Буква варианта: a, b, c… */
  id: string;
  text: string;
  /** Короткая формулировка для объяснения в вопросах с несколькими ответами. */
  short?: string;
  weights: Weights;
  /** Почему этот ответ говорит в пользу направления. Показывается на экране результата. */
  reasons?: Partial<Record<DirectionId, string>>;
  /** «Ничего из этого»: снимает остальные отметки и сам снимается при выборе другого варианта. */
  exclusive?: boolean;
  /** Ключ картинки-превью в content/images.json. */
  image?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  /** Ситуационная задача: проверяет, как человек поступит в типичной ситуации направления. */
  situational?: boolean;
  text: string;
  /** Ключ картинки в content/images.json. */
  image: string;
  /** Обоснование весов — для документации. */
  note: string;
  /**
   * Общее объяснение для вопроса с несколькими ответами: {options} заменяется
   * списком коротких формулировок выбранных вариантов.
   */
  reasonTemplate?: Partial<Record<DirectionId, string>>;
  options: Option[];
}

export interface Block {
  id: string;
  /** Направление блока. У общего блока его нет. */
  direction?: DirectionId;
  title: string;
  description: string;
  questions: Question[];
}

export interface Quiz {
  version: number;
  title: string;
  subtitle: string;
  description: string;
  estimatedMinutes: number;
  /** Ключ картинки для стартового экрана. */
  image: string;
  directions: Direction[];
  blocks: Block[];
}

/** Ответы пользователя: id вопроса → id выбранных вариантов. */
export type Answers = Record<string, string[]>;

export interface ImageCredit {
  author: string;
  title: string;
  /** Сайт, откуда взято фото. */
  source: string;
  /** Страница фото на этом сайте. */
  url: string;
  license: string;
  licenseUrl?: string;
}

/** Фото из content/images.json. */
export interface ImageInfo {
  /** Путь относительно папки public. */
  file: string;
  alt: string;
  /** CSS object-position: какую часть кадра сохранить при обрезке. */
  position: string;
  credit: ImageCredit;
}

export type Images = Record<string, ImageInfo>;
