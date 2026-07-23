import { DashboardShell } from "@/components/dashboard/shell";
import { ClaimsExplorer } from "@/components/dashboard/claims-explorer";
import { LiveClaimsExplorer } from "@/components/dashboard/live-claims-explorer";
import { LiveDataError } from "@/components/dashboard/live-data-error";
import { claimsList } from "@/lib/data/repository";
import { getDataMode } from "@/lib/data/config";
export default async function Page(){const mode=getDataMode();if(mode==="demo")return <DashboardShell title="Claims Explorer" eyebrow="FILE-LEVEL INTELLIGENCE" mode="demo"><ClaimsExplorer/></DashboardShell>;try{const claims=await claimsList();return <DashboardShell title="Claims Explorer" eyebrow="Q2 2026 LIVE FILES" mode="live">{claims&&<LiveClaimsExplorer claims={claims}/>}</DashboardShell>}catch(error){return <DashboardShell title="Claims Explorer" eyebrow="Q2 2026 LIVE FILES" mode="live"><LiveDataError message={error instanceof Error?error.message:"Unknown live data error"}/></DashboardShell>}}
