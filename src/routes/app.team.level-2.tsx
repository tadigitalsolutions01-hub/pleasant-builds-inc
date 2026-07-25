import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/level-2")({
  head: () => ({ meta: [{ title: "Level 2 · Meta Word Space" }, { name: "description", content: "Level 2 team members (10%)." }] }),
  component: () => <TeamList title="Level 2 Members" level={2} note="Second-line partners · 10% commission." />,
});
