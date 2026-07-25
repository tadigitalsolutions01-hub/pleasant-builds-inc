import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/history/direct")({
  head: () => ({ meta: [{ title: "Direct Commission · MWS" }, { name: "description", content: "Direct commission history." }] }),
  component: () => <HistoryList title="Direct Commission History" description="Commissions from your direct partners." filter={(a) => a.type === "Team Income" && (a.note ?? "").includes("L1")} />,
});
