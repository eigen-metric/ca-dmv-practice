export const CATEGORIES = [
  'RightOfWay',
  'SignsSignalsMarkings',
  'SpeedAndFollowingDistance',
  'LaneUseAndTurns',
  'Parking',
  'FreewayDriving',
  'SharingTheRoad',
  'DistractedImpairedDriving',
  'HazardsAndDefensiveDriving',
  'LicensingRulesAndSafety'
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SelectedDifficulty = Difficulty | 'mix';
export type Mode = 'practice' | 'exam';

export interface Question {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  category: Category;
  difficulty: Difficulty;
  rationale: string;
  handbookRef: string;
}

export interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
}

export interface WeaknessResult {
  category: Category;
  missed: number;
  total: number;
  missRate: number;
}
