import { requireRole } from "@/lib/auth";

export default async function DataHealthLayout({ children }: { children: React.ReactNode }) {
  if (process.env.TOTALSCOPE_DATA_MODE === "live") await requireRole("staging_admin");
  return children;
}
