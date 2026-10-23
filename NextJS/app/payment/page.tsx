'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AppShell, LoadState, RequireSignIn, TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { invalidate, useConfig } from '@/lib/data'
import { fmtStamp, price } from '@/lib/format'
import { setMe } from '@/lib/store'
import type { Me, Payment } from '@/lib/types'

type Outcome = 'success' | 'pending' | 'failed'

function Checkout() {
  const params = useSearchParams()
  const config = useConfig()
  const back = params.get('return') ?? '/store/'
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/store/'
  const productId = params.get('product') ?? ''
  const [result, setResult] = useState<Payment | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!config.data) return <LoadState error={config.error} onRetry={config.reload} />
  const pack = config.data.coinPacks.find((p) => p.id === productId)
  const plan = config.data.vipPlans.find((p) => p.id === productId)
  if (!pack && !plan) {
    return <div className="empty"><h2>This product isn&apos;t available</h2><p>Pick a coin pack or VIP plan again.</p><Link href="/store/" className="btn btn-primary">Coin Store</Link></div>
  }
  const item = pack ? `${pack.coins + pack.bonus} coins${pack.bonus ? ` (${pack.coins} + ${pack.bonus} bonus)` : ''}` : `VIP ${plan!.name}`
  const amount = price((pack ?? plan)!.priceCents)

  // The store sheet is simulated: the order is real, and the chosen outcome is what the
  // "store" answers.
  const pay = async (outcome: Outcome) => {
    setBusy(true)
    setError('')
    try {
      const order = await api<Payment>('/payments', { method: 'POST', body: { productId } })
      const out = await api<{ payment: Payment; me: Me }>(`/payments/${order.order}/complete`, { method: 'POST', body: { outcome } })
      setMe(out.me)
      invalidate('/payments')
      invalidate('/wallet')
      setResult(out.payment)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!result) {
    return (
      <div className="stack gap-16 pad narrow" style={{ paddingTop: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Confirm purchase</h1>
        <dl className="panel" style={{ margin: 0 }}>
          <div className="row between" style={{ minHeight: 44 }}><dt className="faint">Item</dt><dd style={{ margin: 0, fontWeight: 600 }}>{item}</dd></div>
          <div className="row between" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)' }}><dt className="faint">Price</dt><dd style={{ margin: 0, fontWeight: 700 }}>{amount}</dd></div>
        </dl>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>Demo checkout: nothing is charged. In the apps this step is the Google Play or App Store payment sheet. The order is recorded either way; pick how the store answers.</p>
        {error && <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>{error}</p>}
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => pay('success')}>Pay {amount}</button>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => pay('pending')}>Store says pending</button>
          <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => pay('failed')}>Store declines</button>
        </div>
      </div>
    )
  }

  const outcome = result.status === 'Paid' ? 'success' : result.status === 'Pending' ? 'pending' : 'failed'
  const views = {
    success: { icon: 'check', bg: 'var(--accent-soft)', fg: 'var(--accent)', title: pack ? `${pack.coins + pack.bonus} coins added` : `Welcome to VIP ${plan!.name}`, body: plan ? 'Every episode is unlocked. Enjoy.' : 'Your balance is updated. Enjoy the next episode.', primary: 'Back to watching', href: safeBack, secondary: 'View coin records', href2: '/wallet/' },
    pending: { icon: 'more', bg: '#1E2533', fg: 'var(--info)', title: 'Payment pending', body: "Your store is still confirming this payment. It's added the moment it clears. You don't need to pay again.", primary: 'Keep watching', href: safeBack, secondary: 'Check status in Wallet', href2: '/wallet/' },
    failed: { icon: 'close', bg: '#2B1A1E', fg: 'var(--bad)', title: "Payment didn't go through", body: 'You were not charged. Check your payment method and try again.', primary: 'Try again', href: '', secondary: 'Get help', href2: '/help/' },
  }[outcome]

  return (
    <div className="stack gap-24 pad narrow" style={{ paddingTop: 24 }} role="status">
      <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="icon-circle" style={{ width: 80, height: 80, borderRadius: 40, background: views.bg, color: views.fg }}><Icon name={views.icon} size={36} width={2.6} /></div>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800 }}>{views.title}</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5, maxWidth: 360 }}>{views.body}</p>
      </div>
      <dl style={{ margin: 0 }}>
        {[['Item', item], ['Amount', amount], ['Date', fmtStamp(result.at)], ['Order', result.order]].map(([k, v]) => (
          <div key={k} className="row between" style={{ minHeight: 46, borderBottom: '1px solid var(--surface)', fontSize: 14 }}><dt className="faint">{k}</dt><dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd></div>
        ))}
      </dl>
      <div className="stack gap-8">
        {views.href ? <Link href={views.href} className="btn btn-primary btn-block">{views.primary}</Link>
          : <button type="button" className="btn btn-primary btn-block" onClick={() => setResult(null)}>{views.primary}</button>}
        <Link href={views.href2} className="btn btn-ghost btn-block">{views.secondary}</Link>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <AppShell tabs={false}>
      <TopBar title="Payment" back="/store/" />
      <RequireSignIn>
        <Suspense fallback={<LoadState />}><Checkout /></Suspense>
      </RequireSignIn>
    </AppShell>
  )
}
