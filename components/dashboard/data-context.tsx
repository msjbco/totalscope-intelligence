"use client";
import { createContext,useContext,useMemo,useState } from "react";
import { demoData } from "@/lib/demo-data";
import { defaultFilters,filterClaims } from "@/lib/filters";
import type { FilterState } from "@/types/intelligence";

const Context=createContext<null|{filters:FilterState;setFilter:(key:keyof FilterState,value:string)=>void;reset:()=>void;claims:typeof demoData.claims;data:typeof demoData}>(null);
export function DataProvider({children}:{children:React.ReactNode}){const [filters,setFilters]=useState(defaultFilters);const claims=useMemo(()=>filterClaims(demoData.claims,filters),[filters]);return <Context.Provider value={{filters,setFilter:(key,value)=>setFilters(f=>({...f,[key]:value})),reset:()=>setFilters(defaultFilters),claims,data:demoData}}>{children}</Context.Provider>}
export function useDemoData(){const value=useContext(Context);if(!value)throw new Error("useDemoData must be used inside DataProvider");return value}
