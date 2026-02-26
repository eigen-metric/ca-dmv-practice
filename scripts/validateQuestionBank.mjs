import fs from 'node:fs';
import path from 'node:path';

const allowedCategories = new Set([
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
]);

const allowedDifficulty = new Set(['easy', 'medium', 'hard']);
const filePath = path.join(process.cwd(), 'src/data/questions.generated.json');
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

const errors = [];

if (!Array.isArray(data)) {
  errors.push('Question bank is not an array.');
}

if (data.length < 400 || data.length > 700) {
  errors.push(`Question bank size must be 400-700, found ${data.length}.`);
}

const seenIds = new Set();

for (const [index, q] of data.entries()) {
  const label = `Item ${index + 1}`;
  if (typeof q.id !== 'string' || !q.id) errors.push(`${label}: missing id`);
  if (seenIds.has(q.id)) errors.push(`${label}: duplicate id ${q.id}`);
  seenIds.add(q.id);

  if (typeof q.question !== 'string' || q.question.trim().length < 15) errors.push(`${label}: question too short`);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${label}: choices must be exactly 4 strings`);
  if (!q.choices.every((c) => typeof c === 'string' && c.trim().length > 0)) errors.push(`${label}: invalid choice text`);
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= q.choices.length) errors.push(`${label}: invalid answerIndex`);
  if (!allowedCategories.has(q.category)) errors.push(`${label}: invalid category ${q.category}`);
  if (!allowedDifficulty.has(q.difficulty)) errors.push(`${label}: invalid difficulty ${q.difficulty}`);
  if (typeof q.rationale !== 'string' || q.rationale.trim().length < 30) errors.push(`${label}: rationale too short`);
  if (typeof q.handbookRef !== 'string' || q.handbookRef.trim().length < 3) errors.push(`${label}: invalid handbookRef`);
}

if (errors.length) {
  console.error('Question bank validation failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

const byCategory = data.reduce((acc, q) => {
  acc[q.category] = (acc[q.category] || 0) + 1;
  return acc;
}, {});

const byDifficulty = data.reduce((acc, q) => {
  acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
  return acc;
}, {});

console.log(`Question bank valid. Total questions: ${data.length}`);
console.log('Category counts:', byCategory);
console.log('Difficulty counts:', byDifficulty);
