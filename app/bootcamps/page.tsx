import BootcampsPageClient from "@/components/bootcamps-page-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bootcamps | BI Geek",
  description:
    "Découvrez nos bootcamps intensifs en technologie : Web, Data, Cyber, IA, et plus.",
  openGraph: {
    title: "Bootcamps | BI Geek",
    description:
      "Découvrez nos bootcamps intensifs en technologie : Web, Data, Cyber, IA, et plus.",
    url: "https://bi-geek.net/bootcamps",
    images: [{ url: "https://bi-geek.net/placeholder-bootcamp.png" }],
  },
}

export default function BootcampsPage() {
  return <BootcampsPageClient />
}
