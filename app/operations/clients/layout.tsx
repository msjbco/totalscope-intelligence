import { getDataMode } from "@/lib/data/config";
import { requireRole } from "@/lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (getDataMode() === "live") await requireRole("staging_admin");
  return children;
}
