import { Suspense } from 'react'
import { Player } from '@/screens/Player'

// Exported once as /watch/_/; see app/drama/[id]/page.tsx.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return (
    <Suspense fallback={<div className="player-wrap"><div className="player" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div></div>}>
      <Player />
    </Suspense>
  )
}
