import type {
  AnswerRecord,
  Category,
  Difficulty,
  Question,
  SelectedDifficulty,
  WeaknessResult
} from './types';

export const INSUFFICIENT_POOL_MESSAGE =
  'Not enough questions in this difficulty. Please choose Mix or regenerate the bank.';

function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleOrNull<T>(items: T[], count: number, rng: () => number = Math.random): T[] | null {
  if (count > items.length) return null;
  return shuffle(items, rng).slice(0, count);
}

const RAMP_40: Record<Difficulty, number> = { easy: 12, medium: 16, hard: 12 };
const RAMP_10: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 3 };

interface BuildTestSuccess {
  ok: true;
  questions: Question[];
  effectiveConfidenceMode: boolean;
}

interface BuildTestFailure {
  ok: false;
  error: string;
}

export type BuildTestResult = BuildTestSuccess | BuildTestFailure;

export function buildTest(
  allQuestions: Question[],
  total: number,
  confidenceMode: boolean,
  selectedDifficulty: SelectedDifficulty,
  categoryFilter?: Category,
  rng: () => number = Math.random
): BuildTestResult {
  const categoryFiltered = categoryFilter
    ? allQuestions.filter((q) => q.category === categoryFilter)
    : allQuestions;

  const difficultyFiltered =
    selectedDifficulty === 'mix'
      ? categoryFiltered
      : categoryFiltered.filter((q) => q.difficulty === selectedDifficulty);

  const effectiveConfidenceMode = confidenceMode && selectedDifficulty === 'mix';

  if (effectiveConfidenceMode) {
    const ramp = total === 40 ? RAMP_40 : total === 10 ? RAMP_10 : buildRamp(total);
    const byDifficulty: Record<Difficulty, Question[]> = {
      easy: difficultyFiltered.filter((q) => q.difficulty === 'easy'),
      medium: difficultyFiltered.filter((q) => q.difficulty === 'medium'),
      hard: difficultyFiltered.filter((q) => q.difficulty === 'hard')
    };

    const selected: Question[] = [];
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const picked = sampleOrNull(byDifficulty[difficulty], ramp[difficulty], rng);
      if (!picked) {
        return { ok: false, error: INSUFFICIENT_POOL_MESSAGE };
      }
      selected.push(...picked);
    }

    return { ok: true, questions: selected, effectiveConfidenceMode: true };
  }

  const picked = sampleOrNull(difficultyFiltered, total, rng);
  if (!picked) {
    return { ok: false, error: INSUFFICIENT_POOL_MESSAGE };
  }

  return { ok: true, questions: picked, effectiveConfidenceMode: false };
}

function buildRamp(total: number): Record<Difficulty, number> {
  const easy = Math.floor(total * 0.3);
  const hard = Math.floor(total * 0.3);
  const medium = total - easy - hard;
  return { easy, medium, hard };
}

export function scoreAttempt(questions: Question[], answers: AnswerRecord[]) {
  const total = questions.length;
  const correct = answers.filter((a) => a.correct).length;
  const wrong = total - correct;
  const percentage = (correct / total) * 100;
  const passingCorrect = Math.ceil(total * 0.9);
  const passed = correct >= passingCorrect;
  return { total, correct, wrong, percentage, passed, passingCorrect };
}

export function rankWeaknesses(questions: Question[], answers: AnswerRecord[]): WeaknessResult[] {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const stats = new Map<Category, { total: number; missed: number }>();

  for (const q of questions) {
    const current = stats.get(q.category) ?? { total: 0, missed: 0 };
    current.total += 1;
    const answer = answerMap.get(q.id);
    if (answer && !answer.correct) current.missed += 1;
    stats.set(q.category, current);
  }

  return Array.from(stats.entries())
    .map(([category, value]) => ({
      category,
      missed: value.missed,
      total: value.total,
      missRate: value.total === 0 ? 0 : value.missed / value.total
    }))
    .sort((a, b) => {
      if (b.missRate !== a.missRate) return b.missRate - a.missRate;
      return b.missed - a.missed;
    });
}

export function missedQuestions(questions: Question[], answers: AnswerRecord[]): Question[] {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  return questions.filter((q) => {
    const answer = answerMap.get(q.id);
    return answer && !answer.correct;
  });
}

export function weaknessBullets(category: Category): string[] {
  const map: Record<Category, string[]> = {
    RightOfWay: ['Review yielding order at stops and uncontrolled intersections.', 'Practice who must wait during left turns and crosswalk conflicts.'],
    SignsSignalsMarkings: ['Revisit sign colors and signal meanings.', 'Practice lane markings and turn-arrow lane rules.'],
    SpeedAndFollowingDistance: ['Review safe speed choices for weather and visibility.', 'Use 3-second gap basics and increase space in riskier conditions.'],
    LaneUseAndTurns: ['Reinforce lane position before and after turns.', 'Practice mirror-signal-head-check sequence before lane changes.'],
    Parking: ['Study curb color restrictions and prohibited parking distances.', 'Practice uphill/downhill wheel direction rules.'],
    FreewayDriving: ['Review merge strategy using acceleration lanes and gap selection.', 'Reinforce missed-exit and shoulder-use rules.'],
    SharingTheRoad: ['Review how to pass bikes and interact with motorcycles safely.', 'Study truck blind spots and pedestrian right-of-way priority.'],
    DistractedImpairedDriving: ['Reinforce no-distraction habits before and during trips.', 'Review impairment risks from alcohol, drugs, and fatigue.'],
    HazardsAndDefensiveDriving: ['Practice hazard scanning and early speed adjustment.', 'Review skid, glare, and work-zone response basics.'],
    LicensingRulesAndSafety: ['Review restraint, lighting, and carry-document requirements.', 'Practice legal expectations during traffic stops.']
  };
  return map[category];
}
