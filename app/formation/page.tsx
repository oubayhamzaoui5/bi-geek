import { redirect } from "next/navigation"

export default function FormationRedirect({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined) params.set(k, Array.isArray(v) ? v[0] : v)
  }
  const qs = params.toString()
  redirect(qs ? `/formations?${qs}` : "/formations")
}
