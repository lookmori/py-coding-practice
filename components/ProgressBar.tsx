"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  skipped?: number;
}

export default function ProgressBar({ current, total, skipped }: ProgressBarProps) {
  const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-th-text2">
        <span>
          第 {current} 题 / 共 {total} 题
        </span>
        {skipped != null && skipped > 0 && (
          <span className="text-yellow-600">已跳过 {skipped} 题</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-th-hover">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
