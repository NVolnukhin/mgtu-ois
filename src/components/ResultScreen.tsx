import { useEffect, useRef } from 'react';
import type { Evaluation } from '../engine/scoring.ts';
import { Photo } from './Photo.tsx';

interface ResultScreenProps {
  evaluation: Evaluation;
  onRestart: () => void;
}

export function ResultScreen({ evaluation, onRestart }: ResultScreenProps) {
  const { winner, runnerUp, ranking, isClose, isWeak, reasons } = evaluation;
  const { direction } = winner;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <article className="result">
      <header className="result__header">
        <p className="eyebrow">Твоё направление</p>
        <h1 ref={titleRef} tabIndex={-1} className="result__title">
          {direction.title}
        </h1>
        <p className="result__tagline">{direction.tagline}</p>
      </header>

      <Photo name={direction.image} className="result__photo" eager />

      <div className="score">
        <p className="score__value">
          {Math.round(winner.percent)}
          <span className="score__unit">%</span>
        </p>
        <p className="score__caption">
          совпадение с направлением — {winner.points} из {winner.max} возможных баллов
        </p>
      </div>

      {isWeak && (
        <p className="callout">
          Склонность пока выражена слабо: даже самое подходящее направление набрало меньше половины баллов. Попробуй
          разные направления на разовых акциях — так станет понятнее, что откликается именно тебе.
        </p>
      )}
      {isClose && (
        <p className="callout">
          Почти так же тебе подходит направление «{runnerUp.direction.title}» — {Math.round(runnerUp.percent)} %. Можно
          попробовать оба и выбрать по ощущениям.
        </p>
      )}

      {reasons.length > 0 && (
        <section className="section">
          <h2 className="section__title">Почему оно тебе подходит</h2>
          <ul className="reasons">
            {reasons.map((reason) => (
              <li key={`${reason.questionId}:${reason.text}`}>{reason.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2 className="section__title">О направлении</h2>
        <p className="result__text">{direction.description}</p>
        <h3 className="result__subtitle">Чем занимаются волонтёры</h3>
        <ul className="list">
          {direction.activities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
        <h3 className="result__subtitle">Что пригодится</h3>
        <ul className="chips">
          {direction.qualities.map((quality) => (
            <li key={quality}>{quality}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section__title">С чего начать</h2>
        <ol className="steps">
          {direction.firstSteps.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2 className="section__title">Все направления</h2>
        <ul className="bars">
          {ranking.map((score) => (
            <li key={score.direction.id} className={score === winner ? 'bar bar--winner' : 'bar'}>
              <span className="bar__label">{score.direction.title}</span>
              <span className="bar__track" aria-hidden="true">
                <span className="bar__fill" style={{ width: `${score.percent}%` }} />
              </span>
              <span className="bar__value">{Math.round(score.percent)} %</span>
            </li>
          ))}
        </ul>
        <p className="note">
          Процент — это доля от максимума: у каждого направления он одинаковый, {winner.max} баллов. Как считаются баллы,
          описано в методике проекта.
        </p>
      </section>

      <div className="actions actions--center">
        <button type="button" className="btn btn--secondary" onClick={onRestart}>
          Пройти заново
        </button>
      </div>
    </article>
  );
}
