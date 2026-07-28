import { requireLiveUser } from "@/lib/auth";
import "./product-vision.css";

export default async function ProductVisionLayout({children}:{children:React.ReactNode}){await requireLiveUser();return children}
