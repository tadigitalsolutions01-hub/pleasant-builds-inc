import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/history/team")({
  head: () => ({ meta: [{ title: "Team Commission · MWS" }, { name: "description", content: "Team commission history." }] }),
  component: () => <HistoryList title="Team Commission History" description="Level 1 · Level 2 · Level 3 combined." filter={(a) => a.type === "Team Income"} />,
});
