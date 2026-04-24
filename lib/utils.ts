/**
 * Format seconds into mm:ss string.
 * e.g. 0 → "00:00", 59 → "00:59", 60 → "01:00", 3599 → "59:59"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Truncate text to maxLen characters. If truncated, append "...".
 * e.g. truncateContent("hello world", 5) → "hello..."
 */
export function truncateContent(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/**
 * Calculate objective score: 1 point per answer where userAnswer === correctAnswer.
 * null answers score 0.
 */
export function calculateObjectiveScore(
  answers: { userAnswer: string | null; correctAnswer: string }[]
): number {
  return answers.reduce((score, { userAnswer, correctAnswer }) => {
    return score + (userAnswer !== null && userAnswer === correctAnswer ? 1 : 0);
  }, 0);
}

/**
 * Calculate completion rate as a percentage rounded to 2 decimal places.
 * Returns 0 when totalSessions is 0.
 */
export function calculateCompletionRate(
  answeredCount: number,
  totalSessions: number
): number {
  if (totalSessions === 0) return 0;
  return Math.round((answeredCount / totalSessions) * 100 * 100) / 100;
}
