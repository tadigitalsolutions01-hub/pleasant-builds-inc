import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/level-3")({
  head: () => ({ meta: [{ title: "Level 3 · MWS" }, { name: "description", content: "Level 3 team members." }] }),
  component: () => <TeamList title="Level 3 Members" count={3} level="L3 · 7%" />,
});
