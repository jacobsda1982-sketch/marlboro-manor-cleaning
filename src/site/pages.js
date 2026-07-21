import { services } from './config.js'

const servicePages = services.map(service => ({
  path: `/services/${service.slug}/`,
  title: `${service.searchName} in Upper Marlboro, MD`,
  description: `${service.summary} Request a personalized estimate from Marlboro Manor Cleaning.`,
  eyebrow: 'Residential cleaning service',
  h1: `${service.searchName} with manor-level care.`,
  intro: service.summary,
  service,
  sections: [
    ['What is included', service.includes],
    ['A clear path from estimate to service', ['Tell us about the home, access, priorities, and preferred timing.', 'We review the requested scope and prepare a personalized estimate.', 'You approve the scope and scheduling plan before service begins.']],
    ['What affects the estimate', ['Home size, layout, and number of levels', 'Current condition, buildup, pets, and specialty surfaces', 'Bathrooms, access, service frequency, and selected add-ons']]
  ],
  price: service.price
}))

const locationCopy = {
  'upper-marlboro': {
    name: 'Upper Marlboro',
    title: 'Upper Marlboro House Cleaning Services',
    intro: 'Marlboro Manor Cleaning provides recurring, detailed, and move-related residential cleaning for qualifying homes throughout Upper Marlboro.',
    local: ['BeechTree, Marlton, Perrywood, Brock Hall, and surrounding communities', 'Large floor plans, finished basements, multiple levels, and pet hair can affect service time', 'Our quote form verifies each full address within the standard 25-mile service area'],
    faq: 'Enter the complete Upper Marlboro property address in the estimate form. The service-area check occurs before submission.'
  },
  bowie: {
    name: 'Bowie', title: 'House Cleaning in Bowie, MD',
    intro: 'Bowie homeowners can request dependable recurring service, a detailed reset, or move-related cleaning through Marlboro Manor Cleaning.',
    local: ['Serving qualifying addresses across established Bowie neighborhoods and newer communities', 'Home age, finished space, parking, and layout are considered in every estimate', 'Recurring service can follow a detail clean when the home needs a stronger starting baseline'],
    faq: 'Yes, qualifying Bowie addresses inside the service radius are welcome. Availability is confirmed with the estimate.'
  },
  mitchellville: {
    name: 'Mitchellville', title: 'House Cleaning in Mitchellville, MD',
    intro: 'Marlboro Manor Cleaning offers thoughtful residential cleaning for qualifying Mitchellville homes, with clear scopes and dependable communication.',
    local: ['Recurring maintenance for busy households', 'Detail cleaning for first visits, seasonal resets, or accumulated buildup', 'Move-in and move-out cleaning for vacant properties'],
    faq: 'Many recurring customers begin with a Manor Detail Clean when the home has not been professionally maintained recently.'
  },
  largo: {
    name: 'Largo', title: 'House Cleaning in Largo, MD',
    intro: 'Largo residents can request recurring, detail, move-in, and move-out cleaning for qualifying homes and residences.',
    local: ['Building access, parking instructions, elevators, and concierge requirements should be shared in advance', 'The estimate accounts for bathrooms, finished space, condition, and selected add-ons', 'Every appointment is confirmed before a service date is reserved'],
    faq: 'Yes. Include parking, elevator, building-entry, and concierge instructions when requesting an estimate.'
  },
  clinton: {
    name: 'Clinton', title: 'House Cleaning in Clinton, MD',
    intro: 'Marlboro Manor Cleaning serves qualifying Clinton homes with recurring care, detailed cleaning, and move-related services.',
    local: ['Full addresses are verified against the standard service radius', 'Finished basements, pets, specialty surfaces, and current condition should be disclosed', 'A personalized estimate defines the scope before scheduling'],
    faq: 'Submit the full property address. Homes within the service radius proceed to estimate review and availability confirmation.'
  }
}

