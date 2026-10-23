import { notFound } from 'next/navigation'
import { AdminEpisodes } from '@/screens/AdminEpisodes'
import { DRAMAS, getDrama } from '@/data/dummy'

export const dynamicParams = false

export function generateStaticParams() {
  return DRAMAS.map((d) => ({ id: d.id }))
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getDrama(id)) notFound()
  return <AdminEpisodes id={id} />
}
