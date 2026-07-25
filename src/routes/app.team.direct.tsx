import { createFileRoute } from "@tanstack/react-router";
import { TeamList } from "@/components/mws/lists";
export const Route = createFileRoute("/app/team/direct")({
  head: () => ({ meta: [{ title: "Direct Members · Meta Word Space" }, { name: "description", content: "Your direct referrals." }] }),
  component: () => <TeamList title="Direct Members" level={1} note="Users who joined with your sponsor code." />,
});