const locationPages = Object.entries(locationCopy).map(([slug, item]) => ({
  path: `/service-areas/${slug}/`,
  title: item.title,
  description: `Residential cleaning in ${item.name}, Maryland. Explore recurring, deep, move-in, and move-out services and request an estimate.`,
  eyebrow: 'Prince George\'s County service area',
  h1: item.title,
  intro: item.intro,
  location: item.name,
  sections: [
    [`Cleaning services available in ${item.name}`, ['Recurring house cleaning', 'Detailed and first-time cleaning', 'Move-in and move-out cleaning']],
    [`What ${item.name} homeowners should know`, item.local],
    [`A common ${item.name} question`, [item.faq]]
  ]
}))

export const pages = [
  { path: '/', title: 'House Cleaning in Upper Marlboro, MD', description: 'Premium recurring, deep, move-in, and move-out house cleaning in Upper Marlboro and nearby Prince George\'s County communities.', eyebrow: 'Local residential cleaning', h1: 'Come Home to Immaculate.', intro: 'Premium house cleaning in Upper Marlboro, delivered with thoughtful care, dependable communication, and a scope tailored to your home.', home: true },
  { path: '/services/', title: 'Residential Cleaning Services in Upper Marlboro', description: 'Compare recurring, deep, move-in, and move-out cleaning services from Marlboro Manor Cleaning.', eyebrow: 'Residential cleaning services', h1: 'A thoughtful clean for every chapter of home life.', intro: 'Choose recurring care, a detailed reset, or move-related service. We tailor the scope to the home and confirm the plan before work begins.', services: true },
  ...servicePages,
  { path: '/pricing/', title: 'House Cleaning Prices in Upper Marlboro', description: 'Review starting house-cleaning prices and the factors used to prepare your personalized Marlboro Manor Cleaning estimate.', eyebrow: 'Clear pricing expectations', h1: 'Starting prices with no mystery about the next step.', intro: 'Use our starting prices to plan, then tell us about the home for a personalized estimate.', pricing: true },
  { path: '/about/', title: 'About Marlboro Manor Cleaning', description: 'Meet the locally owned Upper Marlboro cleaning company focused on white-glove care, communication, and reliable systems.', eyebrow: 'Locally owned in Upper Marlboro', h1: 'White-glove care, grounded in the community.', intro: 'Marlboro Manor Cleaning was created to give local homeowners a polished, dependable experience from the first inquiry through the final walkthrough.', sections: [['Our service principles', ['Respect the home, the customer, and the agreed scope', 'Communicate clearly before, during, and after service', 'Use documented checklists and quality controls for consistency']], ['A modern local company', ['Thoughtful automation keeps communication responsive and overhead lean', 'People remain accountable for service quality and customer relationships', 'Claims, reviews, and results are published only when they are authentic and permissioned']]] },
  { path: '/quote/', title: 'Request a House Cleaning Estimate', description: 'Request a personalized house-cleaning estimate for a qualifying property in the Marlboro Manor Cleaning service area.', eyebrow: 'Takes about five minutes', h1: 'Tell us about your home.', intro: 'Share the property and service details once. We will verify the address, review the scope, and follow up with your estimate.', quote: true },
  { path: '/schedule/', title: 'Choose Your Cleaning Appointment', description: 'Securely confirm or select an available Marlboro Manor Cleaning appointment.', eyebrow: 'Secure appointment selection', h1: 'Choose your cleaning time.', intro: 'Confirm the proposed appointment or select another available option. We will verify the calendar and email your final confirmation.', scheduling: true, noindex: true },
  { path: '/faq/', title: 'House Cleaning FAQ', description: 'Answers about Marlboro Manor Cleaning estimates, access, scope, pricing, scheduling, pets, and service areas.', eyebrow: 'Frequently asked questions', h1: 'Helpful answers before your first cleaning.', intro: 'Learn how estimates, scheduling, access, pricing, and service scope work.', faq: true },
  { path: '/contact/', title: 'Contact Marlboro Manor Cleaning', description: 'Contact Marlboro Manor Cleaning about residential cleaning in Upper Marlboro and nearby communities.', eyebrow: 'We are here to help', h1: 'Start with the right conversation.', intro: 'Request an estimate for a new cleaning or email us with a general service question.', contact: true },
  ...locationPages,
  { path: '/privacy/', title: 'Privacy Policy', description: 'How Marlboro Manor Cleaning handles website, estimate, and customer information.', eyebrow: 'Customer information', h1: 'Privacy policy', intro: 'Last updated July 20, 2026. This policy explains the information used to prepare estimates, communicate with customers, and operate the website.', sections: [['Information we collect and use', ['Estimate requests may include contact, property, service, access, and optional photo information.', 'We use this information to verify service eligibility, prepare estimates, schedule work, communicate, and maintain business records.', 'Payment information is handled by the designated payment processor and is not stored in this marketing website.']], ['Retention and requests', ['Business records are retained only as reasonably needed for operations, accounting, security, and legal obligations.', 'Email hello@marlboromanorcleaning.com to ask about information associated with your request.', 'Analytics are enabled only when configured and are used to understand website and estimate-form performance.']]] },
  { path: '/terms/', title: 'Website and Service Terms', description: 'Terms governing Marlboro Manor Cleaning website use, estimates, scheduling, and service information.', eyebrow: 'Clear expectations', h1: 'Website and service terms', intro: 'Last updated July 20, 2026. These terms describe the estimate and scheduling process.', sections: [['Estimate requests', ['Submitting information does not create an appointment, guarantee availability, or authorize a charge.', 'The final service scope, price, and date are confirmed separately before work begins.', 'Starting prices and service descriptions may change until an estimate is accepted.']], ['Appropriate website use', ['Do not submit false, harmful, or unauthorized information.', 'Automated abuse, scraping, interference, and attempts to bypass service-area or security controls are prohibited.']]] },
  { path: '/cancellation-policy/', title: 'Cancellation and Rescheduling Policy', description: 'Marlboro Manor Cleaning cancellation, rescheduling, lockout, and property-access expectations.', eyebrow: 'Plans sometimes change', h1: 'Cancellation and rescheduling policy', intro: 'Please provide at least 48 hours notice when an appointment needs to change.', sections: [['Notice and property access', ['Contact us as soon as possible to request a new date.', 'Replacement dates depend on availability and are not guaranteed.', 'Any late-cancellation, lockout, or no-access fee will be disclosed before the appointment and reflected in the accepted service terms.']], ['Exceptional circumstances', ['We review emergencies, severe weather, and documented exceptional circumstances fairly.', 'Marlboro Manor Cleaning may reschedule when safe or effective service is not reasonably possible.']]] },
  { path: '/satisfaction-policy/', title: 'Satisfaction Response Policy', description: 'How Marlboro Manor Cleaning reviews and responds to documented service concerns.', eyebrow: 'A fair response process', h1: 'Satisfaction response policy', intro: 'If something within the agreed scope was missed, contact us within 24 hours so we can review it promptly.', sections: [['Report a concern', ['Email details and photos where practical within 24 hours of service.', 'We compare the concern with the accepted scope, checklist, and available service records.', 'When appropriate, we will propose a reasonable correction or other response.']], ['Policy limits', ['The policy applies to the documented service concern and accepted scope.', 'It does not cover pre-existing damage, excluded work, inaccessible areas, or conditions that changed after service.']]] },
  { path: '/accessibility/', title: 'Accessibility Statement', description: 'Marlboro Manor Cleaning website accessibility commitment and assistance contact.', eyebrow: 'Access for more people', h1: 'A website designed to work for more customers.', intro: 'We target WCAG 2.2 AA and continually improve keyboard access, contrast, reflow, labels, and assistive-technology support.', sections: [['Need assistance?', ['Email hello@marlboromanorcleaning.com and describe the page, task, and format that would help.', 'We welcome specific feedback and review reported accessibility barriers promptly.']]] },
  { path: '/404.html', title: 'Page Not Found', description: 'The requested Marlboro Manor Cleaning page could not be found.', eyebrow: '404', h1: 'That page is not here.', intro: 'Return home, explore cleaning services, or request an estimate.', notFound: true }
]
