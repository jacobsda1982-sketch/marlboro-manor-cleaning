function getPublicPortalConfig() {
  const cfg = getPortalConfig_();

  return {
    ok: true,
    version: MQP.VERSION,
    companyName: cfg.companyName,
    supportEmail: cfg.supportEmail,
    serviceAreaRadiusMiles:
      cfg.serviceAreaRadiusMiles,
    serviceAreaDescription:
      `${cfg.serviceAreaRadiusMiles}-mile radius of Upper Marlboro, Maryland`,
    services: [
      {
        code: 'MMC-MAINT',
        name: 'Manor Maintenance Clean',
        description:
          'Routine cleaning for homes already in maintained condition.'
      },
      {
        code: 'MMC-DETAIL',
        name: 'Manor Detail Clean',
        description:
          'A more thorough first-time or occasional cleaning.'
      },
      {
        code: 'MMC-MOVEIN',
        name: 'Move-In Clean',
        description:
          'Cleaning for a vacant home before move-in.'
      },
      {
        code: 'MMC-MOVEOUT',
        name: 'Move-Out Clean',
        description:
          'Cleaning for a vacant home after move-out.'
      }
    ],
    addOns: [
      {code: 'AO-OVEN', name: 'Inside oven'},
      {code: 'AO-FRIDGE', name: 'Inside refrigerator'},
      {code: 'AO-WINDOW', name: 'Interior windows'},
      {code: 'AO-BLINDS', name: 'Detailed blinds'},
      {code: 'AO-LAUNDRY', name: 'Laundry folding'},
      {code: 'AO-PETHAIR', name: 'Pet-hair treatment'},
      {code: 'AO-GARAGE', name: 'Garage sweep'},
      {code: 'AO-PATIO', name: 'Balcony or patio sweep'}
    ]
  };
}

