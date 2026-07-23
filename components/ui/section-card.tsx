import type { ReactNode } from "react";
export function SectionCard({eyebrow,title,action,children,className=""}:{eyebrow?:string;title:string;action?:ReactNode;children:ReactNode;className?:string}) { return <section className={`card section-card ${className}`}><header><div>{eyebrow&&<small>{eyebrow}</small>}<h2>{title}</h2></div>{action}</header>{children}</section> }
