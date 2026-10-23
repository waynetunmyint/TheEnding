'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AppShell, TopBar } from '@/components/shell'
import { Icon } from '@/components/ui'
import { COIN_PACKS, VIP_PLANS } from '@/data/dummy'
import { addCoins, addDays, nowStamp, update } from '@/lib/demo-store'

type Outcome = 'success' | 'pending' | 'failed'

function Checkout() {
  const params = useSearchParams()
  const pack = COIN_PACKS.find((p) => p.id === params.get('pack'))
  const plan = VIP_PLANS.find((p) => p.id === params.get('plan'))
  const back = params.get('return') ?? '/store/'
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/store/'
  const preset = params.get('view') as Outcome | null
  const [outcome, setOutcome] = useState<Outcome | null>(preset && ['success', 'pending', 'failed'].includes(preset) ? preset : null)
  const [stamp, setStamp] = useState('')

  const item = pack ? `${pack.coins + pack.bonus} coins${pack.bonus ? ` (${pack.coins} + ${pack.bonus} bonus)` : ''}` : plan ? `VIP ${plan.name}` : '550 coins (500 + 50 bonus)'
  const price = pack?.price ?? plan?.price ?? '$4.99'

  const pay = (o: Outcome) => {
    setStamp(nowStamp())
    if (o === 'success') {
      if (pack) addCoins(pack.coins + pack.bonus, `Bought ${pack.coins + pack.bonus} coins`)
      if (plan) update((s) => ({ ...s, vip: { plan: plan.name, renews: addDays(plan.days) } }))
    }
    setOutcome(o)
  }

  if (!outcome) {
    return (
      <div className="stack gap-16 pad narrow" style={{ paddingTop: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Confirm purchase</h1>
        <dl className="panel" style={{ margin: 0 }}>
          <div className="row between" style={{ minHeight: 44 }}><dt className="faint">Item</dt><dd style={{ margin: 0, fontWeight: 600 }}>{item}</dd></div>
          <div className="row between" style={{ minHeight: 44, borderTop: '1px solid var(--surface-2)' }}><dt className="faint">Price</dt><dd style={{ margin: 0, fontWeight: 700 }}>{price}</dd></div>
        </dl>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>Demo checkout: nothing is charged. In the apps this step is the Google Play or App Store payment sheet. Pick an outcome to see each result screen.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => pay('success')}>Pay {price}</button>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pay('pending')}>Simulate pending</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pay('failed')}>Simulate failure</button>
        </div>
      </div>
    )
  }

  const views = {
    success: { icon: 'check', bg: 'var(--accent-soft)', fg: 'var(--accent)', title: pack ? `${pack.coins + pack.bonus} coins added` : plan ? `Welcome to VIP ${plan.name}` : 'Payment complete', body: plan ? 'Every episode is unlocked. Enjoy.' : 'Your balance is updated. Enjoy the next episode.', primary: 'Back to watching', href: safeBack, secondary: 'View coin records', href2: '/wallet/' },
    pending: { icon: 'more', bg: '#1E2533', fg: 'var(--info)', title: 'Payment pending', body: "Your store is still confirming this payment. Coins are added the moment it clears. You don't need to pay again.", primary: 'Keep watching', href: '/', secondary: 'Check status in Wallet', href2: '/wallet/' },
    failed: { icon: 'close', bg: '#2B1A1E', fg: 'var(--bad)', title: "Payment didn't go through", body: 'You were not charged. Check your payment method in Google Play or the App Store and try again.', primary: 'Try again', href: `/payment/?${params.toString().replace(/(^|&)view=[^&]*/, '')}`, secondary: 'Get help', href2: '/help/' },
  }[outcome]

  return (
    <div className="stack gap-24 pad narrow" style={{ paddingTop: 24 }} role="status">
      <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="icon-circle" style={{ width: 80, height: 80, borderRadius: 40, background: views.bg, color: views.fg }}><Icon name={views.icon} size={36} width={2.6} /></div>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800 }}>{views.title}</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5, maxWidth: 360 }}>{views.body}</p>
      </div>
      <dl style={{ margin: 0 }}>
        {[['Item', item], ['Amount', price], ['Date', stamp || nowStamp()], ...(outcome === 'failed' ? [] : [['Order', 'DEMO-0000-0001']])].map(([k, v]) => (
          <div key={k} className="row between" style={{ minHeight: 46, borderBottom: '1px solid var(--surface)', fontSize: 14 }}><dt className="faint">{k}</dt><dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd></div>
        ))}
      </dl>
      <div className="stack gap-8">
        <Link href={views.href} className="btn btn-primary btn-block">{views.primary}</Link>
        <Link href={views.href2} className="btn btn-ghost btn-block">{views.secondary}</Link>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <AppShell tabs={false}>
      <TopBar title="Payment" back="/store/" />
      <Suspense fallback={<div className="empty"><div className="spinner" /></div>}><Checkout /></Suspense>
    </AppShell>
  )
}
