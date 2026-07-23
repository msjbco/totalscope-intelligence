import { ModulePage } from "@/components/dashboard/module-page";
export default function Page(){return <ModulePage title="Reports" eyebrow="DECISION LIBRARY" metrics={[
 {label:"Published reports",value:"284",change:"+18",detail:"this month"},
 {label:"Scheduled briefs",value:"12",change:"8 active",detail:"automations",tone:"green"},
 {label:"Executive readers",value:"46",change:"+9",detail:"this quarter"},
 {label:"Data freshness",value:"99.4%",change:"12 min",detail:"median latency",tone:"green"}
]} sectionTitle="Recent intelligence reports" rows={[
 {name:"Q3 Portfolio Risk Outlook",detail:"Executive portfolio · Published Jul 21",status:"Published",tone:"green",value:"28 pages"},
 {name:"Central Plains Event Brief",detail:"Weather intelligence · Updated 14 min ago",status:"Live",tone:"red",value:"12 pages"},
 {name:"Carrier Capacity Benchmark",detail:"Market intelligence · Published Jul 18",status:"Published",tone:"green",value:"34 pages"},
 {name:"Contractor Network Readiness",detail:"Response operations · Draft Jul 17",status:"Draft",tone:"neutral",value:"18 pages"}
]} insight="Executive readership is highest on event-driven briefs. Scheduling a weekly exposure digest for regional leaders could reduce ad hoc reporting volume."/>}
