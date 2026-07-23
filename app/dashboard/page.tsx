import { ModulePage } from "@/components/dashboard/module-page";
export default function Page(){return <ModulePage title="Good morning, Olivia." eyebrow="PORTFOLIO COMMAND CENTER" metrics={[
 {label:"Total insured value",value:"$482.6M",change:"▲ 8.4%",detail:"vs prior period"},
 {label:"Active properties",value:"1,284",change:"+24",detail:"this month",tone:"green"},
 {label:"At-risk assets",value:"38",change:"▼ 12%",detail:"risk reduced",tone:"amber"},
 {label:"Open claims",value:"126",change:"$8.2M",detail:"total reserve"}
]} sectionTitle="Priority intelligence" rows={[
 {name:"Central Plains convective outlook",detail:"14 properties · $18.4M TIV",status:"Immediate",tone:"red",value:"Severe"},
 {name:"Coastal capacity contraction",detail:"3 carriers · FL & LA markets",status:"Monitor",tone:"amber",value:"High"},
 {name:"Northeast freeze readiness",detail:"82 properties · contractor coverage",status:"Prepared",tone:"green",value:"96.8%"},
 {name:"Portfolio valuation variance",detail:"27 assets above tolerance",status:"Review",tone:"cyan",value:"+6.2%"}
]} insight="Severe convective exposure is concentrated across 14 Central Plains assets. Pre-event contractor capacity is available within 40 miles of 12 locations; activate standby assignments before 16:00 CT."/>}
