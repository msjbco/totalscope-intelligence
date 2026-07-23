"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { DataProvider } from "./data-context";
import { FilterBar } from "./filter-bar";
import type { DataMode } from "@/types/live-intelligence";

export function DashboardShell({children,title,eyebrow="INTELLIGENCE OVERVIEW",mode="demo"}:{children:React.ReactNode;title:string;eyebrow?:string;mode?:DataMode}) {
  const [open,setOpen]=useState(false);
  return <DataProvider><div className="app-shell"><Sidebar open={open} onClose={()=>setOpen(false)} mode={mode}/><main className="dashboard-main"><header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation">☰</button><div className="search"><span>⌕</span><input aria-label="Global search" placeholder="Search claims, carriers, contractors..." disabled/><kbd>⌘ K</kbd></div><div className="top-actions"><button aria-label="Help" disabled>?</button><button aria-label="Notifications" disabled>♢<i/></button><button className="avatar" aria-label="Local development profile">TM</button></div></header><div className="dashboard-content"><div className="page-heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>{mode==="live"?"Imported operational intelligence with source-level provenance.":"Synthetic restoration intelligence for product demonstration."}</p></div><div className="heading-actions"><span className={`data-mode-badge ${mode}`}>{mode==="live"?"Q2 2026 Live Archive Data":"Demo Data"}</span><button className="button ghost" disabled>Schedule report</button><button className="button" disabled>Export brief ↗</button></div></div>{mode==="demo"&&<FilterBar/>}{children}</div></main></div></DataProvider>
}
