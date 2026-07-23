import { ModulePage } from "@/components/dashboard/module-page";
export default function Page(){return <ModulePage title="Client portfolio" eyebrow="CLIENT INTELLIGENCE" metrics={[
 {label:"Managed accounts",value:"86",change:"+6",detail:"year to date"},
 {label:"Portfolio TIV",value:"$1.24B",change:"▲ 11.2%",detail:"annual growth"},
 {label:"Renewals due",value:"18",change:"90 days",detail:"look-ahead",tone:"amber"},
 {label:"Client health",value:"94.2",change:"+2.8",detail:"quarter over quarter",tone:"green"}
]} sectionTitle="Account priorities" rows={[
 {name:"Summit Residential Group",detail:"186 properties · Multi-family",status:"Renewal",tone:"amber",value:"$214M"},
 {name:"Northstar Hospitality",detail:"42 properties · Hospitality",status:"Healthy",tone:"green",value:"$168M"},
 {name:"Meridian Commercial",detail:"74 properties · Office",status:"Review",tone:"cyan",value:"$132M"},
 {name:"Atlas Industrial Partners",detail:"61 properties · Industrial",status:"Healthy",tone:"green",value:"$118M"}
]} insight="Summit Residential’s renewal exposure is concentrated in hail-prone counties. Updated roof-condition evidence could strengthen the submission across four target markets."/>}
