function initializeMarbleQuotePortal() {
  portalSheet_();

  const props =
    PropertiesService.getScriptProperties();

  const defaults = {
    COMPANY_NAME:
      'Marlboro Manor Cleaning',

    SUPPORT_EMAIL:
      'hello@marlboromanorcleaning.com',

    SERVICE_AREA_ORIGIN_ADDRESS:
      '5013 Brown Station Rd, Upper Marlboro, MD 20772',

    SERVICE_AREA_RADIUS_MILES:
      '25'
  };

  Object.keys(defaults).forEach(key => {
    if (!props.getProperty(key)) {
      props.setProperty(
        key,
        defaults[key]
      );
    }
  });

  const origin =
    refreshServiceAreaOriginCoordinates();

  return {
    ok: true,
    origin,
    message:
      'Portal initialized with a 25-mile address-based service radius.'
  };
}

function refreshServiceAreaOriginCoordinates() {
  const cfg = getPortalConfig_();

  const result =
    geocodeAddress_(
      cfg.serviceAreaOriginAddress
    );

  const props =
    PropertiesService.getScriptProperties();

  props.setProperties({
    SERVICE_AREA_ORIGIN_LATITUDE:
      String(result.latitude),

    SERVICE_AREA_ORIGIN_LONGITUDE:
      String(result.longitude),

    SERVICE_AREA_ORIGIN_FORMATTED_ADDRESS:
      result.formattedAddress
  });

  return {
    address: result.formattedAddress,
    latitude: result.latitude,
    longitude: result.longitude
  };
}

function portalHealthCheck() {
  const cfg = getPortalConfig_();

  return {
    ok: true,
    version: MQP.VERSION,

    spreadsheetConfigured:
      Boolean(cfg.spreadsheetId),

    companyName:
      cfg.companyName,

    supportEmail:
      cfg.supportEmail,

    serviceAreaOriginAddress:
      cfg.serviceAreaOriginAddress,

    serviceAreaRadiusMiles:
      cfg.serviceAreaRadiusMiles,

    originCoordinatesConfigured:
      Number.isFinite(
        cfg.serviceAreaOriginLatitude
      ) &&
      Number.isFinite(
        cfg.serviceAreaOriginLongitude
      )
  };
}

function testServiceAreaAddress(address) {
  const result =
    evaluateServiceArea_(
      String(address || '').trim()
    );

  return {
    ok: true,
    result
  };
}
