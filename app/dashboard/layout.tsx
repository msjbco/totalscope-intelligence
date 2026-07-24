import { requireLiveUser } from "@/lib/auth";
export default async function Layout({children}:{children:React.ReactNode}){await requireLiveUser();return children}
