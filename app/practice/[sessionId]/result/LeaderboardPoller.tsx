"use client";

import { useEffect, useState } from "react";
import Leaderboard from "@/components/Leaderboard";

interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  participantName: string;
  durationSecs: number | null;
  correctCount: number | null;
}

interface Props {
  highlightSessionId: string;
  initialEntries: LeaderboardEntry[];
}

export default function LeaderboardPoller({ highlightSessionId, initialEntries }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries ?? []);
        }
      } catch {
        // silent
      }
    }

    const id = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(id);
  }, []);

  return <Leaderboard entries={entries} highlightSessionId={highlightSessionId} />;
}
