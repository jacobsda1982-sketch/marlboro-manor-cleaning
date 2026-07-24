export const business = {
  name: 'Marlboro Manor Cleaning',
  tagline: 'Come Home to Immaculate.',
  origin: 'https://marlboromanorcleaning.com',
  supportEmail: 'hello@marlboromanorcleaning.com',
  quotesEmail: 'quotes@marlboromanorcleaning.com',
  phoneE164: process.env.PUBLIC_PHONE_E164 || '+13016603005',
  phoneDisplay: process.env.PUBLIC_PHONE_DISPLAY || '(301) 660-3005',
  quotePortalUrl: '/quote/',
  schedulingPortalBackendUrl: '/api/scheduling',
  portal: {
    version: '4.0.0',
    servicePath: '/my-service/',
    appointmentPath: '/appointment/',
    paymentPath: '/payment/',
    feedbackPath: '/feedback/',
    crewPath: '/crew/',
    sessionCookieDays: 90,
    supportPhone: '(301) 660-3005',
    schedulingEmail: 'scheduling@marlboromanorcleaning.com',
    billingEmail: 'billing@marlboromanorcleaning.com'
  },
  googleBusinessProfileUrl: process.env.PUBLIC_GOOGLE_BUSINESS_PROFILE_URL || '',
  analyticsId: process.env.PUBLIC_GA_MEASUREMENT_ID || '',
  testContentEnabled: false,
  serviceRadiusMiles: 25,
  areas: ['Upper Marlboro', 'Bowie', 'Mitchellville', 'Largo', 'Clinton'],
  hours: 'Monday-Friday 8:00 AM-6:00 PM | Saturday 9:00 AM-3:00 PM | Sunday closed',
  insurance: {
    certificateVerified: true,
    carrier: 'Next Insurance US Company',
    effectiveAt: '2026-07-24T00:00:00-04:00',
    expiresAt: '2027-07-24T00:00:00-04:00',
    eachOccurrenceLimit: 1000000,
    aggregateLimit: 2000000
  },
  claims: {
    locallyOwned: true,
    insured: process.env.PUBLIC_INSURANCE_VERIFIED === 'true',
    backgroundChecked: process.env.PUBLIC_BACKGROUND_CHECKS_VERIFIED === 'true',
    suppliesProvided: process.env.PUBLIC_SUPPLIES_PROVIDED_VERIFIED === 'true'
  }
}

export const services = [
  { code: 'MMC-MAINT', slug: 'maintenance-cleaning', name: 'Manor Maintenance Clean', searchName: 'Recurring House Cleaning', price: '$150', summary: 'Dependable weekly, biweekly, or every-four-week care for homes already in maintained condition.', includes: ['Kitchen and bathroom refresh', 'Reachable surface dusting', 'Vacuuming and hard-floor care', 'Trash removal and room reset'] },
  { code: 'MMC-DETAIL', slug: 'detail-cleaning', name: 'Manor Detail Clean', searchName: 'Deep House Cleaning', price: '$275', summary: 'A more thorough first visit or seasonal reset with added attention to buildup, edges, and frequently missed details.', includes: ['Maintenance cleaning scope', 'Baseboards and door frames', 'Cabinet fronts and fixture detail', 'Shower tracks and floor edges'] },
  { code: 'MMC-MOVEIN', slug: 'move-in-cleaning', name: 'Move-In Cleaning', searchName: 'Move-In Cleaning', price: '$295', summary: 'Detailed vacant-home preparation before furniture and belongings arrive.', includes: ['Detailed room cleaning', 'Inside empty cabinets and drawers', 'Closets and empty shelving', 'Appliance interiors available as add-ons'] },
  { code: 'MMC-MOVEOUT', slug: 'move-out-cleaning', name: 'Move-Out Cleaning', searchName: 'Move-Out Cleaning', price: '$295', summary: 'Vacant-home cleaning designed for handoff, listing preparation, and the final walkthrough.', includes: ['Detailed room cleaning', 'Inside empty cabinets and drawers', 'Closets and empty shelving', 'Appliance interiors available as add-ons'] }
]

export const pricingDisclaimer = 'Starting prices apply to homes in average condition. Your confirmed estimate reflects the home size, layout, condition, bathrooms, access, frequency, and selected add-ons.'
