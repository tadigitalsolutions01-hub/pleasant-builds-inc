import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/history/passive")({
  head: () => ({ meta: [{ title: "Passive Income · Meta Word Space" }, { name: "description", content: "Daily AI passive yield claims." }] }),
  component: () => <HistoryList title="Passive Income" kinds={["passive"]} tone="Daily AI yield credited to your account." />,
});
