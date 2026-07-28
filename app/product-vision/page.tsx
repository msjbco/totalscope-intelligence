"use client";
import { useRouter } from "next/navigation";
import { ProductVisionDemo } from "@/components/product-vision/product-vision-demo";
export default function ProductVisionPage(){const router=useRouter();return <ProductVisionDemo open onClose={()=>router.push("/operations")}/>}
