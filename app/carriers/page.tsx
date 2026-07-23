import { ModulePage } from "@/components/dashboard/module-page";
export default function Page(){return <ModulePage title="Carrier intelligence" eyebrow="MARKET COMMAND" metrics={[
 {label:"Tracked markets",value:"48",change:"+3",detail:"this quarter"},
 {label:"Available capacity",value:"$318M",change:"▼ 4.2%",detail:"coastal segments",tone:"amber"},
 {label:"Appetite changes",value:"12",change:"7 favorable",detail:"last 30 days",tone:"green"},
 {label:"Submission fit",value:"82.4%",change:"+6.8%",detail:"across renewals"}
]} sectionTitle="Market movement" rows={[
 {name:"Granite Mutual",detail:"Commercial property · National",status:"Expanding",tone:"green",value:"A XV"},
 {name:"Harbor Specialty",detail:"Coastal property · Southeast",status:"Restricting",tone:"red",value:"A XIV"},
 {name:"Crestline Insurance",detail:"Middle market · Northeast",status:"Stable",tone:"cyan",value:"A XIII"},
 {name:"Pioneer Risk",detail:"Habitational · Midwest",status:"Expanding",tone:"green",value:"A XII"}
]} insight="Granite Mutual’s expanded middle-market appetite aligns with 11 upcoming renewals representing $92M in TIV. Early engagement may improve capacity and terms."/>}
