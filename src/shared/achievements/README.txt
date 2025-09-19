Design note:
- AchievementsCenter reads StudyStorage records, computes stats and badge unlocks.
- Unlock timestamps are persisted under `kids-coding-achievements:v1`.
- Points = totalCorrect; Level = floor(points / 50) + 1 (min 1).
- Extend BADGES in AchievementsData.ts to add more achievements.
