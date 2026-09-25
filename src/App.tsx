import { useEffect, useMemo } from 'react';
import { evaluate, selectedOptions } from './engine/scoring.ts';
import { quiz, steps } from './data.ts';
import { useQuizState } from './useQuizState.ts';
import { CreditsScreen } from './components/CreditsScreen.tsx';
import { QuestionScreen } from './components/QuestionScreen.tsx';
import { ResultScreen } from './components/ResultScreen.tsx';
import { StartScreen } from './components/StartScreen.tsx';

export function App() {
  const [state, dispatch] = useQuizState();
  const { screen, step, answers } = state;

  const evaluation = useMemo(() => (screen === 'result' ? evaluate(quiz, answers) : null), [screen, answers]);
  const answered = steps.filter(({ question }) => selectedOptions(question, answers).length > 0).length;

  // Сменился экран или вопрос — прокручиваем страницу наверх.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, step]);

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => dispatch({ type: 'home' })}>
          <img className="brand__icon" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span className="brand__name">{quiz.title}</span>
        </button>
      </header>

      {/* key: при смене экрана содержимое монтируется заново и плавно появляется */}
      <main key={screen} className={screen === 'credits' ? 'main' : 'main main--wide'}>
        {screen === 'start' && (
          <StartScreen
            answered={answered}
            onStart={() => dispatch({ type: 'start' })}
            onResume={() => dispatch({ type: 'resume' })}
          />
        )}
        {screen === 'quiz' && (
          <QuestionScreen
            step={steps[step]}
            selected={answers[steps[step].question.id] ?? []}
            onToggle={(optionId) => dispatch({ type: 'toggle', optionId })}
            onNext={() => dispatch({ type: 'next' })}
            onBack={() => dispatch({ type: 'back' })}
          />
        )}
        {screen === 'result' && evaluation && (
          <ResultScreen evaluation={evaluation} answers={answers} onRestart={() => dispatch({ type: 'start' })} />
        )}
        {screen === 'credits' && <CreditsScreen onClose={() => dispatch({ type: 'closeCredits' })} />}
      </main>

      <footer className="footer">
        <p>Домашнее задание по ОИС · МГТУ им. Н.Э. Баумана</p>
        <button type="button" className="footer__link" onClick={() => dispatch({ type: 'openCredits' })}>
          Фото: авторы и лицензии
        </button>
      </footer>
    </div>
  );
}
