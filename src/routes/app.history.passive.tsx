import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/history/passive")({
  head: () => ({ meta: [{ title: "Passive Income · MWS" }, { name: "description", content: "Passive income history." }] }),
  component: () => <HistoryList title="Passive Income History" description="Daily AI yield claims." filter={(a) => a.type === "Passive Income" || a.type === "Claim"} />,
});
