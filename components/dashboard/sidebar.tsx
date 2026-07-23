"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";

const main = [["/dashboard","Executive","⌂"],["/claims","Claims Explorer","⌕"],["/operations","Operations","◇"],["/weather","Weather","☁"],["/carriers","Carriers","▱"],["/contractors","Contractors","⌁"],["/reports","Reports","▤"]];
export function Sidebar({open,onClose}:{open:boolean;onClose:()=>void}) {
 const path=usePathname();
 return <><aside className={`sidebar ${open?"open":""}`}><div className="sidebar-brand"><Brand/><button onClick={onClose} aria-label="Close navigation">×</button></div><div className="workspace-switcher"><span>TS</span><div><b>TotalScope Demo</b><small>Restoration intelligence</small></div><em>⌄</em></div><nav><small>INTELLIGENCE</small>{main.map(([href,label,icon])=><Link key={href} href={href} onClick={onClose} className={path===href?"active":""}><i>{icon}</i>{label}</Link>)}<small>MANAGE</small><Link href="/settings" onClick={onClose} className={path==="/settings"?"active":""}><i>⚙</i>Settings</Link></nav><div className="system-status"><div><span className="live-dot"/><b>Demo environment</b></div><small>Synthetic data · no live feeds</small></div><div className="user-card"><span>TM</span><div><b>Demo Operator</b><small>Product demonstration</small></div><em>•••</em></div></aside>{open&&<button className="sidebar-overlay" onClick={onClose} aria-label="Close navigation"/>}</>
}
