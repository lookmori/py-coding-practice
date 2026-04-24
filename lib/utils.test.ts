import {
  formatDuration,
  truncateContent,
  calculateObjectiveScore,
  calculateCompletionRate,
} from "./utils";

describe("formatDuration", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("formats 59 seconds as 00:59", () => {
    expect(formatDuration(59)).toBe("00:59");
  });

  it("formats 60 seconds as 01:00", () => {
    expect(formatDuration(60)).toBe("01:00");
  });

  it("formats 3599 seconds as 59:59", () => {
    expect(formatDuration(3599)).toBe("59:59");
  });
});

describe("truncateContent", () => {
  it("returns text unchanged when within maxLen", () => {
    expect(truncateContent("hello", 5)).toBe("hello");
  });

  it("truncates and appends ... when text exceeds maxLen", () => {
    expect(truncateContent("hello world", 5)).toBe("hello...");
  });

  it("returns text unchanged when exactly maxLen", () => {
    expect(truncateContent("hello", 10)).toBe("hello");
  });

  it("handles empty string", () => {
    expect(truncateContent("", 5)).toBe("");
  });
});

describe("calculateObjectiveScore", () => {
  it("returns 0 for empty answers", () => {
    expect(calculateObjectiveScore([])).toBe(0);
  });

  it("scores 1 for a correct answer", () => {
    expect(
      calculateObjectiveScore([{ userAnswer: "A", correctAnswer: "A" }])
    ).toBe(1);
  });

  it("scores 0 for an incorrect answer", () => {
    expect(
      calculateObjectiveScore([{ userAnswer: "B", correctAnswer: "A" }])
    ).toBe(0);
  });

  it("scores 0 for a null answer", () => {
    expect(
      calculateObjectiveScore([{ userAnswer: null, correctAnswer: "A" }])
    ).toBe(0);
  });

  it("sums scores across multiple answers", () => {
    expect(
      calculateObjectiveScore([
        { userAnswer: "A", correctAnswer: "A" },
        { userAnswer: "B", correctAnswer: "A" },
        { userAnswer: null, correctAnswer: "C" },
        { userAnswer: "D", correctAnswer: "D" },
      ])
    ).toBe(2);
  });
});

describe("calculateCompletionRate", () => {
  it("returns 0 when totalSessions is 0", () => {
    expect(calculateCompletionRate(0, 0)).toBe(0);
    expect(calculateCompletionRate(5, 0)).toBe(0);
  });

  it("returns 100 when all sessions answered", () => {
    expect(calculateCompletionRate(10, 10)).toBe(100);
  });

  it("returns 50 for half completion", () => {
    expect(calculateCompletionRate(5, 10)).toBe(50);
  });

  it("rounds to 2 decimal places", () => {
    // 1/3 * 100 = 33.333... → 33.33
    expect(calculateCompletionRate(1, 3)).toBe(33.33);
  });
});
