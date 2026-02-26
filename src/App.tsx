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

interface SavedAttemptSummary {
  mode: Mode;
  selectedDifficulty: SelectedDifficulty;
  questionNumber: number;
  totalQuestions: number;
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
  const [savedAttemptSummary, setSavedAttemptSummary] = useState<SavedAttemptSummary | null>(null);
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
        const restoredDifficulty = parsed.attempt.selectedDifficulty ?? 'mix';
        setHasSavedAttempt(true);
        setSavedAttemptSummary({
          mode: parsed.attempt.mode,
          selectedDifficulty: restoredDifficulty,
          questionNumber: Math.min(parsed.currentIndex + 1, parsed.attempt.totalQuestions),
          totalQuestions: parsed.attempt.totalQuestions
        });
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
      setSavedAttemptSummary(null);
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
  const answered = Boolean(currentAnswer);

  const result = useMemo(() => {
    if (!attempt) return null;
    return scoreAttempt(attempt.questions, answers);
  }, [attempt, answers]);

  const weaknesses = useMemo(() => {
    if (!attempt) return [];
    return rankWeaknesses(attempt.questions, answers);
  }, [attempt, answers]);

  const topWeaknesses = useMemo(
    () => weaknesses.filter((w) => w.missed > 0).slice(0, 3),
    [weaknesses]
  );

