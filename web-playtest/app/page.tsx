import type { Metadata } from "next";
import { PlaytestShell } from "./PlaytestShell";

export const metadata: Metadata = {
  title: "Old Stables — Browser Playtest",
  description:
    "Revive a failing estate brewery in this playable management-game build.",
  other: {
    "codex-preview": "playtest",
  },
};

export default function Home() {
  return <PlaytestShell />;
}
