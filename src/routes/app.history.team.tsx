import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/history/team")({
  head: () => ({ meta: [{ title: "Team Commission · Meta Word Space" }, { name: "description", content: "Level 2 and 3 team commissions." }] }),
  component: () => <HistoryList title="Team Commission" kinds={["level_commission", "salary"]} tone="Level 2–3 team commissions and weekly salary payouts." />,
});
