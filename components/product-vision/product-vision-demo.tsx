"use client";
import { useCallback, useEffect, useState } from "react";
import { PRODUCT_VISION_SCREENS, PRODUCT_VISION_SECTIONS } from "@/config/product-vision/screens";
import { PRODUCT_VISION_DISCLOSURE, type VisionScreen } from "@/lib/product-vision/model";

export function ProductVisionDemo({open,onClose,initialScreen=1}:{open:boolean;onClose:()=>void;initialScreen?:number}) {
  const [index,setIndex]=useState(Math.min(24,Math.max(0,initialScreen-1)));
  const move=useCallback((delta:number)=>setIndex(value=>Math.min(24,Math.max(0,value+delta))),[]);
  useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==="ArrowRight")move(1);if(event.key==="ArrowLeft")move(-1);if(event.key==="Escape")onClose()};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[open,onClose,move]);
  if(!open)return null;
  const current=PRODUCT_VISION_SCREENS[index];
  return <div className="vision-overlay" role="dialog" aria-modal="true" aria-labelledby="vision-title">
    <header className="vision-header"><div><small>PRODUCT VISION DEMO</small><b>TotalScope Intelligence</b></div><nav aria-label="Demo sections">{PRODUCT_VISION_SECTIONS.map(section=>{const first=PRODUCT_VISION_SCREENS.findIndex(item=>item.section===section);return <button key={section} className={current.section===section?"active":""} onClick={()=>setIndex(first)}>{section}</button>})}</nav><button className="vision-exit" onClick={onClose} aria-label="Exit Product Vision Demo">Exit demo ×</button></header>
    <main className={`vision-stage template-${current.template}`}><div className="vision-copy"><div className="vision-meta"><span>{current.section}</span><em>{current.status}</em></div>{current.persona&&<p className="vision-persona">{current.persona}</p>}<h1 id="vision-title">{current.title}</h1><h2>{current.question}</h2><p>{current.message}</p></div><VisionCanvas screen={current}/></main>
    <footer className="vision-footer"><p>{PRODUCT_VISION_DISCLOSURE}</p><div className="vision-controls"><button onClick={()=>move(-1)} disabled={index===0}>← Previous</button><span>{index+1} of 25</span><button onClick={()=>move(1)} disabled={index===24}>Next →</button></div></footer>
  </div>
}

function VisionCanvas({screen}:{screen:VisionScreen}) {
  let content:React.ReactNode=<HighlightGrid items={screen.highlights} template={screen.template}/>;
  if(screen.template==="pipeline")content=<div className="vision-pipeline">{screen.highlights.map((item,index)=><div key={item} className={index<4?"live":"future"}><span>{String(index+1).padStart(2,"0")}</span><b>{item}</b>{index<7&&<i>→</i>}</div>)}</div>;
  if(screen.template==="pricing")content=<PricingCards/>;
  if(screen.template==="revenue")content=<RevenueModel items={screen.highlights}/>;
  if(screen.template==="report-cover")content=<ReportCover/>;
  if(screen.template==="ask")content=<AskTsi questions={screen.highlights}/>;
  if(screen.template==="closing")content=<div className="vision-closing-flow">{screen.highlights.map((item,index)=><div key={item}><strong>{item}</strong>{index<3&&<span>→</span>}</div>)}</div>;
  return <section className="vision-canvas" aria-label={`${screen.title} illustrative interface`}><div className="vision-canvas-bar"><span/><span/><span/><b>{screen.section==="Client experience"?"Now viewing: Client Portal — Summit Roofing Group":"TotalScope Intelligence"}</b></div><div className={`vision-mock vision-mock-${screen.template}`}>{content}</div></section>
}
function HighlightGrid({items,template}:{items:readonly string[];template:string}){return <div className={`vision-highlight-grid grid-${template}`}>{items.map((item,index)=>{const parts=item.split("·").map(x=>x.trim());return <article key={item}><small>{String(index+1).padStart(2,"0")}</small><b>{parts[1]??parts[0]}</b>{parts[1]&&<span>{parts[0]}</span>}<i style={{width:`${48+(index*7)%45}%`}}/></article>})}</div>}
function PricingCards(){const plans=[["TSI Essential","Qualifying volume or $99/month","File visibility","Monthly summary","Limited ROI reporting"],["TSI Professional","$299/month","Full intelligence dashboard","Branch and carrier analysis","Executive Intelligence Report"],["TSI Enterprise","$750–$1,500/month","Multi-branch reporting","Custom KPIs and benchmarking","Priority support"]];return <div className="vision-pricing">{plans.map((plan,index)=><article className={index===1?"featured":""} key={plan[0]}><small>ILLUSTRATIVE PRICING ONLY</small><h3>{plan[0]}</h3><strong>{plan[1]}</strong>{plan.slice(2).map(item=><p key={item}>✓ {item}</p>)}</article>)}</div>}
function RevenueModel({items}:{items:readonly string[]}){return <div className="vision-revenue">{items.map((item,index)=><article key={item} className={index>2?"total":""}><span>{item}</span>{index<3&&<i style={{width:`${45+index*18}%`}}/>}</article>)}</div>}
function ReportCover(){return <div className="vision-report-cover"><small>2027 INDUSTRY INTELLIGENCE REPORT</small><h3>The State of Roofing Claims<br/>and Restoration</h3><div className="cover-map">TSI</div><p>Powered by TotalScope Intelligence</p></div>}
function AskTsi({questions}:{questions:readonly string[]}){return <div className="vision-ask"><div className="ask-orb">TSI</div><h3>Ask a question about governed operational data</h3>{questions.map(question=><button key={question} disabled>{question}<span>→</span></button>)}<div className="ask-input">Ask TSI… <span>Concept preview</span></div></div>}