  const weakestCategory = useMemo(
    () => topWeaknesses[0]?.category ?? weaknesses[0]?.category,
    [topWeaknesses, weaknesses]
  );

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
      setSavedAttemptSummary(null);
      setAttemptError('Saved attempt could not be restored. Start a new test.');
    }
  };

  const clearSavedAttempt = () => {
    localStorage.removeItem(ATTEMPT_KEY);
    setHasSavedAttempt(false);
    setSavedAttemptSummary(null);
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
    if (!attempt || !answered) return;
    const isLast = currentIndex >= attempt.questions.length - 1;
    if (isLast) {
      setStage('finished');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setShowReason(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <header className="screen-header">
          <h1>California DMV Class C Test Trainer</h1>
          <p className="subtle">
            Calm, realistic prep for out-of-state conversion. Everything stays local on your
            device.
          </p>
        </header>

        {attemptError && <div className="error-box">{attemptError}</div>}

        {stage === 'start' && (
          <div className="stack">
            <div className="setup-group stack-sm">
              <strong>Mode</strong>
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
            </div>

            <div className="setup-group stack-sm">
              <strong>Difficulty (choose one)</strong>
              <div className="difficulty-picker" role="group" aria-label="Difficulty options">
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

            <div className="setup-group stack-sm">
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
                  Confidence Mode is disabled while Difficulty is fixed to{' '}
                  {difficultyLabel(selectedDifficulty)}.
                </p>
              )}
            </div>

            <button className="primary" onClick={() => launchAttempt(mode)}>
              Start {mode === 'exam' ? 'exam' : 'practice'} test (40 questions)
            </button>

            {hasSavedAttempt && (
              <div className="saved-box stack-sm">
                <p>A previous attempt was found on this browser.</p>
                {savedAttemptSummary && (
                  <p className="saved-meta subtle">
                    {savedAttemptSummary.mode === 'practice' ? 'Practice' : 'Exam'} ·{' '}
                    {difficultyLabel(savedAttemptSummary.selectedDifficulty)} · Question{' '}
                    {savedAttemptSummary.questionNumber}/{savedAttemptSummary.totalQuestions}
                  </p>
                )}
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
          <div className="test-layout">
            <div className="test-sticky-header">
              <div className="topbar">
                <span className="test-meta">
                  {attempt.categoryDrill
                    ? `Category drill: ${categoryLabel(attempt.categoryDrill)}`
                    : `${attempt.mode === 'practice' ? 'Practice' : 'Exam'} mode`} ·{' '}
                  {difficultyLabel(attempt.selectedDifficulty)}
                </span>
                <button className="ghost" onClick={() => setIsBreakOpen(true)}>
                  Reset 30s
                </button>
              </div>

              <div className="progress-wrap">
                <div className="progress-label">
                  Question {currentIndex + 1}/{attempt.totalQuestions}
                </div>
                <div className="progress-track" aria-hidden="true">
                  <div
                    className="progress-fill"
                    style={{ width: `${((currentIndex + 1) / attempt.totalQuestions) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="test-scroll-body">
              <article key={currentQuestion.id} className="question-shell">
                <h2 className="question-text">{currentQuestion.question}</h2>

                <div className="choices">
                  {currentQuestion.choices.map((choice, idx) => {
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
              </article>

              <div className="feedback-slot" aria-live="polite" role="status">
                {currentAnswer ? (
                  <span className={currentAnswer.correct ? 'status-chip good' : 'status-chip bad'}>
                    {currentAnswer.correct ? 'Correct' : 'Incorrect'}
                  </span>
                ) : (
                  <span className="subtle">Select your best answer. You can take a reset at any time.</span>
                )}
              </div>

              {attempt.mode === 'practice' && currentAnswer && showReason && (
                <div className="reason-box stack-sm">
                  <p>{currentQuestion.rationale}</p>
                  <p>
                    <strong>Study reference:</strong> {currentQuestion.handbookRef}
                  </p>
                </div>
              )}
            </div>

            <div className="test-action-bar">
              {attempt.mode === 'practice' && (
                <button
                  className="secondary"
                  onClick={() => setShowReason((prev) => !prev)}
                  disabled={!currentAnswer}
                >
                  {showReason ? 'Hide reason' : 'See reason'}
                </button>
              )}
              <button className="primary action-next" onClick={goNext} disabled={!currentAnswer}>
                {currentIndex === attempt.totalQuestions - 1 ? 'Finish test' : 'Next question'}
              </button>
            </div>
          </div>
        )}

        {stage === 'finished' && attempt && result && (
          <div className="stack results-layout">
            <section className={`summary-panel ${result.passed ? 'pass' : 'fail'}`}>
              <p className="result-tag">{result.passed ? 'Passed' : 'Needs more review'}</p>
              <h2 className="summary-score">
                {result.correct}/{result.total}
              </h2>
              <p className="subtle">
                Score: {result.percentage.toFixed(1)}% · Passing target: 90% ({result.passingCorrect}/
                {result.total})
              </p>
              <div className="row-buttons">
                {weakestCategory && (
                  <button className="primary" onClick={() => launchAttempt('practice', weakestCategory)}>
                    Practice weakest now
                  </button>
                )}
                <button className="secondary" onClick={() => launchAttempt('practice')}>
                  New practice test
                </button>
                <button className="ghost" onClick={() => launchAttempt('exam')}>
                  Retake exam
                </button>
              </div>
            </section>

            <section className="stack-sm">
              <h3>Top focus areas</h3>
              {topWeaknesses.length === 0 ? (
                <div className="saved-box">
                  <p>Strong run. No weak categories in this attempt.</p>
                </div>
              ) : (
                topWeaknesses.map((w) => (
                  <div key={w.category} className="weak-item stack-sm">
                    <div>
                      <strong>{categoryLabel(w.category)}</strong> · {w.missed}/{w.total} missed ({formatPercent(w.missRate)})
                    </div>
                    <ul>
                      {weaknessBullets(w.category).map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                    <button className="secondary" onClick={() => launchAttempt('practice', w.category)}>
                      Practice 10 in this category
                    </button>
                  </div>
                ))
              )}
            </section>

            <details className="accordion">
              <summary>All category performance</summary>
              <div className="stack-sm accordion-content">
                {weaknesses.map((w) => (
                  <div key={w.category} className="weak-item stack-sm">
                    <div>
                      <strong>{categoryLabel(w.category)}</strong> · {w.missed}/{w.total} missed ({formatPercent(w.missRate)})
                    </div>
                    <button className="secondary" onClick={() => launchAttempt('practice', w.category)}>
                      Practice 10 in this category
                    </button>
                  </div>
                ))}
              </div>
            </details>

            <section className="stack-sm">
              <div className="topbar">
                <h3>Review missed questions</h3>
                {attempt.mode === 'exam' && (
                  <button
                    className="secondary"
                    onClick={() => setShowExamReasonsAfterFinish((prev) => !prev)}
                  >
                    {showExamReasonsAfterFinish ? 'Hide reasons' : 'Review reasons'}
                  </button>
                )}
              </div>

              {missed.length === 0 ? (
                <p className="subtle">No missed questions in this attempt.</p>
              ) : (
                <details className="accordion" open={missed.length <= 3}>
                  <summary>Show missed questions ({missed.length})</summary>
                  <div className="stack-sm accordion-content">
                    {missed.map((q) => (
                      <div key={q.id} className="missed-item stack-sm">
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
                </details>
              )}
            </section>
          </div>
        )}
      </section>

      {isBreakOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="break-title">
          <div className="breath-card">
            <h2 id="break-title">30-second reset</h2>
            <p className="subtle pause-text">Test paused. Breathe slowly, then resume when ready.</p>
            <div className={`breath-orb phase-${breathingPhase.toLowerCase()}`}>{breathingPhase}</div>
            <p>{breakSecondsLeft}s remaining</p>
            <p className="subtle">Inhale 4s • Hold 4s • Exhale 6s</p>
            <button className="primary full-width" onClick={() => setIsBreakOpen(false)}>
              Resume test
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
