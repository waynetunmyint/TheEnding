import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <img src="/logo.png" alt="" width={56} height={78} style={{ objectFit: 'contain' }} />
      <h1 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800 }}>This page doesn&apos;t exist</h1>
      <p>The link may be old, or this drama isn&apos;t in the demo.</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Go to Home</Link>
    </main>
  )
}
