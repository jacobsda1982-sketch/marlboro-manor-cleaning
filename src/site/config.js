export const business = {
  name: 'Marlboro Manor Cleaning',
  tagline: 'Come Home to Immaculate.',
  origin: 'https://marlboromanorcleaning.com',
  supportEmail: 'hello@marlboromanorcleaning.com',
  quotesEmail: 'quotes@marlboromanorcleaning.com',
  phoneE164: '',
  phoneDisplay: '',
  quotePortalUrl: process.env.PUBLIC_QUOTE_PORTAL_URL || 'https://script.google.com/macros/s/AKfycbwJ1V-ZHauLWg3qpIAnw8EsGiiuPnhXOFakBokqO_GUUBrTE08Rhfz44__XdZVDGbkeFA/exec',
  testContentEnabled: process.env.PUBLIC_ENABLE_TEST_CONTENT === 'true',
  googleBusinessProfileUrl: process.env.PUBLIC_GOOGLE_BUSINESS_PROFILE_URL || '',
  serviceRadiusMiles: 25,
  areas: ['Upper Marlboro', 'Bowie', 'Mitchellville', 'Largo', 'Clinton'],
  hours: 'Monday–Friday 8:00 AM–6:00 PM · Saturday 9:00 AM–3:00 PM · Sunday closed',
  claims: {
    locallyOwned: true,
    insured: process.env.PUBLIC_INSURANCE_VERIFIED === 'true',
    backgroundChecked: false,
    suppliesProvided: false
  }
}

export const services = [
  { slug: 'maintenance-cleaning', name: 'Manor Maintenance Clean', price: '$150', summary: 'Consistent recurring care for homes already in maintained condition.', includes: ['Kitchen and bathroom refresh', 'Reachable surface dusting', 'Vacuuming and hard-floor care', 'Trash removal and room reset'] },
  { slug: 'detail-cleaning', name: 'Manor Detail Clean', price: '$275', summary: 'A thorough first-visit or seasonal reset with added attention to buildup and edges.', includes: ['Maintenance cleaning scope', 'Baseboards and door frames', 'Cabinet fronts and fixture detail', 'Shower tracks and floor edges'] },
  { slug: 'move-in-cleaning', name: 'Move-In Cleaning', price: '$295', summary: 'Vacant-home preparation before belongings arrive.', includes: ['Detailed room cleaning', 'Inside empty cabinets and drawers', 'Closets and empty shelving', 'Appliance interiors available as add-ons'] },
  { slug: 'move-out-cleaning', name: 'Move-Out Cleaning', price: '$295', summary: 'Vacant-home cleaning designed for handoff and final walkthrough preparation.', includes: ['Detailed room cleaning', 'Inside empty cabinets and drawers', 'Closets and empty shelving', 'Appliance interiors available as add-ons'] }
]

export const pricingDisclaimer = 'Prices shown are starting estimates for homes in average condition. Your confirmed quote is based on size, layout, condition, bathrooms, access, frequency, and selected add-ons.'
