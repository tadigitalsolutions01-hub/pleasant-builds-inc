import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/history/direct")({
  head: () => ({ meta: [{ title: "Direct Commission · Meta Word Space" }, { name: "description", content: "Direct referral commissions." }] }),
  component: () => <HistoryList title="Direct Commission" kinds={["direct_commission"]} tone="Commission from level-1 sponsorships." />,
});
