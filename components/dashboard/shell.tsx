"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { DataProvider } from "./data-context";
import { FilterBar } from "./filter-bar";
export function DashboardShell({children,title,eyebrow="INTELLIGENCE OVERVIEW"}:{children:React.ReactNode;title:string;eyebrow?:string}) {
 const [open,setOpen]=useState(false);
 return <DataProvider><div className="app-shell"><Sidebar open={open} onClose={()=>setOpen(false)}/><main className="dashboard-main"><header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation">☰</button><div className="search"><span>⌕</span><input aria-label="Global search" placeholder="Search claims, carriers, contractors..."/><kbd>⌘ K</kbd></div><div className="top-actions"><button aria-label="Help" disabled>?</button><button aria-label="Notifications" disabled>♢<i/></button><button className="avatar" aria-label="Demo user profile">TM</button></div></header><div className="dashboard-content"><div className="page-heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>Synthetic restoration intelligence for product demonstration.</p></div><div className="heading-actions"><button className="button ghost" disabled>Schedule report</button><button className="button" disabled>Export brief ↗</button></div></div><FilterBar/>{children}</div></main></div></DataProvider>
}
