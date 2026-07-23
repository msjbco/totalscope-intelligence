import { ModulePage } from "@/components/dashboard/module-page";
export default function Page(){return <ModulePage title="Contractor intelligence" eyebrow="RESPONSE NETWORK" metrics={[
 {label:"Verified partners",value:"642",change:"+28",detail:"this quarter",tone:"green"},
 {label:"Network coverage",value:"96.8%",change:"+3.2%",detail:"of insured assets"},
 {label:"Ready capacity",value:"184",change:"crews",detail:"available now",tone:"green"},
 {label:"Average mobilization",value:"3.4h",change:"▼ 18 min",detail:"vs benchmark"}
]} sectionTitle="Network readiness" rows={[
 {name:"Apex Restoration Group",detail:"Dallas, TX · Roofing & mitigation",status:"Available",tone:"green",value:"18 crews"},
 {name:"BlueLine Response",detail:"Tampa, FL · Water & catastrophe",status:"Standby",tone:"amber",value:"12 crews"},
 {name:"Summit Commercial Roofing",detail:"Denver, CO · Commercial roofing",status:"Available",tone:"green",value:"9 crews"},
 {name:"Northstar Mitigation",detail:"Boston, MA · Freeze & water",status:"Deployed",tone:"cyan",value:"6 crews"}
]} insight="Capacity is strong nationally, but Gulf Coast drying-equipment inventory has tightened 11%. Reserve mobile units before tropical activity increases."/>}
