import { services } from './config.js'

const servicePages = services.map(service => ({
  path: `/services/${service.slug}/`,
  title: `${service.name} in Prince George’s County`,
  description: `${service.summary} Request a reviewed estimate from Marlboro Manor Cleaning.`,
  eyebrow: 'Residential cleaning service',
  h1: service.name,
  intro: service.summary,
  sections: [
    ['What this service includes', service.includes],
    ['A clear, reviewed scope', ['Tell us about the home, condition, access, and priorities.', 'We prepare an estimate based on the details you provide.', 'A team member reviews the scope and price before anything is sent.']],
    ['What affects your estimate', ['Home size and layout', 'Current condition and buildup', 'Bathrooms, floors, access, frequency, and add-ons']]
  ],
  price: service.price
}))

const locationCopy = {
  'upper-marlboro': ['Upper Marlboro', 'Homes in and around Upper Marlboro are at the center of our service area. We review the full address for every request before confirming availability.', 'Large floor plans, multiple levels, finished basements, and longer driveways can affect timing and scope.'],
  bowie: ['Bowie', 'We serve qualifying Bowie addresses within our approved radius and confirm travel distance through the quote portal.', 'Bowie homes vary widely in age, layout, and square footage, so estimates are based on the property rather than a one-size price.'],
  mitchellville: ['Mitchellville', 'Marlboro Manor Cleaning provides reviewed residential cleaning estimates for qualifying Mitchellville homes.', 'Detailed first visits can establish a clear baseline before moving to a recurring maintenance schedule.'],
  largo: ['Largo', 'Largo homeowners can request recurring, detail, and move-related cleaning through our address-verified quote process.', 'Access instructions, parking, building rules, and elevator timing should be included when relevant.'],
  clinton: ['Clinton', 'We review Clinton addresses individually against our 25-mile service radius before preparing an estimate.', 'Home condition, finished space, pets, and selected add-ons help determine a realistic service scope.']
}

const locationPages = Object.entries(locationCopy).map(([slug, [name, intro, detail]]) => ({
  path: `/service-areas/${slug}/`,
  title: `Residential Cleaning in ${name}, MD`,
  description: `Request a reviewed residential cleaning estimate for qualifying homes in ${name}, Maryland.`,
  eyebrow: 'Service area',
  h1: `Home cleaning in ${name}, Maryland`,
  intro,
  sections: [
    [`Cleaning services available in ${name}`, ['Recurring maintenance cleaning', 'Detailed first-time or seasonal cleaning', 'Move-in and move-out cleaning']],
    ['Local quote considerations', [detail, 'Every address is checked before the request enters the private quote workflow.', 'Submitting a request does not guarantee availability or reserve a date.']],
    [`Common ${name} question`, [`How do I know whether my address qualifies? Enter the full property address in the quote portal. It measures the address against the approved service radius before accepting the request.`]]
  ]
}))

const policyNotice = 'Draft policy for customer review. This content is not legal advice and should receive professional review before publication as final terms.'

