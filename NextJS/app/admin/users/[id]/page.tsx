import { notFound } from 'next/navigation'
import { AdminUserDetail } from '@/screens/AdminUserDetail'
import { ADMIN_USERS } from '@/data/dummy'

export const dynamicParams = false

export function generateStaticParams() {
  return ADMIN_USERS.map((u) => ({ id: u.id }))
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!ADMIN_USERS.some((u) => u.id === id)) notFound()
  return <AdminUserDetail id={id} />
}
