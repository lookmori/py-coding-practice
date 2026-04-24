"use client";

interface ScreenSwitchWarningProps {
  count: number;
  threshold: number;
  visible: boolean;
}

export default function ScreenSwitchWarning({
  count,
  threshold,
  visible,
}: ScreenSwitchWarningProps) {
  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-yellow-400 px-4 py-3 text-center shadow-md">
      <p className="text-sm font-medium text-yellow-900">
        检测到屏幕切换（第 {count} 次），该行为已被记录
      </p>
      {count > threshold && (
        <p className="mt-1 text-sm font-semibold text-red-700">
          切换次数已超过警告阈值！
        </p>
      )}
    </div>
  );
}