export const pages = [
  { path: '/', title: 'Premium Home Cleaning in Upper Marlboro, MD', description: 'Recurring, detail, and move-related residential cleaning with clear communication and reviewed estimates.', eyebrow: 'Locally owned residential cleaning', h1: 'Come Home to Immaculate.', intro: 'Recurring, detailed, and move-related home cleaning delivered with exceptional care and dependable communication.', home: true },
  { path: '/services/', title: 'Residential Cleaning Services', description: 'Compare recurring maintenance, detail, move-in, and move-out cleaning services.', eyebrow: 'Services', h1: 'A thoughtful clean for every chapter of home life.', intro: 'Choose the service that best matches your home and priorities. Every estimate is reviewed before it is sent.', services: true },
  ...servicePages,
  { path: '/pricing/', title: 'Cleaning Prices and Quote Expectations', description: 'Review starting prices and the factors used to prepare a confirmed residential cleaning estimate.', eyebrow: 'Pricing', h1: 'Clear starting prices. A quote tailored to your home.', intro: 'Starting prices help set expectations while your confirmed quote reflects the actual property and requested scope.', pricing: true },
  { path: '/about/', title: 'About Marlboro Manor Cleaning', description: 'Learn how Marlboro Manor Cleaning approaches residential service, communication, and quality.', eyebrow: 'About', h1: 'Local care supported by dependable systems.', intro: 'Marlboro Manor Cleaning was created to give homeowners a polished experience from the first inquiry through the final walkthrough.', sections: [['Our operating principles', ['Clear expectations before service', 'Documented scope and careful communication', 'Owner-reviewed estimates rather than automatic promises']], ['What we will not claim', ['We do not publish unverified certifications, insurance claims, reviews, employee profiles, or project results.', 'Operational proof will be added only when it is authentic, permissioned, and documented.']]] },
  { path: '/quote/', title: 'Request a Home Cleaning Estimate', description: 'Open the secure Marlboro Manor Cleaning quote portal to request a reviewed residential cleaning estimate.', eyebrow: 'Request an estimate', h1: 'Tell us about your home.', intro: 'The secure five-step quote portal verifies the service-area address and collects the details needed to prepare an estimate.', quote: true },
  { path: '/faq/', title: 'Residential Cleaning FAQ', description: 'Answers about estimates, supplies, access, service scope, pricing, and scheduling.', eyebrow: 'Frequently asked questions', h1: 'Helpful answers before you request an estimate.', intro: 'If your question is not covered here, email us and we will be happy to clarify.', faq: true },
  { path: '/contact/', title: 'Contact Marlboro Manor Cleaning', description: 'Contact Marlboro Manor Cleaning about residential cleaning in the Upper Marlboro service area.', eyebrow: 'Contact', h1: 'How can we help?', intro: 'Use the quote portal for a new estimate or email us with a general question.', contact: true },
  ...locationPages,
  { path: '/privacy/', title: 'Privacy Policy', description: 'Draft privacy policy for the Marlboro Manor Cleaning website and quote portal.', eyebrow: 'Policy draft', h1: 'Privacy policy', intro: policyNotice, sections: [['Information handled by this website', ['This marketing website does not directly collect quote form data.', 'Quote requests are handled by the separate Marble Quote Portal and its configured Google Workspace services.', 'No advertising or analytics trackers are enabled by default.']], ['Contact and retention', ['Contact us to ask about information associated with a quote request.', 'Retention practices should be reviewed and approved before this draft becomes final.']]] },
  { path: '/terms/', title: 'Website and Service Terms', description: 'Draft terms governing use of the Marlboro Manor Cleaning website and estimate process.', eyebrow: 'Policy draft', h1: 'Website and service terms', intro: policyNotice, sections: [['Estimate requests', ['Submitting information does not create an appointment, guarantee availability, or authorize a charge.', 'A quote becomes actionable only after owner review and customer communication.']], ['Website information', ['Starting prices and service descriptions may change.', 'Final scope and price are confirmed separately before work begins.']]] },
  { path: '/cancellation-policy/', title: 'Cancellation Policy', description: 'Draft cancellation and access policy for Marlboro Manor Cleaning customers.', eyebrow: 'Policy draft', h1: 'Cancellation policy', intro: policyNotice, sections: [['Notice and access', ['We request at least 48 hours notice when plans change.', 'Late cancellation, lockout, or no-access fees may apply only when disclosed and agreed in advance.']], ['Date changes', ['Contact us as soon as possible to discuss rescheduling.', 'Availability for a replacement date is not guaranteed.']]] },
  { path: '/satisfaction-policy/', title: 'Satisfaction Response Policy', description: 'Draft process for reporting service concerns to Marlboro Manor Cleaning.', eyebrow: 'Policy draft', h1: 'Satisfaction response policy', intro: policyNotice, sections: [['Report a concern', ['Contact us within 24 hours with details and photos where practical.', 'We will review the agreed scope and the affected area before proposing a response.']], ['Fair review', ['This draft does not promise a specific remedy in every circumstance.', 'Any approved remedy applies to the documented service concern.']]] },
  { path: '/accessibility/', title: 'Accessibility Statement', description: 'Accessibility commitment and assistance contact for Marlboro Manor Cleaning.', eyebrow: 'Accessibility', h1: 'A website designed for more people.', intro: 'We aim for WCAG 2.2 AA and continually improve keyboard use, contrast, reflow, semantics, and assistive-technology support.', sections: [['Need assistance?', ['Email hello@marlboromanorcleaning.com and describe the page, task, and format that would help.', 'We welcome specific feedback and will review accessibility barriers promptly.']]] },
  { path: '/404.html', title: 'Page Not Found', description: 'The requested Marlboro Manor Cleaning page could not be found.', eyebrow: '404', h1: 'That page is not here.', intro: 'The address may have changed. Return home, explore services, or request an estimate.', notFound: true }
]
