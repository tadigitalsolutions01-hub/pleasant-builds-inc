import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/level-1")({
  head: () => ({ meta: [{ title: "Level 1 · MWS" }, { name: "description", content: "Level 1 team members." }] }),
  component: () => <TeamList title="Level 1 Members" count={6} level="L1 · 15%" />,
});
