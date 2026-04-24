"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">出错了</h1>
      <p className="text-gray-500 mb-2">
        {error.message || "发生了一个未知错误，请稍后重试。"}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-6">错误 ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        重试
      </button>
    </div>
  );
}
