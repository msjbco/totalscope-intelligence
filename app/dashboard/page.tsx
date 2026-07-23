import { DashboardShell } from "@/components/dashboard/shell";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { LiveExecutiveDashboard } from "@/components/dashboard/live-executive-dashboard";
import { LiveDataError } from "@/components/dashboard/live-data-error";
import { dashboardSummary } from "@/lib/data/repository";
import { getDataMode } from "@/lib/data/config";
export default async function Page(){const mode=getDataMode();if(mode==="demo")return <DashboardShell title="Executive intelligence" eyebrow="RESTORATION PERFORMANCE" mode="demo"><ExecutiveDashboard/></DashboardShell>;try{const summary=await dashboardSummary();return <DashboardShell title="Executive intelligence" eyebrow="RESTORATION PERFORMANCE" mode="live">{summary&&<LiveExecutiveDashboard summary={summary}/>}</DashboardShell>}catch(error){return <DashboardShell title="Executive intelligence" eyebrow="RESTORATION PERFORMANCE" mode="live"><LiveDataError message={error instanceof Error?error.message:"Unknown live data error"}/></DashboardShell>}}
