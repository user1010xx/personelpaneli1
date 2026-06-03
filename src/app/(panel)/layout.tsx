import { redirect } from "next/navigation";
import { getSessionUserFromDb } from "@/lib/auth";
import { PanelShell } from "@/components/layout/panel-shell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserFromDb();
  if (!user) redirect("/login");
  return <PanelShell user={user}>{children}</PanelShell>;
}
