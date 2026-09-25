import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { image, quiz, steps } from '../data.ts';
import type { Step } from '../data.ts';
import { Photo } from './Photo.tsx';

interface QuestionScreenProps {
  step: Step;
  selected: string[];
  onToggle: (optionId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuestionScreen({ step, selected, onToggle, onNext, onBack }: QuestionScreenProps) {
  const { question, block, blockIndex, index } = step;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isLast = index === steps.length - 1;
  const inputType = question.type === 'single' ? 'radio' : 'checkbox';

  // Новый вопрос: фокус на его текст, чтобы экранный диктор сразу его прочитал,
  // и заранее грузим картинку следующего вопроса.
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    const next = steps[index + 1];
    if (next) new Image().src = image(next.question.image).src;
  }, [index]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (selected.length > 0) onNext();
  }

  return (
    <form className="question" onSubmit={submit}>
      <Photo name={question.image} className="question__photo" eager />

      <div className="question__content">
        <div className="progress">
          <div className="progress__meta">
            <span>
              Блок {blockIndex + 1} из {quiz.blocks.length} · {block.title}
            </span>
            <span>
              {index + 1} / {steps.length}
            </span>
          </div>
          <div
            className="progress__blocks"
            role="progressbar"
            aria-label="Пройдено вопросов"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
          >
            {quiz.blocks.map((item, i) => {
              const done = i < blockIndex ? 1 : i > blockIndex ? 0 : (index - firstStepOf(i) + 1) / item.questions.length;
              return (
                <span key={item.id} className="progress__track">
                  <span className="progress__fill" style={{ width: `${done * 100}%` }} />
                </span>
              );
            })}
          </div>
        </div>

        <div className="badges">
          <span className="badge">{question.type === 'single' ? 'Один ответ' : 'Несколько ответов'}</span>
          {question.situational && <span className="badge badge--outline">Ситуационная задача</span>}
        </div>

        <fieldset className="question__fieldset">
          <legend className="question__legend">
            <h1 ref={titleRef} tabIndex={-1} className="question__title">
              {question.text}
            </h1>
          </legend>
          {question.type === 'multiple' && <p className="question__hint">Отметь все подходящие варианты</p>}

          <div className="options">
            {question.options.map((option) => {
              const checked = selected.includes(option.id);
              return (
                <label key={option.id} className={checked ? 'option option--checked' : 'option'}>
                  <input
                    className="option__input"
                    type={inputType}
                    name={question.id}
                    value={option.id}
                    checked={checked}
                    onChange={() => onToggle(option.id)}
                  />
                  <span className={`option__mark option__mark--${inputType}`} aria-hidden="true" />
                  {option.image && <Photo name={option.image} className="option__thumb" eager decorative />}
                  <span className="option__text">{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="navbar">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Назад
          </button>
          <button type="submit" className="btn btn--primary navbar__next" disabled={selected.length === 0}>
            {isLast ? 'Узнать результат' : 'Далее'}
          </button>
        </div>
      </div>
    </form>
  );
}

function firstStepOf(blockIndex: number): number {
  return steps.findIndex((step) => step.blockIndex === blockIndex);
}
