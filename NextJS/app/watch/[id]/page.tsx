import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Player } from '@/screens/Player'
import { PUBLISHED, getDrama } from '@/data/dummy'

export const dynamicParams = false

export function generateStaticParams() {
  return PUBLISHED.map((d) => ({ id: d.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = getDrama((await params).id)
  return d ? { title: `Watch ${d.title}` } : {}
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = getDrama(id)
  if (!d || d.status !== 'Published') notFound()
  return (
    <Suspense fallback={<div className="player-wrap"><div className="player" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div></div>}>
      <Player id={id} />
    </Suspense>
  )
}
