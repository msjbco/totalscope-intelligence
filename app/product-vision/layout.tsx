import { requireLiveUser } from "@/lib/auth";
export default async function ProductVisionLayout({children}:{children:React.ReactNode}){await requireLiveUser();return children}
