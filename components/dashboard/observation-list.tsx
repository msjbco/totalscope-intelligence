import type { Observation } from "@/types/intelligence";
export function ObservationList({items}:{items:Observation[]}){return <div className="observation-list">{items.map(item=><article key={item.id} className={`observation ${item.severity}`}><i/><div><b>{item.title}</b><p>{item.detail}</p><small>{item.basis}</small></div></article>)}</div>}
