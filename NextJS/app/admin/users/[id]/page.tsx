import { AdminUserDetail } from '@/screens/AdminUserDetail'

// Exported once as /admin/users/_/; the Go server serves that shell for every user id.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <AdminUserDetail />
}
