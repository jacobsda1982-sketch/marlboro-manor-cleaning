import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { site } from '../data/site'

export default function Header({ onQuote }) {
  const [open, setOpen] = useState(false)
  const links = [
    ['Services', '#services'],
    ['Why Us', '#why-us'],
    ['Pricing', '#pricing'],
    ['Quote Portal', site.quotePortalUrl],
    ['FAQ', '#faq'],
    ['Contact', '#contact']
  ]
  return (
    <header className="site-header">
      <div className="container nav-shell">
        <a className="brand" href="#top" aria-label={`${site.name} home`}>
          <span className="brand-emblem">MM</span>
          <span className="brand-copy">
            <strong>Marlboro Manor</strong>
            <small>Cleaning</small>
          </span>
        </a>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <button className="button button-gold" onClick={() => { setOpen(false); onQuote() }}>Request a Quote</button>
        </nav>
      </div>
    </header>
  )
}
