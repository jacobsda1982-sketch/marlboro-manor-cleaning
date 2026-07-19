import { useState } from 'react'
import { ArrowRight, BadgeCheck, CalendarCheck, Check, HeartHandshake, Home, ShieldCheck, Sparkles } from 'lucide-react'
import Header from './components/Header'
import QuoteModal from './components/QuoteModal'
import { pricing, services, site } from './data/site'

const faqs = [
  ['Do you provide supplies and equipment?', 'Our standard plan is to provide the routine supplies and equipment needed for the agreed service. Special surfaces or customer-requested products should be discussed in advance.'],
  ['Do I need to be home?', 'No. We can confirm a secure access plan before the appointment.'],
  ['How is the final price determined?', 'Pricing is based on home size, layout, condition, frequency, requested scope, and add-ons. We confirm your final price before work begins.'],
  ['What is not included?', 'At launch, we do not provide hazardous-material cleanup, mold remediation, pest cleanup, hoarding cleanup, junk hauling, exterior window cleaning, or carpet extraction.'],
  ['What if something was missed?', 'Contact us within 24 hours with details and photos where possible. We will review the concern and, when appropriate, arrange a correction of the affected area.']
]

export default function App() {
  const [quoteOpen, setQuoteOpen] = useState(false)
  return (
    <>
      <Header onQuote={() => setQuoteOpen(true)} />
      <main id="top">
        <section className="hero">
          <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Premium residential cleaning</p>
              <h1>Come home to <em>immaculate.</em></h1>
              <p className="hero-lede">Thoughtful, dependable home cleaning for discerning households throughout Prince George’s County.</p>
              <div className="hero-actions">
                <button className="button button-gold" onClick={() => setQuoteOpen(true)}>Request a Free Quote <ArrowRight size={18}/></button>
                <a className="button button-ghost" href="#services">Explore Services</a>
              </div>
              <div className="hero-proof">
                <span><ShieldCheck/> Clear scope</span><span><CalendarCheck/> Reliable scheduling</span><span><HeartHandshake/> Satisfaction focused</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="image-frame"><img src="/images/brand-collage.png" alt="Marlboro Manor Cleaning concept collage" /></div>
              <div className="floating-card"><Sparkles/><div><strong>Detail that feels different</strong><small>Refined service. Clear communication.</small></div></div>
            </div>
          </div>
        </section>

        <section className="brand-strip"><div className="container strip-grid">
          <span>Upper Marlboro</span><span>Bowie</span><span>Largo</span><span>Clinton</span><span>Mitchellville</span>
        </div></section>

        <section id="services" className="section">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">Signature services</p><h2>A tailored clean for every chapter of home life.</h2></div>
              <p>Choose recurring maintenance, a detailed reset, or a transition clean. Every quote is confirmed before work begins.</p>
            </div>
            <div className="service-grid">
              {services.map((service, index) => (
                <article className={`service-card ${index===1?'featured':''}`} key={service.name}>
                  <div className="service-icon">{index===0?<Home/>:index===1?<Sparkles/>:<BadgeCheck/>}</div>
                  <p className="eyebrow">{service.eyebrow}</p><h3>{service.name}</h3><p>{service.description}</p>
                  <strong className="service-price">{service.price}</strong>
                  <ul>{service.features.map(x=><li key={x}><Check size={17}/>{x}</li>)}</ul>
                  <button className="text-link" onClick={() => setQuoteOpen(true)}>Request this service <ArrowRight size={16}/></button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why-us" className="section section-dark">
          <div className="container story-grid">
            <div className="story-image"><img src="/images/logo-concept.png" alt="Marlboro Manor Cleaning logo concept" /></div>
            <div>
              <p className="eyebrow">The manor standard</p>
              <h2>Designed around care, consistency, and trust.</h2>
              <p>We created Marlboro Manor Cleaning to give local households a polished experience from the first inquiry to the final walkthrough.</p>
              <div className="value-list">
                <div><ShieldCheck/><span><strong>Clear expectations</strong><small>Scope, timing, and pricing confirmed before service.</small></span></div>
                <div><Sparkles/><span><strong>Thoughtful detail</strong><small>A refined checklist built around the way you live.</small></span></div>
                <div><HeartHandshake/><span><strong>Respectful service</strong><small>Careful communication and respect for your home.</small></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section process-section">
          <div className="container">
            <div className="section-heading centered"><div><p className="eyebrow">Simple by design</p><h2>From quote to clean in three easy steps.</h2></div></div>
            <div className="process-grid">
              {[['01','Tell us about your home','Share the service, size, condition, timing, and priorities.'],['02','Receive a clear quote','We confirm the scope, add-ons, assumptions, and price.'],['03','Enjoy your refreshed space','We complete the agreed checklist and invite your feedback.']].map(x=><div className="process-card" key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></div>)}
            </div>
          </div>
        </section>

        <section id="pricing" className="section section-soft">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">Launch pricing</p><h2>Transparent starting rates.</h2></div>
              <p>Final quotes reflect size, condition, layout, frequency, access, and selected add-ons.</p>
            </div>
            <div className="pricing-shell">
              <div className="table-scroll"><table><thead><tr><th>Home size</th><th>One-time</th><th>Every 4 weeks</th><th>Biweekly</th><th>Weekly</th></tr></thead><tbody>
                {pricing.map(row=><tr key={row[0]}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}
              </tbody></table></div>
              <div className="pricing-note"><strong>Minimum service charge: $150</strong><span>Deep cleaning begins at $275. Move-in / move-out cleaning begins at $295.</span></div>
            </div>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container faq-grid">
            <div><p className="eyebrow">Questions, answered</p><h2>Everything you need to feel prepared.</h2><p>Still wondering about something? Email us and we will be happy to help.</p><a className="button button-outline" href={`mailto:${site.email}`}>Email Us</a></div>
            <div>{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
          </div>
        </section>

        <section className="section"><div className="container final-cta">
          <div><p className="eyebrow">Your cleaner home starts here</p><h2>Let us create a service plan for your home.</h2><p>{site.serviceArea}.</p></div>
          <button className="button button-gold" onClick={() => setQuoteOpen(true)}>Request a Free Quote <ArrowRight size={18}/></button>
        </div></section>
      </main>

      <footer id="contact" className="footer">
        <div className="container footer-grid">
          <div><div className="brand footer-brand"><span className="brand-emblem">MM</span><span className="brand-copy"><strong>Marlboro Manor</strong><small>Cleaning</small></span></div><p>Dependable residential cleaning with thoughtful attention to detail.</p></div>
          <div><h4>Services</h4><a href="#services">Maintenance Cleaning</a><a href="#services">Detail Cleaning</a><a href="#services">Move-In / Move-Out</a></div>
          <div><h4>Contact</h4><a href={`mailto:${site.email}`}>{site.email}</a><a href={`mailto:${site.quotesEmail}`}>{site.quotesEmail}</a><p>{site.hours}</p></div>
        </div>
        <div className="container footer-bottom">© {new Date().getFullYear()} {site.name}. All rights reserved. <span>Concept site — replace generated imagery with authentic photos before major advertising.</span></div>
      </footer>
      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  )
}
