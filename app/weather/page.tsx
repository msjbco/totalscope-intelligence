import { ModulePage } from "@/components/dashboard/module-page";
export default function Page(){return <ModulePage title="Weather intelligence" eyebrow="CATASTROPHE MONITOR" metrics={[
 {label:"Assets under watch",value:"52",change:"+14",detail:"since 06:00",tone:"amber"},
 {label:"TIV in watch zones",value:"$74.8M",change:"15.5%",detail:"of portfolio"},
 {label:"Active events",value:"7",change:"3 severe",detail:"next 72 hours",tone:"amber"},
 {label:"Response ready",value:"96.8%",change:"+4.1%",detail:"network coverage",tone:"green"}
]} sectionTitle="Active weather events" rows={[
 {name:"Central Plains severe convective",detail:"Hail >2 in · Wind >70 mph",status:"Warning",tone:"red",value:"14 assets"},
 {name:"Gulf Coast tropical outlook",detail:"Formation probability 40%",status:"Watch",tone:"amber",value:"22 assets"},
 {name:"Northeast freeze event",detail:"Temperatures below 18°F",status:"Advisory",tone:"cyan",value:"9 assets"},
 {name:"Pacific Northwest atmospheric river",detail:"3–5 in projected rainfall",status:"Monitor",tone:"neutral",value:"7 assets"}
]} insight="The Central Plains event has the highest loss potential. Roof age and hail vulnerability raise modeled severity at four locations; contractor capacity is currently sufficient."/>}
