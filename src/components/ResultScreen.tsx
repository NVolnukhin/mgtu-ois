import { useEffect, useMemo, useRef } from 'react';
import { breakdown } from '../engine/scoring.ts';
import type { Evaluation } from '../engine/scoring.ts';
import type { Answers } from '../engine/types.ts';
import { quiz } from '../data.ts';
import { Photo } from './Photo.tsx';

interface ResultScreenProps {
  evaluation: Evaluation;
  answers: Answers;
  onRestart: () => void;
}

export function ResultScreen({ evaluation, answers, onRestart }: ResultScreenProps) {
  const { winner, runnerUp, ranking, isClose, isWeak, reasons } = evaluation;
  const { direction } = winner;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rows = useMemo(() => breakdown(quiz, answers), [answers]);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <article className="result">
      <header className="result__hero">
        <div className="result__intro">
          <p className="eyebrow">Твоё направление</p>
          <h1 ref={titleRef} tabIndex={-1} className="result__title">
            {direction.title}
          </h1>
          <p className="result__tagline">{direction.tagline}</p>

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
              Склонность пока выражена слабо: даже самое подходящее направление набрало меньше половины баллов.
              Попробуй разные направления на разовых акциях — так станет понятнее, что откликается именно тебе.
            </p>
          )}
          {isClose && (
            <p className="callout">
              Почти так же тебе подходит направление «{runnerUp.direction.title}» — {Math.round(runnerUp.percent)} %.
              Можно попробовать оба и выбрать по ощущениям.
            </p>
          )}
        </div>
        <Photo name={direction.image} className="result__photo" eager />
      </header>

      <div className="result__body">
        <div className="result__main">
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
        </div>

        <aside className="result__aside">
          <section className="section panel">
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

            <details className="details">
              <summary className="details__summary">Как считается результат</summary>
              <p className="details__text">
                Каждый вариант ответа даёт каждому направлению от 0 до 3 баллов: 3 — сильный признак, 0 — связи нет.
                Баллы выбранных вариантов складываются, сумма делится на максимум — у всех направлений он одинаковый,{' '}
                {winner.max} баллов. Побеждает направление с наибольшим процентом.
              </p>
              <ol className="breakdown">
                {rows.map(({ question, selected, points }, i) => {
                  const gained = quiz.directions.filter((d) => points[d.id] > 0);
                  return (
                    <li key={question.id} className="breakdown__item">
                      <p className="breakdown__question">
                        {i + 1}. {question.text}
                      </p>
                      <p className="breakdown__answer">{selected.map((option) => option.text).join('; ')}</p>
                      <p className="breakdown__points">
                        {gained.length > 0
                          ? gained.map((d) => (
                              <span key={d.id} className={d.id === direction.id ? 'point point--winner' : 'point'}>
                                {d.short} +{points[d.id]}
                              </span>
                            ))
                          : 'Баллов не даёт'}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </details>
          </section>
        </aside>
      </div>

      <div className="actions actions--center">
        <button type="button" className="btn btn--secondary" onClick={onRestart}>
          Пройти заново
        </button>
      </div>
    </article>
  );
}
