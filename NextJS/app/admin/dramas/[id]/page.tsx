import { AdminDramaEdit } from '@/screens/AdminDramaEdit'

// Exported once as /admin/dramas/_/; the Go server serves that shell for every drama id.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <AdminDramaEdit />
}
