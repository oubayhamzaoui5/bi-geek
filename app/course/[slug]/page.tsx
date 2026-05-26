import { redirect } from "next/navigation"

type Params = Promise<{ slug: string }>

export default async function LegacyCourseRedirect(props: { params: Params }) {
  const { slug } = await props.params
  redirect(`/formation/${encodeURIComponent(slug)}`)
}
