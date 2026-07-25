import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/level-1")({
  head: () => ({ meta: [{ title: "Level 1 · Meta Word Space" }, { name: "description", content: "Level 1 team members (15%)." }] }),
  component: () => <TeamList title="Level 1 Members" level={1} note="Direct referrals · 15% commission." />,
});
