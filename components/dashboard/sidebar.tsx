"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";

const main = [["/dashboard","Overview","⌂"],["/client-dashboard","Clients","◇"],["/weather","Weather","☁"],["/carriers","Carriers","▱"],["/contractors","Contractors","⌁"],["/reports","Reports","▤"]];
export function Sidebar({open,onClose}:{open:boolean;onClose:()=>void}) {
 const path=usePathname();
 return <><aside className={`sidebar ${open?"open":""}`}><div className="sidebar-brand"><Brand/><button onClick={onClose} aria-label="Close navigation">×</button></div><div className="workspace-switcher"><span>TS</span><div><b>TotalScope HQ</b><small>Enterprise workspace</small></div><em>⌄</em></div><nav><small>INTELLIGENCE</small>{main.map(([href,label,icon])=><Link key={href} href={href} onClick={onClose} className={path===href?"active":""}><i>{icon}</i>{label}{label==="Weather"&&<em>3</em>}</Link>)}<small>MANAGE</small><Link href="/settings" onClick={onClose} className={path==="/settings"?"active":""}><i>⚙</i>Settings</Link></nav><div className="system-status"><div><span className="live-dot"/><b>All systems operational</b></div><small>Signals refreshed 2 min ago</small></div><div className="user-card"><span>OH</span><div><b>Olivia Hart</b><small>Chief Risk Officer</small></div><em>•••</em></div></aside>{open&&<button className="sidebar-overlay" onClick={onClose} aria-label="Close navigation"/>}</>
}
