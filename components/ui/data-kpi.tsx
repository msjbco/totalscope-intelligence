import type { MetricResult } from "@/types/intelligence";
export function DataKpi({label,result,format=(v)=>String(Math.round(v)),tone="cyan"}:{label:string;result:MetricResult;format?:(value:number)=>string;tone?:"cyan"|"green"|"amber"}){
 const m=result.metadata;return <article className="card data-kpi"><div className="kpi-top"><span>{label}</span><span className={`measure-status ${m.status}`}>{m.status}</span></div><strong>{result.value===null?"Unavailable":format(result.value)}</strong><p>{m.explanation}</p><details><summary>Metric details <b>{m.confidence}</b></summary><dl><div><dt>Numerator</dt><dd>{m.numerator??"—"}</dd></div><div><dt>Denominator</dt><dd>{m.denominator??"—"}</dd></div><div><dt>Coverage</dt><dd>{m.coveragePercent}%</dd></div><div><dt>Confidence</dt><dd>Grade {m.confidence}</dd></div></dl></details><i className={`kpi-accent ${tone}`}/>
 </article>
}
