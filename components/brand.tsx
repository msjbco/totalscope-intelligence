import Link from "next/link";
export function Brand({ compact = false }: { compact?: boolean }) { return <Link href="/" className={`brand ${compact ? "compact" : ""}`}><span className="brand-mark"><i/><i/><i/></span><span>TotalScope<small>INTELLIGENCE</small></span></Link> }
