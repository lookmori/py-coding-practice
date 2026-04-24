"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";

interface TimerProps {
  durationSeconds: number;
  onExpire: () => void;
}

export default function Timer({ durationSeconds, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount; durationSeconds resets via the first useEffect

  return (
    <span className={remaining <= 60 ? "text-red-500 font-mono" : "font-mono"}>
      {formatDuration(remaining)}
    </span>
  );
}