function submitPortalRequest(payload) {
  const started = new Date();

  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('The form submission was empty.');
    }

    if (String(payload.website || '').trim()) {
      return {
        ok: true,
        reference:
          `MQP-${Utilities.getUuid()
            .slice(0, 8)
            .toUpperCase()}`,
        message:
          'Thank you. Your request has been received.'
      };
    }

    enforcePortalRateLimit_(payload);

    const clean = normalizePortalPayload_(payload);
    const errors = validatePortalPayload_(clean);

    if (errors.length) {
      return {
        ok: false,
        validationErrors: errors,
        error:
          'Please correct the highlighted information.'
      };
    }

    const cfg = getPortalConfig_();

    const fullAddress = [
      clean.address,
      clean.city,
      clean.state,
      clean.zip
    ].filter(Boolean).join(', ');

    let serviceArea;

    try {
      serviceArea =
        evaluateServiceArea_(fullAddress);
    } catch (geocodeError) {
      return {
        ok: false,
        code: 'ADDRESS_NOT_VERIFIED',
        validationErrors: [
          {
            field: 'address',
            message:
              'We could not verify this address. Check the street, city, state, and ZIP code.'
          }
        ],
        error:
          'We could not verify the property location. Please check the address or contact us directly.'
      };
    }

    if (!serviceArea.withinRadius) {
      return {
        ok: false,
        code: 'OUTSIDE_SERVICE_AREA',
        error:
          `This property is approximately ${serviceArea.distanceMiles.toFixed(1)} miles ` +
          `from our Upper Marlboro service-area center, outside our standard ` +
          `${cfg.serviceAreaRadiusMiles}-mile radius. ` +
          `Please contact ${cfg.supportEmail} so we can review the request.`
      };
    }

    const submissionId =
      `WEB-${Utilities.formatDate(
        started,
        Session.getScriptTimeZone(),
        'yyyyMMdd'
      )}-${Utilities.getUuid()
        .slice(0, 8)
        .toUpperCase()}`;

    const storedReference = appendPortalSubmission_({
      'Submission ID': submissionId,
      'Environment': cfg.environment,
      'Idempotency Key': clean.idempotencyKey,
      'Created At': formatPortalDate_(started),
      'Processing Status': 'NEW',
      'Source': 'WEBSITE_QUOTE_PORTAL',
      'Customer Name': clean.customerName,
      'Email': clean.email,
      'Phone': clean.phone,
      'Preferred Contact': clean.preferredContact,
      'Address': clean.address,
      'City': clean.city,
      'State': clean.state,
      'ZIP': clean.zip,
      'Geocoded Address':
        serviceArea.formattedAddress,
      'Property Latitude':
        serviceArea.latitude,
      'Property Longitude':
        serviceArea.longitude,
      'Distance Miles':
        serviceArea.distanceMiles,
      'Service Area Result':
        serviceArea.withinRadius
          ? 'WITHIN_RADIUS'
          : 'OUTSIDE_RADIUS',
      'Service Code': clean.serviceCode,
      'Square Feet': clean.squareFeet,
      'Bedrooms': clean.bedrooms,
      'Full Baths': clean.fullBaths,
      'Half Baths': clean.halfBaths,
      'Floors': clean.floors,
      'Finished Basement': clean.finishedBasement,
      'Occupied Status': clean.occupiedStatus,
      'Pets': clean.pets,
      'Pet Hair Level': clean.petHairLevel,
      'Condition': clean.condition,
      'Last Professional Clean':
        clean.lastProfessionalClean,
      'Frequency': clean.frequency,
      'Preferred Date': clean.preferredDate,
      'Add-Ons JSON':
        JSON.stringify(clean.addOns),
      'Additional Notes': clean.additionalNotes,
      'Consent': clean.consent,
      'Terms Version': 'MQP-1.0',
      'Browser Time Zone':
        clean.browserTimeZone,
      'Client Timestamp':
        clean.clientTimestamp,
      'Payload JSON':
        JSON.stringify(clean)
    });

    return {
      ok: true,
      reference: storedReference || submissionId,
      message:
        'Your quote request has been received. ' +
        'Our team will review the details before sending an estimate.'
    };

  } catch (error) {
    console.error(error);

    return {
      ok: false,
      error:
        'We could not submit your request. ' +
        'Please try again or contact us directly.'
    };
  }
}

function normalizePortalPayload_(payload) {
  const text = (value, maxLength) =>
    String(value ?? '')
      .trim()
      .slice(
        0,
        maxLength || MQP.MAX_FIELD_LENGTH
      );

  const number = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : null;
  };

  const boolean = value =>
    value === true ||
    String(value).toLowerCase() === 'true';

  const addOns =
    Array.isArray(payload.addOns)
      ? payload.addOns
          .filter(item =>
            item &&
            typeof item === 'object' &&
            text(item.code, 50)
          )
          .slice(0, 20)
          .map(item => ({
            code: text(item.code, 50),
            quantity:
              Math.max(
                1,
                Math.min(
                  100,
                  number(item.quantity) || 1
                )
              )
          }))
      : [];

  return {
    idempotencyKey:
      text(payload.idempotencyKey, 120),
    customerName:
      text(payload.customerName),
    email:
      text(payload.email).toLowerCase(),
    phone:
      text(payload.phone, 40),
    preferredContact:
      text(payload.preferredContact, 30),
    address:
      text(payload.address),
    city:
      text(payload.city),
    state:
      text(payload.state, 2).toUpperCase(),
    zip:
      text(payload.zip, 10),
    serviceCode:
      text(payload.serviceCode, 30),
    squareFeet:
      number(payload.squareFeet),
    bedrooms:
      number(payload.bedrooms),
    fullBaths:
      number(payload.fullBaths),
    halfBaths:
      number(payload.halfBaths),
    floors:
      number(payload.floors),
    finishedBasement:
      boolean(payload.finishedBasement),
    occupiedStatus:
      text(payload.occupiedStatus, 30),
    pets:
      boolean(payload.pets),
    petHairLevel:
      text(payload.petHairLevel, 30),
    condition:
      text(payload.condition, 30),
    lastProfessionalClean:
      text(payload.lastProfessionalClean, 100),
    frequency:
      text(payload.frequency, 30),
    preferredDate:
      text(payload.preferredDate, 20),
    addOns,
    additionalNotes:
      text(
        payload.additionalNotes,
        MQP.MAX_NOTES_LENGTH
      ),
    consent:
      boolean(payload.consent),
    browserTimeZone:
      text(payload.browserTimeZone, 80),
    clientTimestamp:
      text(payload.clientTimestamp, 80)
  };
}

