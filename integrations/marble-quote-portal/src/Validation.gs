function portalSpreadsheet_() {
  return SpreadsheetApp.openById(
    getPortalConfig_().spreadsheetId
  );
}

function portalSheet_() {
  const ss = portalSpreadsheet_();
  let sh = ss.getSheetByName(MQP.SHEET_NAME);

  if (!sh) {
    sh = ss.insertSheet(MQP.SHEET_NAME);
    sh.getRange(1, 1, 1, portalHeaders_().length)
      .setValues([portalHeaders_()]);
    formatPortalInbox_(sh);
  }

  ensurePortalHeaders_(sh);
  return sh;
}

function portalHeaders_() {
  return [
    'Submission ID',
    'Environment',
    'Created At',
    'Processing Status',
    'Idempotency Key',
    'Processed At',
    'Lead ID',
    'Quote ID',
    'Error',
    'Source',
    'Customer Name',
    'Email',
    'Phone',
    'Preferred Contact',
    'Address',
    'City',
    'State',
    'ZIP',
    'Geocoded Address',
    'Property Latitude',
    'Property Longitude',
    'Distance Miles',
    'Service Area Result',
    'Service Code',
    'Square Feet',
    'Bedrooms',
    'Full Baths',
    'Half Baths',
    'Floors',
    'Finished Basement',
    'Occupied Status',
    'Pets',
    'Pet Hair Level',
    'Condition',
    'Last Professional Clean',
    'Frequency',
    'Preferred Date',
    'Add-Ons JSON',
    'Additional Notes',
    'Consent',
    'Terms Version',
    'Browser Time Zone',
    'Client Timestamp',
    'Payload JSON'
  ];
}

function ensurePortalHeaders_(sh) {
  const headers = sh
    .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
    .getValues()[0]
    .map(value => String(value).trim());

  portalHeaders_().forEach(header => {
    if (!headers.includes(header)) {
      sh.getRange(
        1,
        sh.getLastColumn() + 1
      ).setValue(header);
      headers.push(header);
    }
  });
}

function appendPortalSubmission_(record) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = portalSheet_();
    const headers = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0];
    const idempotencyKey = String(record['Idempotency Key'] || '').trim();
    if (idempotencyKey) {
      const existingValues = sh.getDataRange().getValues();
      const idempotencyIndex = headers.indexOf('Idempotency Key');
      const submissionIndex = headers.indexOf('Submission ID');
      for (let index = 1; index < existingValues.length; index++) {
        if (String(existingValues[index][idempotencyIndex] || '').trim() === idempotencyKey) {
          return String(existingValues[index][submissionIndex] || '');
        }
      }
    }

    const row = headers.map(header =>
      Object.prototype.hasOwnProperty.call(record, header)
        ? sanitizePortalSheetValue_(record[header])
        : ''
    );

    sh.appendRow(row);
    return String(record['Submission ID'] || '');
  } finally {
    lock.releaseLock();
  }
}

function sanitizePortalSheetValue_(value) {
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function formatPortalInbox_(sh) {
  sh.setFrozenRows(1);

  sh.getRange(1, 1, 1, sh.getLastColumn())
    .setBackground('#13233F')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');

  sh.getDataRange().setWrap(true);
}
