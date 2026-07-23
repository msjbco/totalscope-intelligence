"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
export function DashboardShell({children,title,eyebrow="INTELLIGENCE OVERVIEW"}:{children:React.ReactNode;title:string;eyebrow?:string}) {
 const [open,setOpen]=useState(false);
 return <div className="app-shell"><Sidebar open={open} onClose={()=>setOpen(false)}/><main className="dashboard-main"><header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation">☰</button><div className="search"><span>⌕</span><input aria-label="Search" placeholder="Search properties, carriers, reports..."/><kbd>⌘ K</kbd></div><div className="top-actions"><button aria-label="Help">?</button><button aria-label="Notifications">♢<i/></button><button className="avatar">OH</button></div></header><div className="dashboard-content"><div className="page-heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>Live portfolio intelligence, prioritized for action.</p></div><div className="heading-actions"><button className="button ghost">Last 30 days⌄</button><button className="button">Export brief ↗</button></div></div>{children}</div></main></div>
}
