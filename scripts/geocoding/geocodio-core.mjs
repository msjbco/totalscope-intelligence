import { createHash } from "node:crypto";

const compact=(value)=>String(value??"").trim().toUpperCase().replace(/\s+/g," ");
export function normalizedAddress(request){return [request.streetAddress,request.city,request.stateCode,request.postalCode,request.countryCode??"US"].map(compact).join("|");}
export function addressFingerprint(request){return createHash("sha256").update(normalizedAddress(request)).digest("hex");}
export function requestFingerprint(request,provider="geocodio",version="v2",locationScope=""){return createHash("sha256").update(`${provider}|${version}|${locationScope}|${normalizedAddress(request)}`).digest("hex");}
export function canonicalPrecision(accuracyType,matchType){
  if(accuracyType==="rooftop"&&matchType==="parcel_centroid")return "parcel";
  if(accuracyType==="rooftop")return "rooftop";
  if(["point","range_interpolation"].includes(accuracyType))return "interpolated_address";
  if(["intersection","street_center"].includes(accuracyType))return "street";
  if(accuracyType==="place")return "city";
  if(accuracyType==="county")return "county";
  if(accuracyType==="state")return "state";
  return "unknown";
}
const zip5=(value)=>String(value??"").match(/^\d{5}/)?.[0]??null;
export function normalizeGeocodioResponse(request,payload){
  const results=Array.isArray(payload?.results)?payload.results:[];
  if(!results.length)return {status:"not_found",latitude:null,longitude:null,precision:"unknown",providerReference:null,explanation:"Provider returned no candidates.",confidence:null,providerPrecision:null,matchType:null,formattedAddress:null,returnedCity:null,returnedStateCode:null,returnedPostalCode:null,stateMatches:null,postalCodeMatches:null,reviewStatus:"rejected",reviewReason:"no_match",componentMetadata:{candidateCount:0},rawProviderPayload:payload};
  const top=results[0],parts=top.address_components??{},accuracy=Number(top.accuracy??0),providerPrecision=top.accuracy_type??"unknown",matchType=top.match_type??null,precision=canonicalPrecision(providerPrecision,matchType);
  const sourceState=compact(request.stateCode),returnedState=compact(parts.state_province??parts.state),sourceZip=zip5(request.postalCode),returnedZip=zip5(parts.postal_code??parts.zip);
  const stateMatches=Boolean(sourceState&&returnedState&&sourceState===returnedState),postalCodeMatches=Boolean(sourceZip&&returnedZip&&sourceZip===returnedZip);
  const poBox=/\bP(?:OST)?\.?\s*O(?:FFICE)?\.?\s+BOX\b/i.test(request.streetAddress??"");
  const ambiguous=results.length>1&&Math.abs(accuracy-Number(results[1]?.accuracy??0))<0.02;
  const unitToken=String(request.streetAddress??"").match(/\b(?:SUITE|STE|UNIT|#)\s*([A-Z0-9-]+)/i)?.[1]??null;
  const unitMatches=!unitToken||compact(top.formatted_address).includes(compact(unitToken));
  const addressLevel=["rooftop","parcel","interpolated_address"].includes(precision);
  let reviewStatus="auto_accepted",reviewReason="strict_address_match";
  if(poBox){reviewStatus="rejected";reviewReason="po_box";}
  else if(ambiguous){reviewStatus="review_required";reviewReason="multiple_candidates";}
  else if(!unitMatches){reviewStatus="review_required";reviewReason="unit_mismatch";}
  else if(!stateMatches){reviewStatus="review_required";reviewReason="state_mismatch";}
  else if(!postalCodeMatches){reviewStatus="review_required";reviewReason="zip_mismatch";}
  else if(accuracy<0.9){reviewStatus="review_required";reviewReason="low_confidence";}
  else if(!addressLevel){reviewStatus="review_required";reviewReason="insufficient_precision";}
  return {status:ambiguous?"ambiguous":"matched",latitude:Number.isFinite(Number(top.location?.lat))?Number(top.location.lat):null,longitude:Number.isFinite(Number(top.location?.lng))?Number(top.location.lng):null,precision,providerReference:top.stable_address_key??top.id??null,explanation:reviewReason.replaceAll("_"," "),confidence:accuracy,providerPrecision,matchType,formattedAddress:top.formatted_address??null,returnedCity:parts.city??null,returnedStateCode:parts.state_province??parts.state??null,returnedPostalCode:parts.postal_code??parts.zip??null,stateMatches,postalCodeMatches,reviewStatus,reviewReason,componentMetadata:{candidateCount:results.length,unitMatches,addressComponents:parts},rawProviderPayload:payload};
}

export function selectStratifiedSample(locations,size=50){
  const sorted=[...locations].sort((a,b)=>String(a.id).localeCompare(String(b.id))),chosen=[],used=new Set();
  const take=(label,predicate,count)=>{for(const row of sorted){if(chosen.filter(x=>x.category===label).length>=count)break;if(!used.has(row.id)&&predicate(row)){used.add(row.id);chosen.push({...row,category:label});}}};
  take("po_box",r=>/\bP(?:OST)?\.?\s*O(?:FFICE)?\.?\s+BOX\b/i.test(r.street_address??""),1);
  take("malformed_state",r=>!/^[A-Z]{2}$/.test(String(r.state_code??"").trim()),1);
  const addressCounts=new Map();for(const r of sorted){const k=compact(r.street_address);addressCounts.set(k,(addressCounts.get(k)??0)+1);}
  take("repeated_address",r=>(addressCounts.get(compact(r.street_address))??0)>1,8);
  take("suite_unit",r=>/\b(?:SUITE|STE|UNIT|#)\b/i.test(r.street_address??""),12);
  take("normalization_heavy",r=>/[.#]|\b(?:HIGHWAY|HWY|ROUTE|RR|BOX)\b/i.test(r.street_address??""),8);
  const stateSeen=new Set();for(const r of sorted){if(chosen.length>=size)break;if(used.has(r.id))continue;const state=compact(r.state_code);if(!stateSeen.has(state)){stateSeen.add(state);used.add(r.id);chosen.push({...r,category:"geographic_diversity"});}}
  for(const r of sorted){if(chosen.length>=size)break;if(!used.has(r.id)){used.add(r.id);chosen.push({...r,category:"ordinary"});}}
  if(chosen.length!==size)throw new Error(`Unable to select exactly ${size} locations`);
  return chosen.map((row,index)=>({...row,sampleRef:`GEO-${String(index+1).padStart(3,"0")}`,sampleOrdinal:index+1}));
}

const radians=(value)=>value*Math.PI/180;
const distanceKm=(a,b)=>{const dLat=radians(b[1]-a[1]),dLon=radians(b[0]-a[0]),x=Math.sin(dLat/2)**2+Math.cos(radians(a[1]))*Math.cos(radians(b[1]))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
const insideRing=(point,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>point[1])!==(yj>point[1])&&point[0]<((xj-xi)*(point[1]-yi))/(yj-yi)+xi)inside=!inside;}return inside;};
export function classifyExposure(point,geometry,nearRadiusKm=50){
  if(!geometry||!point)return "unknown";
  const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.type==="MultiPolygon"?geometry.coordinates:null;
  if(!polygons)return "unknown";
  if(polygons.some(p=>insideRing(point,p[0])&&!p.slice(1).some(h=>insideRing(point,h))))return "direct";
  let nearest=Infinity;for(const polygon of polygons)for(const vertex of polygon[0])nearest=Math.min(nearest,distanceKm(point,vertex));
  return nearest<=nearRadiusKm?"near":"outside";
}
