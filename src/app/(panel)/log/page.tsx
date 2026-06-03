import { ActivityLogPage } from "@/components/admin/activity-log-page";
import { requireAdmin } from "@/lib/auth";

export default async function LogPage() {
  await requireAdmin();
  return <ActivityLogPage />;
}
