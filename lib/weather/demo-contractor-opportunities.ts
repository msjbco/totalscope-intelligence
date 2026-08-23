export type DemoRoofingCompany = {
  name: string;
  city: string;
  distanceKm: number;
  contact: string;
  phone: string;
  email: string;
  isClient: boolean;
  slug: string;
};

const REGIONAL_COMPANIES: Record<string, DemoRoofingCompany[]> = {
  TX: [
    {name:"Lone Star Roofworks",city:"Dallas, TX",distanceKm:12,contact:"Avery Collins",phone:"(214) 555-0104",email:"avery@lonestar.example",isClient:true,slug:"lone-star-roofworks"},
    {name:"Prairie Peak Exteriors",city:"Fort Worth, TX",distanceKm:31,contact:"Jordan Ellis",phone:"(817) 555-0118",email:"jordan@prairiepeak.example",isClient:false,slug:"prairie-peak-exteriors"},
    {name:"Red River Commercial Roofing",city:"Denton, TX",distanceKm:47,contact:"Morgan Hayes",phone:"(940) 555-0131",email:"morgan@redriver.example",isClient:true,slug:"red-river-commercial"},
  ],
  LA: [
    {name:"Gulf Shield Roofing",city:"Baton Rouge, LA",distanceKm:18,contact:"Casey Bennett",phone:"(225) 555-0146",email:"casey@gulfshield.example",isClient:true,slug:"gulf-shield-roofing"},
    {name:"Bayou State Exteriors",city:"Hammond, LA",distanceKm:42,contact:"Riley Foster",phone:"(985) 555-0159",email:"riley@bayoustate.example",isClient:false,slug:"bayou-state-exteriors"},
    {name:"Coastal Response Roofing",city:"New Orleans, LA",distanceKm:49,contact:"Taylor Monroe",phone:"(504) 555-0163",email:"taylor@coastalresponse.example",isClient:false,slug:"coastal-response"},
  ],
  CO: [
    {name:"Front Range Roof Systems",city:"Denver, CO",distanceKm:9,contact:"Cameron Wells",phone:"(303) 555-0177",email:"cameron@frontrange.example",isClient:true,slug:"front-range-roof-systems"},
    {name:"Mile High Exteriors",city:"Aurora, CO",distanceKm:21,contact:"Drew Parker",phone:"(720) 555-0182",email:"drew@milehigh.example",isClient:false,slug:"mile-high-exteriors"},
    {name:"Rocky Mountain Commercial",city:"Fort Collins, CO",distanceKm:48,contact:"Alexis Grant",phone:"(970) 555-0108",email:"alexis@rockymountain.example",isClient:false,slug:"rocky-mountain-commercial"},
  ],
  MA: [
    {name:"Commonwealth Roofing Group",city:"Boston, MA",distanceKm:8,contact:"Devin Ross",phone:"(617) 555-0122",email:"devin@commonwealth.example",isClient:true,slug:"commonwealth-roofing"},
    {name:"New England Roof & Snow",city:"Worcester, MA",distanceKm:39,contact:"Jamie Carter",phone:"(508) 555-0139",email:"jamie@newengland.example",isClient:false,slug:"new-england-roof-snow"},
    {name:"Atlantic Peak Exteriors",city:"Providence, RI",distanceKm:46,contact:"Skyler Price",phone:"(401) 555-0151",email:"skyler@atlanticpeak.example",isClient:false,slug:"atlantic-peak-exteriors"},
  ],
  GA: [
    {name:"Peachtree Roofing Partners",city:"Atlanta, GA",distanceKm:14,contact:"Parker Lane",phone:"(404) 555-0168",email:"parker@peachtree.example",isClient:true,slug:"peachtree-roofing"},
    {name:"Southeast Storm Exteriors",city:"Athens, GA",distanceKm:46,contact:"Quinn Bailey",phone:"(706) 555-0106",email:"quinn@southeaststorm.example",isClient:false,slug:"southeast-storm-exteriors"},
    {name:"Carolina Coastal Roofworks",city:"Greenville, SC",distanceKm:49,contact:"Emerson Gray",phone:"(864) 555-0127",email:"emerson@carolinacoastal.example",isClient:true,slug:"carolina-coastal-roofworks"},
  ],
};

export function demoCompaniesForStates(states: string[]) {
  return REGIONAL_COMPANIES[states[0]] ?? REGIONAL_COMPANIES.TX;
}
