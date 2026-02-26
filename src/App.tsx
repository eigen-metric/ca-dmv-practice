import { useEffect, useMemo, useState } from 'react';
import questionBank from './data/questions.generated.json';
import {
  buildTest,
  INSUFFICIENT_POOL_MESSAGE,
  missedQuestions,
  rankWeaknesses,
  scoreAttempt,
  weaknessBullets
} from './engine';
import type { AnswerRecord, Category, Mode, Question, SelectedDifficulty } from './types';

const ATTEMPT_KEY = 'ca-dmv-attempt-v1';

type Stage = 'start' | 'testing' | 'finished';

interface AttemptState {
  mode: Mode;
  confidenceMode: boolean;
  selectedDifficulty: SelectedDifficulty;
  questions: Question[];
  totalQuestions: number;
  categoryDrill?: Category;
}

interface PersistedState {
  stage: Stage;
  attempt: AttemptState | null;
  answers: AnswerRecord[];
  currentIndex: number;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function categoryLabel(category: Category): string {
  return category.replace(/([A-Z])/g, ' $1').trim();
}

function difficultyLabel(difficulty: SelectedDifficulty): string {
  if (difficulty === 'mix') return 'Mix';
  return difficulty[0].toUpperCase() + difficulty.slice(1);
}

function App() {
  const [stage, setStage] = useState<Stage>('start');
  const [mode, setMode] = useState<Mode>('practice');
  const [selectedDifficulty, setSelectedDifficulty] = useState<SelectedDifficulty>('mix');
  const [confidenceMode, setConfidenceMode] = useState(false);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReason, setShowReason] = useState(false);
  const [showExamReasonsAfterFinish, setShowExamReasonsAfterFinish] = useState(false);
  const [hasSavedAttempt, setHasSavedAttempt] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);

  const [isBreakOpen, setIsBreakOpen] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(30);

  const confidenceDisabled = selectedDifficulty !== 'mix';

  useEffect(() => {
    if (confidenceDisabled && confidenceMode) {
      setConfidenceMode(false);
    }
  }, [confidenceDisabled, confidenceMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ATTEMPT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.stage === 'testing' && parsed.attempt) {
        setHasSavedAttempt(true);
      }
    } catch {
      // ignore malformed saved state
    }
  }, []);

  useEffect(() => {
    if (stage !== 'testing' || !attempt) return;
    const payload: PersistedState = { stage, attempt, answers, currentIndex };
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(payload));
  }, [stage, attempt, answers, currentIndex]);

  useEffect(() => {
    if (stage === 'finished') {
      localStorage.removeItem(ATTEMPT_KEY);
      setHasSavedAttempt(false);
    }
  }, [stage]);

  useEffect(() => {
    if (!isBreakOpen) return;
    setBreakSecondsLeft(30);
    const timer = window.setInterval(() => {
      setBreakSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isBreakOpen]);

  const currentQuestion = attempt?.questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers.find((a) => a.questionId === currentQuestion.id)
    : undefined;

  const result = useMemo(() => {
    if (!attempt) return null;
    return scoreAttempt(attempt.questions, answers);
  }, [attempt, answers]);

  const weaknesses = useMemo(() => {
    if (!attempt) return [];
    return rankWeaknesses(attempt.questions, answers);
  }, [attempt, answers]);

  const missed = useMemo(() => {
    if (!attempt) return [];
    return missedQuestions(attempt.questions, answers);
  }, [attempt, answers]);

  const launchAttempt = (nextMode: Mode, category?: Category) => {
    const totalQuestions = category ? 10 : 40;
    const built = buildTest(
      questionBank as Question[],
      totalQuestions,
      confidenceMode,
      selectedDifficulty,
      category
    );

    if (!built.ok) {
      setAttemptError(built.error || INSUFFICIENT_POOL_MESSAGE);
      return;
    }

    const newAttempt: AttemptState = {
      mode: nextMode,
      confidenceMode: built.effectiveConfidenceMode,
      selectedDifficulty,
      questions: built.questions,
      totalQuestions,
      categoryDrill: category
    };

    setAttemptError(null);
    setMode(nextMode);
    setConfidenceMode(built.effectiveConfidenceMode);
    setAttempt(newAttempt);
    setAnswers([]);
    setCurrentIndex(0);
    setShowReason(false);
    setShowExamReasonsAfterFinish(false);
    setStage('testing');
  };

  const restoreAttempt = () => {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.stage === 'testing' && parsed.attempt) {
        const restoredDifficulty = parsed.attempt.selectedDifficulty ?? 'mix';
        const restoredConfidence =
          Boolean(parsed.attempt.confidenceMode) && restoredDifficulty === 'mix';
        const normalizedAttempt: AttemptState = {
          ...parsed.attempt,
          selectedDifficulty: restoredDifficulty,
          confidenceMode: restoredConfidence
        };

        setAttempt(normalizedAttempt);
        setMode(normalizedAttempt.mode);
        setSelectedDifficulty(restoredDifficulty);
        setConfidenceMode(restoredConfidence);
        setAnswers(parsed.answers);
        setCurrentIndex(parsed.currentIndex);
        setShowReason(false);
        setAttemptError(null);
        setStage('testing');
      }
    } catch {
      localStorage.removeItem(ATTEMPT_KEY);
      setHasSavedAttempt(false);
      setAttemptError('Saved attempt could not be restored. Start a new test.');
    }
  };

  const clearSavedAttempt = () => {
    localStorage.removeItem(ATTEMPT_KEY);
    setHasSavedAttempt(false);
  };

  const answerQuestion = (choiceIndex: number) => {
    if (!currentQuestion || currentAnswer) return;
    const correct = choiceIndex === currentQuestion.answerIndex;
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, selectedIndex: choiceIndex, correct }
    ]);
  };

  const goNext = () => {
    if (!attempt) return;
    const isLast = currentIndex >= attempt.questions.length - 1;
    if (isLast) {
      setStage('finished');
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setShowReason(false);
  };

  const breathingPhase = useMemo(() => {
    const elapsed = 30 - breakSecondsLeft;
    const cycle = elapsed % 14;
    if (cycle < 4) return 'Inhale';
    if (cycle < 8) return 'Hold';
    return 'Exhale';
  }, [breakSecondsLeft]);

  return (
    <main className="app-shell">
      <section className="card">
        <h1>California DMV Class C Test Trainer</h1>
        <p className="subtle">
          Calm, realistic prep for out-of-state conversion. All tests run locally with no accounts.
        </p>

        {attemptError && <div className="error-box">{attemptError}</div>}

        {stage === 'start' && (
          <div className="stack">
            <div className="mode-picker">
              <button
                className={mode === 'practice' ? 'chip active' : 'chip'}
                onClick={() => setMode('practice')}
              >
                Practice Mode
              </button>
              <button
                className={mode === 'exam' ? 'chip active' : 'chip'}
                onClick={() => setMode('exam')}
              >
                Exam Mode
              </button>
            </div>

            <div className="stack-sm">
              <strong>Difficulty</strong>
              <div className="difficulty-picker">
                {(['easy', 'medium', 'hard', 'mix'] as const).map((option) => (
                  <button
                    key={option}
                    className={selectedDifficulty === option ? 'chip active' : 'chip'}
                    onClick={() => setSelectedDifficulty(option)}
                  >
                    {difficultyLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <label
              className={`toggle-row ${confidenceDisabled ? 'disabled-row' : ''}`}
              title={
                confidenceDisabled
                  ? 'Confidence Mode is available only when Difficulty is Mix.'
                  : 'Confidence Mode ramps easy, then medium, then hard.'
              }
            >
              <input
                type="checkbox"
                checked={confidenceMode}
                onChange={(e) => setConfidenceMode(e.target.checked)}
                disabled={confidenceDisabled}
              />
              Confidence Mode (easy → medium → hard)
            </label>
            {confidenceDisabled && (
              <p className="subtle">
                Confidence Mode is disabled while Difficulty is fixed to {difficultyLabel(selectedDifficulty)}.
              </p>
            )}

            <button className="primary" onClick={() => launchAttempt(mode)}>
              Start 40-question test
            </button>

            {hasSavedAttempt && (
              <div className="saved-box">
                <p>A previous attempt was found on this browser.</p>
                <div className="row-buttons">
                  <button className="secondary" onClick={restoreAttempt}>
                    Resume attempt
                  </button>
                  <button className="ghost" onClick={clearSavedAttempt}>
                    Discard saved attempt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {stage === 'testing' && attempt && currentQuestion && (
          <div className="stack">
            <div className="topbar">
              <span>
                {attempt.categoryDrill
                  ? `Category drill: ${categoryLabel(attempt.categoryDrill)}`
                  : `${attempt.mode === 'practice' ? 'Practice' : 'Exam'} mode`} • Difficulty: {difficultyLabel(attempt.selectedDifficulty)}
              </span>
              <button className="ghost" onClick={() => setIsBreakOpen(true)}>
                Take a 30s reset
              </button>
            </div>

            <div className="progress-wrap">
              <div className="progress-label">
                Question {currentIndex + 1}/{attempt.totalQuestions}
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentIndex + 1) / attempt.totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="question-text">{currentQuestion.question}</h2>

            <div className="choices">
              {currentQuestion.choices.map((choice, idx) => {
                const answered = Boolean(currentAnswer);
                const isSelected = currentAnswer?.selectedIndex === idx;
                const isCorrectChoice = currentQuestion.answerIndex === idx;
                const className = answered
                  ? isCorrectChoice
                    ? 'choice correct'
                    : isSelected
                    ? 'choice incorrect'
                    : 'choice'
                  : 'choice';

                return (
                  <button
                    key={`${currentQuestion.id}-${idx}`}
                    className={className}
                    onClick={() => answerQuestion(idx)}
                    disabled={answered}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {currentAnswer && (
              <div className={currentAnswer.correct ? 'feedback good' : 'feedback bad'}>
                {currentAnswer.correct ? 'Correct' : 'Incorrect'}
              </div>
            )}

            {attempt.mode === 'practice' && currentAnswer && (
              <div className="stack-sm">
                <button className="secondary" onClick={() => setShowReason((prev) => !prev)}>
                  {showReason ? 'Hide reason' : 'See reason'}
                </button>
                {showReason && (
                  <div className="reason-box">
                    <p>{currentQuestion.rationale}</p>
                    <p>
                      <strong>Study reference:</strong> {currentQuestion.handbookRef}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentAnswer && (
              <button className="primary" onClick={goNext}>
                {currentIndex === attempt.totalQuestions - 1 ? 'Finish test' : 'Next'}
              </button>
            )}
          </div>
        )}

        {stage === 'finished' && attempt && result && (
          <div className="stack">
            <h2>
              {result.passed ? 'Pass' : 'Fail'} - {result.correct}/{result.total}
            </h2>
            <p className="subtle">
              Score: {result.percentage.toFixed(1)}% | Passing target: 90% ({result.passingCorrect}/{result.total})
            </p>

            <div>
              <h3>Weakness ranking by category</h3>
              <div className="stack-sm">
                {weaknesses.map((w) => (
                  <div key={w.category} className="weak-item">
                    <div>
                      <strong>{categoryLabel(w.category)}</strong> - {w.missed}/{w.total} missed ({formatPercent(w.missRate)})
                    </div>
                    <ul>
                      {weaknessBullets(w.category).map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                    <button className="secondary" onClick={() => launchAttempt('practice', w.category)}>
                      Practice 10 questions in this category
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="row-buttons">
              <button className="primary" onClick={() => launchAttempt('exam')}>
                Retake exam
              </button>
              <button className="secondary" onClick={() => launchAttempt('practice')}>
                New practice test
              </button>
              <button
                className="ghost"
                onClick={() => {
                  const weakest = weaknesses.find((w) => w.missed > 0) ?? weaknesses[0];
                  if (weakest) launchAttempt('practice', weakest.category);
                }}
              >
                Practice weak areas
              </button>
            </div>

            <div>
              <h3>Review missed questions</h3>
              {attempt.mode === 'exam' && (
                <button
                  className="secondary"
                  onClick={() => setShowExamReasonsAfterFinish((prev) => !prev)}
                >
                  {showExamReasonsAfterFinish ? 'Hide reasons' : 'Review reasons'}
                </button>
              )}
              {missed.length === 0 ? (
                <p className="subtle">No missed questions in this attempt.</p>
              ) : (
                <div className="stack-sm">
                  {missed.map((q) => (
                    <div key={q.id} className="missed-item">
                      <p>
                        <strong>{q.question}</strong>
                      </p>
                      <p>Correct answer: {q.choices[q.answerIndex]}</p>
                      {(attempt.mode === 'practice' || showExamReasonsAfterFinish) && (
                        <p className="subtle">
                          {q.rationale} ({q.handbookRef})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {isBreakOpen && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="breath-card">
            <h2>30-second reset</h2>
            <div className={`breath-orb phase-${breathingPhase.toLowerCase()}`}>{breathingPhase}</div>
            <p>{breakSecondsLeft}s remaining</p>
            <p className="subtle">Inhale 4s • Hold 4s • Exhale 6s</p>
            <button className="primary" onClick={() => setIsBreakOpen(false)}>
              Resume test
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