function validatePortalPayload_(data) {
  const errors = [];

  if (!/^[A-Za-z0-9_-]{16,120}$/.test(data.idempotencyKey)) {
    errors.push({ field: 'form', message: 'Refresh the page and submit again.' });
  }

  if (data.customerName.length < 2) {
    errors.push({
      field: 'customerName',
      message: 'Enter your name.'
    });
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(data.email)
  ) {
    errors.push({
      field: 'email',
      message: 'Enter a valid email address.'
    });
  }

  const allowedAddOns = [
    'AO-OVEN', 'AO-FRIDGE', 'AO-WINDOW', 'AO-BLINDS',
    'AO-LAUNDRY', 'AO-PETHAIR', 'AO-GARAGE', 'AO-PATIO'
  ];
  if (data.addOns.some(item => !allowedAddOns.includes(item.code) || !Number.isInteger(item.quantity))) {
    errors.push({ field: 'addOns', message: 'Choose only supported add-ons and whole-number quantities.' });
  }

  if (
    data.phone &&
    data.phone.replace(/\D/g, '').length < 10
  ) {
    errors.push({
      field: 'phone',
      message:
        'Enter a complete phone number or leave it blank.'
    });
  }

  if (!data.address) {
    errors.push({
      field: 'address',
      message: 'Enter the property address.'
    });
  }

  if (!data.city) {
    errors.push({
      field: 'city',
      message: 'Enter the city.'
    });
  }

  if (data.state !== 'MD') {
    errors.push({
      field: 'state',
      message:
        'The current service area is in Maryland.'
    });
  }

  if (!/^\d{5}$/.test(data.zip)) {
    errors.push({
      field: 'zip',
      message: 'Enter a five-digit ZIP code.'
    });
  }

  if (
    ![
      'MMC-MAINT',
      'MMC-DETAIL',
      'MMC-MOVEIN',
      'MMC-MOVEOUT'
    ].includes(data.serviceCode)
  ) {
    errors.push({
      field: 'serviceCode',
      message: 'Choose a cleaning service.'
    });
  }

  if (
    !data.squareFeet ||
    data.squareFeet < 200 ||
    data.squareFeet > 15000
  ) {
    errors.push({
      field: 'squareFeet',
      message:
        'Enter square footage between 200 and 15,000.'
    });
  }

  [
    ['bedrooms', data.bedrooms, 0, 20],
    ['fullBaths', data.fullBaths, 0, 20],
    ['halfBaths', data.halfBaths, 0, 20],
    ['floors', data.floors, 1, 6]
  ].forEach(rule => {
    const [field, value, min, max] = rule;

    if (
      value === null ||
      value < min ||
      value > max
    ) {
      errors.push({
        field,
        message:
          `Enter a value from ${min} to ${max}.`
      });
    }
  });

  if (
    !['OCCUPIED', 'VACANT']
      .includes(data.occupiedStatus)
  ) {
    errors.push({
      field: 'occupiedStatus',
      message:
        'Choose whether the home is occupied or vacant.'
    });
  }

  if (
    ![
      'MAINTAINED',
      'AVERAGE',
      'HEAVY',
      'EXTREME'
    ].includes(data.condition)
  ) {
    errors.push({
      field: 'condition',
      message:
        'Choose the current home condition.'
    });
  }

  if (
    ![
      'ONE_TIME',
      'WEEKLY',
      'BIWEEKLY',
      'EVERY_4_WEEKS'
    ].includes(data.frequency)
  ) {
    errors.push({
      field: 'frequency',
      message:
        'Choose a service frequency.'
    });
  }

  if (!data.consent) {
    errors.push({
      field: 'consent',
      message:
        'Consent is required to submit the request.'
    });
  }

  return errors;
}

