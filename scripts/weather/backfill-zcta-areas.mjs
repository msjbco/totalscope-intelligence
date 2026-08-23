const VERSION="2025-tiger-line-zcta520";
const batchSize=Number(process.env.ZCTA_AREA_BATCH_SIZE??100);
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
if(!Number.isInteger(batchSize)||batchSize<1||batchSize>500) throw new Error("ZCTA_AREA_BATCH_SIZE must be an integer from 1 to 500.");
let populatedThisRun=0,batches=0,last;
do {
  const response=await fetch(`${url}/rest/v1/rpc/backfill_zcta_geodesic_area_batch`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({p_dataset_version:VERSION,p_batch_size:batchSize})});
  if(!response.ok) throw new Error(`ZCTA area backfill batch failed (${response.status}): ${await response.text()}`);
  last=await response.json(); batches+=1; populatedThisRun+=last.populated_this_batch;
  if(batches===1||last.complete||batches%25===0) console.log(JSON.stringify({...last,batches,populated_this_run:populatedThisRun}));
} while(!last.complete);
console.log(JSON.stringify({status:"complete",dataset_version:VERSION,batch_size:batchSize,batches,populated_this_run:populatedThisRun,total:last.total,remaining:last.remaining}));
