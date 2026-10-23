import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DramaDetail } from '@/screens/DramaDetail'
import { DRAMAS, getDrama } from '@/data/dummy'

export const dynamicParams = false

export function generateStaticParams() {
  return DRAMAS.map((d) => ({ id: d.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = getDrama((await params).id)
  return d ? { title: d.title, description: d.synopsis } : {}
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getDrama(id)) notFound()
  return <DramaDetail id={id} />
}
