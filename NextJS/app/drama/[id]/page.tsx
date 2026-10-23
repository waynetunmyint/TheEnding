import { DramaDetail } from '@/screens/DramaDetail'

// Exported once as /drama/_/; the Go server serves that shell for every drama id, and the
// screen reads the id from the URL. Dramas added in the admin panel need no rebuild.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <DramaDetail />
}
