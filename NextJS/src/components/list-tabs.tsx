import Link from 'next/link'

export function ListTabs({ current }: { current: 'saved' | 'history' }) {
  const tab = (key: 'saved' | 'history', href: string, label: string) => {
    const on = current === key
    return (
      <Link href={href} aria-current={on ? 'page' : undefined}
        style={{ height: 36, fontSize: 16, fontWeight: on ? 800 : 600, color: on ? '#FFFFFF' : 'var(--text-3)', textDecoration: 'none', boxShadow: on ? 'inset 0 -3px 0 #FF3D5E' : 'none' }}>
        {label}
      </Link>
    )
  }
  return (
    <nav aria-label="My List sections" className="row" style={{ gap: 22 }}>
      {tab('saved', '/my-list/', 'Saved')}
      {tab('history', '/history/', 'History')}
    </nav>
  )
}
