"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import type { DataMode } from "@/types/live-intelligence";

const main = [["/dashboard","Executive","⌂"],["/claims","Claims Explorer","⌕"],["/operations","Operations","◇"],["/weather","Weather","☁"],["/carriers","Carriers","△"],["/contractors","Contractors","⌁"],["/reports","Reports","▤"]];
export function Sidebar({open,onClose,mode="demo"}:{open:boolean;onClose:()=>void;mode?:DataMode}) {
  const path=usePathname();
  return <><aside className={`sidebar ${open?"open":""}`}><div className="sidebar-brand"><Brand/><button onClick={onClose} aria-label="Close navigation">×</button></div><div className="workspace-switcher"><span>TS</span><div><b>TotalScope Intelligence</b><small>Restoration intelligence</small></div><em>⌄</em></div><nav><small>INTELLIGENCE</small>{main.map(([href,label,icon])=><Link key={href} href={href} onClick={onClose} className={path===href?"active":""}><i>{icon}</i>{label}</Link>)}<small>MANAGE</small><Link href="/admin/imports/q2-2026" onClick={onClose} className={path.startsWith("/admin/imports")?"active":""}><i>✓</i>Import validation</Link><Link href="/settings" onClick={onClose} className={path==="/settings"?"active":""}><i>⚙</i>Settings</Link></nav><div className="system-status"><div><span className="live-dot"/><b>{mode==="live"?"Live archive mode":"Demo environment"}</b></div><small>{mode==="live"?"Monday operations · Stripe not connected":"Synthetic data · no live feeds"}</small></div><div className="user-card"><span>TM</span><div><b>Local Operator</b><small>Authentication not implemented</small></div><em>•••</em></div></aside>{open&&<button className="sidebar-overlay" onClick={onClose} aria-label="Close navigation"/>}</>
}
