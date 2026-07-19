import { ArrowRight, ExternalLink, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { site } from '../data/site'

export default function QuoteModal({ open, onClose }) {
  const closeButton = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    closeButton.current?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="quote-modal quote-handoff" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title">
        <button ref={closeButton} className="modal-close" onClick={onClose} aria-label="Close quote portal dialog"><X /></button>
        <p className="eyebrow">Secure quote portal</p>
        <h2 id="quote-modal-title">Tell us about your home.</h2>
        <p className="quote-intro">
          Our five-step quote application checks your service-area address and collects the details our team needs to prepare an estimate.
        </p>
        <ul className="quote-benefits">
          <li><ShieldCheck size={20} /> Every estimate is reviewed before it is sent.</li>
          <li><ArrowRight size={20} /> Submitting does not book an appointment or charge you.</li>
        </ul>
        <a className="button button-gold quote-launch" href={site.quotePortalUrl} target="_blank" rel="noopener noreferrer">
          Open Quote Application <ExternalLink size={18} />
        </a>
        <p className="form-note">The application opens in a new secure tab operated by Marlboro Manor Cleaning.</p>
      </section>
    </div>
  )
}
