import { AdminEpisodes } from '@/screens/AdminEpisodes'

// Exported once as /admin/dramas/_/episodes/; see app/admin/dramas/[id]/page.tsx.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <AdminEpisodes />
}
