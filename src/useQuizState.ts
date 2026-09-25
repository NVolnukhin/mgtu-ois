// Состояние приложения: какой экран открыт, на каком вопросе пользователь и что он ответил.
// Прогресс сохраняется в localStorage, чтобы после перезагрузки можно было продолжить.

import { useEffect, useReducer } from 'react';
import { isComplete, toggleOption } from './engine/scoring.ts';
import type { Answers } from './engine/types.ts';
import { quiz, steps } from './data.ts';

export type Screen = 'start' | 'quiz' | 'result' | 'credits';

export interface QuizState {
  screen: Screen;
  /** Куда вернуться со страницы с авторами фото. */
  returnTo: Exclude<Screen, 'credits'>;
  step: number;
  answers: Answers;
}

export type QuizAction =
  | { type: 'start' }
  | { type: 'resume' }
  | { type: 'home' }
  | { type: 'toggle'; optionId: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'openCredits' }
  | { type: 'closeCredits' };

const STORAGE_KEY = 'volunteer-compass/v1';
const INITIAL: QuizState = { screen: 'start', returnTo: 'start', step: 0, answers: {} };

function reducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'start':
      return { ...INITIAL, screen: 'quiz' };
    case 'resume':
      return { ...state, screen: 'quiz' };
    case 'home':
      return { ...state, screen: 'start' };
    case 'toggle': {
      const { question } = steps[state.step];
      const selected = toggleOption(question, state.answers[question.id] ?? [], action.optionId);
      return { ...state, answers: { ...state.answers, [question.id]: selected } };
    }
    case 'next':
      return state.step < steps.length - 1 ? { ...state, step: state.step + 1 } : { ...state, screen: 'result' };
    case 'back':
      return state.step > 0 ? { ...state, step: state.step - 1 } : { ...state, screen: 'start' };
    case 'openCredits':
      return state.screen === 'credits' ? state : { ...state, screen: 'credits', returnTo: state.screen };
    case 'closeCredits':
      return { ...state, screen: state.returnTo };
  }
}

function load(): QuizState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved.step === 'number' && saved.answers && typeof saved.answers === 'object') {
      const answers: Answers = saved.answers;
      const step = Math.min(Math.max(0, saved.step), steps.length - 1);
      // Если после обновления контента старые ответы неполные, показывать результат по ним нельзя.
      const screen = saved.screen === 'quiz' || (saved.screen === 'result' && isComplete(quiz, answers)) ? saved.screen : 'start';
      return { ...INITIAL, screen, step, answers };
    }
  } catch {
    // Повреждённые данные или недоступное хранилище — просто начинаем сначала.
  }
  return INITIAL;
}

export function useQuizState() {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    const { step, answers } = state;
    const screen = state.screen === 'credits' ? state.returnTo : state.screen;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, step, answers }));
    } catch {
      // В приватном режиме хранилище бывает недоступно — тест работает и без сохранения.
    }
  }, [state]);

  return [state, dispatch] as const;
}
