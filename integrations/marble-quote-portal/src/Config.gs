const MQP = Object.freeze({
  VERSION: '1.1.0',
  SHEET_NAME: 'Portal Submissions',
  MAX_NOTES_LENGTH: 3000,
  MAX_FIELD_LENGTH: 300,
  EARTH_RADIUS_MILES: 3958.7613
});

function getPortalConfig_() {
  const props =
    PropertiesService.getScriptProperties();

  const spreadsheetId =
    props.getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error(
      'SPREADSHEET_ID is missing from Script Properties.'
    );
  }

  const radius = Number(props.getProperty('SERVICE_AREA_RADIUS_MILES') || 25);
  if (!Number.isFinite(radius) || radius <= 0 || radius > 100) {
    throw new Error('SERVICE_AREA_RADIUS_MILES must be a number from 0 to 100.');
  }

  return {
    spreadsheetId,

    companyName:
      props.getProperty('COMPANY_NAME') ||
      'Marlboro Manor Cleaning',

    supportEmail:
      props.getProperty('SUPPORT_EMAIL') ||
      'hello@marlboromanorcleaning.com',

    serviceAreaOriginAddress:
      props.getProperty(
        'SERVICE_AREA_ORIGIN_ADDRESS'
      ) ||
      '5013 Brown Station Rd, Upper Marlboro, MD 20772',

    serviceAreaRadiusMiles: radius,
    environment: props.getProperty('ENVIRONMENT') || 'TEST',

    serviceAreaOriginLatitude:
      parseOptionalNumber_(
        props.getProperty(
          'SERVICE_AREA_ORIGIN_LATITUDE'
        )
      ),

    serviceAreaOriginLongitude:
      parseOptionalNumber_(
        props.getProperty(
          'SERVICE_AREA_ORIGIN_LONGITUDE'
        )
      )
  };
}

function parseOptionalNumber_(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}
