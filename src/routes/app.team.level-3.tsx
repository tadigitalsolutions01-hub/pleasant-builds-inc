import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/level-3")({
  head: () => ({ meta: [{ title: "Level 3 · Meta Word Space" }, { name: "description", content: "Level 3 team members (7%)." }] }),
  component: () => <TeamList title="Level 3 Members" level={3} note="Third-line partners · 7% commission." />,
});
