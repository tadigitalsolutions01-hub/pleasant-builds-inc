import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/level-2")({
  head: () => ({ meta: [{ title: "Level 2 · MWS" }, { name: "description", content: "Level 2 team members." }] }),
  component: () => <TeamList title="Level 2 Members" count={5} level="L2 · 10%" />,
});
