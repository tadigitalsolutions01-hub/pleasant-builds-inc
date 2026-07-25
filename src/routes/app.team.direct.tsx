import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/direct")({
  head: () => ({ meta: [{ title: "Direct Members · MWS" }, { name: "description", content: "Your direct partners." }] }),
  component: () => <TeamList title="Direct Members" count={4} level="Direct" />,
});
