# CA DMV Class C Knowledge Test Trainer

Local, desktop-focused practice app for California DMV Class C knowledge prep.

## Run locally

1. `npm install`
2. `npm run dev`
3. Open the localhost URL shown by Vite.

Optional commands:
- `npm run generate:bank` regenerates `src/data/questions.generated.json`.
- `npm run validate:bank` validates question schema and counts.

## Features implemented

- 40-question attempts for both Practice and Exam modes
- Difficulty selector: `Easy`, `Medium`, `Hard`, `Mix` (default)
- Fully randomized question selection from a 600-question local bank
- Immediate correct/incorrect feedback after answer selection
- Practice mode `See reason` panel with short rationale + handbook reference
- Exam mode hides rationale during test; optional reason review after finish
- 90% passing threshold logic
- Weakness ranking by category with targeted review bullets
- `Practice 10 questions in this category` actions on finish screen
- Confidence Mode ramp:
  - Questions 1-12 easy
  - Questions 13-28 medium
  - Questions 29-40 hard
- Confidence Mode only applies when Difficulty is `Mix`; fixed difficulty disables it
- `Take a 30s reset` breathing overlay (4-4-6 cycle)
- Optional in-browser resume for accidental refresh (single-session, no accounts)
- Offline-first local app (no external services)

## Question bank format

File: `src/data/questions.generated.json`

Each question uses this shape:

```json
{
  "id": "CA-0001",
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "answerIndex": 0,
  "category": "RightOfWay",
  "difficulty": "easy",
  "rationale": "...",
  "handbookRef": "Right-of-way rules"
}
```

### Category enum

Use exactly:
- `RightOfWay`
- `SignsSignalsMarkings`
- `SpeedAndFollowingDistance`
- `LaneUseAndTurns`
- `Parking`
- `FreewayDriving`
- `SharingTheRoad`
- `DistractedImpairedDriving`
- `HazardsAndDefensiveDriving`
- `LicensingRulesAndSafety`

### Difficulty enum

Use exactly:
- `easy`
- `medium`
- `hard`

## Editing questions

- Manual edits: modify `src/data/questions.generated.json` directly and run `npm run validate:bank`.
- Regenerate whole bank: edit `scripts/generateQuestionBank.mjs` concept/rule templates, then run:
  - `npm run generate:bank`
  - `npm run validate:bank`

Difficulty behavior:
- `Easy` / `Medium` / `Hard`: only questions of that difficulty are used (40-question tests, and 10-question category drills).
- `Mix`: all difficulties are eligible.
- If Confidence Mode is enabled with `Mix`, tests use a ramp (`easy -> medium -> hard`).

## Validation script

`npm run validate:bank` checks:
- bank size is 400-700
- required fields and types
- category/difficulty enum validity
- unique IDs
- answer index bounds
- choice count (exactly 4)
