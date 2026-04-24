"use client";

interface AnswerRecord {
  question: {
    content: string;
    type: string;
    correctAnswer: string;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
  };
  userAnswer: string | null;
  isCorrect: boolean | null;
}

interface ScoreSummaryProps {
  objectiveScore: number;
  totalObjective: number;
  switchCount: number;
  answers: AnswerRecord[];
}

export default function ScoreSummary({
  objectiveScore,
  totalObjective,
  switchCount,
  answers,
}: ScoreSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Score overview */}
      <div className="rounded-lg border border-th-border bg-th-bg2 p-6 shadow-sm">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-th-text2">客观题总分</p>
            <p className="text-3xl font-bold text-th-text">
              {objectiveScore}{" "}
              <span className="text-lg font-normal text-th-muted">/ {totalObjective}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-th-text2">屏幕切换次数</p>
            <p className="text-3xl font-bold text-th-text">{switchCount}</p>
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {answers.map((item, idx) => {
          let rowClass = "rounded-lg border px-4 py-4 ";
          if (item.userAnswer === null) {
            rowClass += "border-th-border bg-th-bg";
          } else if (item.isCorrect) {
            rowClass += "border-green-200 bg-green-50";
          } else {
            rowClass += "border-red-200 bg-red-50";
          }

          return (
            <div key={idx} className={rowClass}>
              <p className="mb-2 text-sm font-medium text-th-text">
                {idx + 1}. {item.question.content}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-th-text2">
                  你的答案：
                  <span className="font-medium">
                    {item.userAnswer ?? <span className="text-th-muted">未作答</span>}
                  </span>
                </span>
                <span className="text-th-text2">
                  正确答案：
                  <span className="font-medium text-green-700">{item.question.correctAnswer}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
