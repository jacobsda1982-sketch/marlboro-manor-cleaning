import { X, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { site } from '../data/site'

export default function QuoteModal({ open, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name:'', email:'', phone:'', zip:'', service:'', sqft:'', bedrooms:'', bathrooms:'',
    frequency:'One-time', preferredDate:'', pets:'', notes:''
  })

  useEffect(() => {
    if (!open) setStep(1)
  }, [open])

  if (!open) return null
  const update = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = e => {
    e.preventDefault()
    const subject = `Quote request: ${form.name || 'Website lead'} — ${form.service}`
    const body = Object.entries(form).map(([k,v]) => `${k}: ${v}`).join('\n')
    window.location.href = `mailto:${site.quotesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="quote-modal" role="dialog" aria-modal="true" aria-label="Request a quote">
        <button className="modal-close" onClick={onClose} aria-label="Close quote form"><X /></button>
        <div className="quote-progress"><span style={{width: `${step * 33.333}%`}} /></div>
        <p className="eyebrow">Complimentary estimate</p>
        <h2>Tell us about your home</h2>
        <form onSubmit={submit}>
          {step === 1 && <>
            <div className="field-grid">
              <label>Name<input name="name" value={form.name} onChange={update} required /></label>
              <label>Email<input type="email" name="email" value={form.email} onChange={update} required /></label>
            </div>
            <div className="field-grid">
              <label>Phone<input name="phone" value={form.phone} onChange={update} required /></label>
              <label>ZIP code<input name="zip" value={form.zip} onChange={update} required /></label>
            </div>
            <button type="button" className="button button-navy" onClick={() => setStep(2)}>Continue <ArrowRight size={18}/></button>
          </>}
          {step === 2 && <>
            <div className="field-grid">
              <label>Service<select name="service" value={form.service} onChange={update} required>
                <option value="">Choose a service</option><option>Manor Maintenance Clean</option><option>Manor Detail Clean</option><option>Move-In / Move-Out</option>
              </select></label>
              <label>Approx. square footage<input name="sqft" value={form.sqft} onChange={update} /></label>
            </div>
            <div className="field-grid">
              <label>Bedrooms<input name="bedrooms" value={form.bedrooms} onChange={update} /></label>
              <label>Bathrooms<input name="bathrooms" value={form.bathrooms} onChange={update} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setStep(1)}>Back</button><button type="button" className="button button-navy" onClick={() => setStep(3)}>Continue <ArrowRight size={18}/></button></div>
          </>}
          {step === 3 && <>
            <div className="field-grid">
              <label>Frequency<select name="frequency" value={form.frequency} onChange={update}><option>One-time</option><option>Weekly</option><option>Biweekly</option><option>Every 4 weeks</option></select></label>
              <label>Preferred date<input type="date" name="preferredDate" value={form.preferredDate} onChange={update}/></label>
            </div>
            <label>Pets or pet-hair concerns<input name="pets" value={form.pets} onChange={update}/></label>
            <label>Anything else we should know?<textarea name="notes" value={form.notes} onChange={update}/></label>
            <p className="form-note">Submitting opens your email application with the request prefilled. No form data is stored by this website.</p>
            <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setStep(2)}>Back</button><button className="button button-gold" type="submit">Prepare Quote Email</button></div>
          </>}
        </form>
      </section>
    </div>
  )
}