function enforcePortalRateLimit_(payload) {
  const email =
    String(payload.email || '')
      .trim()
      .toLowerCase();

  if (!email) {
    return;
  }

  const digest =
    Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        email
      )
    ).slice(0, 24);

  const cache = CacheService.getScriptCache();
  const key = `portal:${digest}`;
  const count =
    Number(cache.get(key) || 0);

  if (count >= 5) {
    throw new Error(
      'Too many recent submissions.'
    );
  }

  cache.put(
    key,
    String(count + 1),
    3600
  );
}

function formatPortalDate_(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}


function evaluateServiceArea_(address) {
  if (!address) {
    throw new Error(
      'A complete address is required.'
    );
  }

  const cfg = getPortalConfig_();

  let originLatitude =
    cfg.serviceAreaOriginLatitude;

  let originLongitude =
    cfg.serviceAreaOriginLongitude;

  if (
    !Number.isFinite(originLatitude) ||
    !Number.isFinite(originLongitude)
  ) {
    const refreshed =
      refreshServiceAreaOriginCoordinates();

    originLatitude =
      refreshed.latitude;

    originLongitude =
      refreshed.longitude;
  }

  const property =
    geocodeAddress_(address);

  if (property.partialMatch) {
    throw new Error('The address geocoder returned only a partial match.');
  }

  const distanceMiles =
    haversineMiles_(
      originLatitude,
      originLongitude,
      property.latitude,
      property.longitude
    );

  return {
    withinRadius:
      distanceMiles <=
      cfg.serviceAreaRadiusMiles,

    radiusMiles:
      cfg.serviceAreaRadiusMiles,

    distanceMiles:
      Math.round(
        distanceMiles * 100
      ) / 100,

    formattedAddress:
      property.formattedAddress,

    latitude:
      property.latitude,

    longitude:
      property.longitude,

    partialMatch:
      property.partialMatch
  };
}

function geocodeAddress_(address) {
  const response =
    Maps.newGeocoder()
      .setRegion('US')
      .setLanguage('en')
      .geocode(address);

  if (
    !response ||
    response.status !== 'OK' ||
    !Array.isArray(response.results) ||
    !response.results.length
  ) {
    throw new Error(
      `Address geocoding failed: ${
        response && response.status
          ? response.status
          : 'UNKNOWN'
      }`
    );
  }

  const result =
    response.results[0];

  const location =
    result.geometry &&
    result.geometry.location;

  if (
    !location ||
    !Number.isFinite(
      Number(location.lat)
    ) ||
    !Number.isFinite(
      Number(location.lng)
    )
  ) {
    throw new Error(
      'The geocoder did not return coordinates.'
    );
  }

  return {
    formattedAddress:
      String(
        result.formatted_address ||
        address
      ),

    latitude:
      Number(location.lat),

    longitude:
      Number(location.lng),

    partialMatch:
      Boolean(result.partial_match)
  };
}

function haversineMiles_(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const toRadians =
    degrees =>
      degrees * Math.PI / 180;

  const lat1 =
    toRadians(latitude1);

  const lat2 =
    toRadians(latitude2);

  const deltaLatitude =
    toRadians(
      latitude2 - latitude1
    );

  const deltaLongitude =
    toRadians(
      longitude2 - longitude1
    );

  const a =
    Math.sin(
      deltaLatitude / 2
    ) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(
      deltaLongitude / 2
    ) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    MQP.EARTH_RADIUS_MILES * c
  );
}
