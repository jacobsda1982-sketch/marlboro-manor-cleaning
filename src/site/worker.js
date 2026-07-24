import { externalPortalSchema, handleExternalPortal } from './external-portals.js'

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const twiml = body => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, { status: 200, headers: { 'content-type': 'text/xml; charset=utf-8', 'cache-control': 'no-store' } })
const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max)
const emailOkay = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const tokenOkay = value => /^[A-Za-z0-9_-]{24,160}$/.test(value)

async function ensureSchema(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS public_intake (id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, email TEXT, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, processed_at TEXT, private_reference TEXT, error TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_public_intake_queue ON public_intake(kind,status,created_at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS scheduling_sessions (token TEXT PRIMARY KEY, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL, selected_option_id TEXT, customer_notes TEXT, confirmed_at TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS preparation_sessions (token TEXT PRIMARY KEY, job_id TEXT NOT NULL, status TEXT NOT NULL, readiness TEXT NOT NULL, expires_at TEXT NOT NULL, reveal_after TEXT, reveal_until TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, submitted_at TEXT, safe_payload TEXT NOT NULL, encrypted_credentials TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_preparation_job ON preparation_sessions(job_id,status,readiness)'),
    db.prepare('CREATE TABLE IF NOT EXISTS access_audit (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, token TEXT NOT NULL, actor_id TEXT NOT NULL, crew_member_id TEXT, action TEXT NOT NULL, created_at TEXT NOT NULL, detail TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS crew_offer_sessions (token TEXT PRIMARY KEY, offer_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL, decision TEXT, notes TEXT, responded_at TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS crew_wallets (team_member_id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, payload TEXT NOT NULL)'),
    ...externalPortalSchema.map(statement => db.prepare(statement))
  ])
}

const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const unbase64 = value => Uint8Array.from(atob(value), character => character.charCodeAt(0))
async function accessKey(env) {
  const secret = clean(env.ACCESS_VAULT_KEY || env.MARBLE_QUEUE_SECRET, 500)
  if (secret.length < 32) throw new Error('Secure access encryption is not configured.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}
async function encryptCredentials(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await accessKey(env), new TextEncoder().encode(JSON.stringify(value)))
  return JSON.stringify({ v: 1, iv: base64(iv), data: base64(encrypted) })
}
async function decryptCredentials(value, env) {
  const envelope = JSON.parse(value)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(envelope.iv) }, await accessKey(env), unbase64(envelope.data))
  return JSON.parse(new TextDecoder().decode(decrypted))
}
async function validTwilioSignature(request, env, params) {
  const token = clean(env.TWILIO_AUTH_TOKEN, 300), supplied = clean(request.headers.get('x-twilio-signature'), 500)
  if (!token || !supplied) return false
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  const source = request.url + entries.map(([key, value]) => key + value).join('')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  return base64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(source))) === supplied
}

async function twilioWebhook(request, env, kind) {
  const text = await request.text(), params = new URLSearchParams(text)
  if (!(await validTwilioSignature(request, env, params))) return new Response('Invalid signature', { status: 403 })
  const now = new Date().toISOString(), messageSid = clean(params.get('MessageSid') || params.get('SmsSid'), 100), id = `${kind}-${messageSid || crypto.randomUUID()}`
  const payload = kind === 'SMS_INBOUND'
    ? { messageSid, from: clean(params.get('From'), 40), to: clean(params.get('To'), 40), body: clean(params.get('Body'), 2000), numMedia: Number(params.get('NumMedia') || 0), receivedAt: now }
    : { messageSid, messageStatus: clean(params.get('MessageStatus') || params.get('SmsStatus'), 40), errorCode: clean(params.get('ErrorCode'), 40), errorMessage: clean(params.get('ErrorMessage'), 1000), receivedAt: now }
  await env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id, kind, 'NEW', now, now, '', JSON.stringify(payload)).run()
  if (kind === 'SMS_INBOUND') return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { status: 200, headers: { 'content-type': 'text/xml; charset=utf-8' } })
  return new Response('', { status: 204 })
}

async function twilioVoiceWebhook(request, env, kind) {
  const text = await request.text(), params = new URLSearchParams(text)
  if (!(await validTwilioSignature(request, env, params))) return new Response('Invalid signature', { status: 403 })
  const now = new Date().toISOString(), callSid = clean(params.get('CallSid'), 100), id = `${kind}-${callSid || crypto.randomUUID()}-${crypto.randomUUID().slice(0, 8)}`
  const payload = {
    eventType: kind,
    callSid,
    from: clean(params.get('From'), 40),
    to: clean(params.get('To'), 40),
    callStatus: clean(params.get('CallStatus'), 40),
    digits: clean(params.get('Digits'), 10),
    speechResult: clean(params.get('SpeechResult'), 2000),
    confidence: Number(params.get('Confidence') || 0),
    receivedAt: now
  }
  await env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id, kind, 'NEW', now, now, '', JSON.stringify(payload)).run()
  if (kind === 'VOICE_STATUS') return new Response('', { status: 204 })
  if (kind === 'VOICE_GATHER') {
    const choice = payload.digits || payload.speechResult.toLowerCase()
    const response = choice === '1' || /quote|estimate/.test(choice)
      ? 'You can request a personalized estimate at marlboro manor cleaning dot com slash quote. We have also recorded your request for follow up.'
      : choice === '2' || /schedule|appointment/.test(choice)
        ? 'Your scheduling request has been recorded for a care coordinator.'
        : choice === '3' || /service|appointment/.test(choice)
          ? 'Your existing service request has been recorded for priority review.'
          : 'Your callback request has been recorded. A care coordinator will follow up during business hours.'
    return twiml(`<Say voice="Polly.Joanna">${response}</Say><Say voice="Polly.Joanna">Thank you for calling Marlboro Manor Cleaning. Goodbye.</Say>`)
  }
  return twiml(`<Gather input="dtmf speech" numDigits="1" timeout="5" speechTimeout="auto" action="https://marlboromanorcleaning.com/api/twilio/voice/gather" method="POST"><Say voice="Polly.Joanna">Thank you for calling Marlboro Manor Cleaning. Press or say 1 for a cleaning estimate, 2 for scheduling, 3 for an existing appointment, or 0 for a callback.</Say></Gather><Say voice="Polly.Joanna">We did not receive a selection. Your callback request has been recorded. Goodbye.</Say>`)
}

function authorized(request, env) {
  const expected = clean(env.MARBLE_QUEUE_SECRET, 300)
  return Boolean(expected) && clean(request.headers.get('authorization'), 400) === `Bearer ${expected}`
}

async function submitQuote(request, env) {
  const body = await request.json().catch(() => null)
  if (!body || clean(body.website, 100)) return json({ ok: true, reference: 'RECEIVED' })
  const required = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'service', 'squareFeet', 'bedrooms', 'fullBaths', 'floors', 'condition', 'frequency']
  const missing = required.filter(key => !clean(body[key], 300))
  if (missing.length || !emailOkay(clean(body.email))) return json({ ok: false, error: 'Please complete all required fields with a valid email address.', fields: missing }, 400)
  if (!/^\d{5}$/.test(clean(body.zip))) return json({ ok: false, error: 'Enter a valid five-digit ZIP code.' }, 400)
  const id = `WEB-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const now = new Date().toISOString()
  const payload = {
    source: 'CLOUDFLARE_WEBSITE', environment: clean(env.ENVIRONMENT || 'PRODUCTION'), customerName: clean(body.name),
    email: clean(body.email).toLowerCase(), phone: clean(body.phone), preferredContact: clean(body.preferredContact || 'EMAIL'),
    address: clean(body.address), city: clean(body.city), state: clean(body.state || 'MD', 2).toUpperCase(), zip: clean(body.zip, 5),
    serviceCode: clean(body.service), squareFeet: Number(body.squareFeet), bedrooms: Number(body.bedrooms), fullBaths: Number(body.fullBaths),
    halfBaths: Number(body.halfBaths || 0), floors: Number(body.floors), finishedBasement: Boolean(body.finishedBasement),
    occupiedStatus: clean(body.occupiedStatus || 'OCCUPIED'), condition: clean(body.condition), frequency: clean(body.frequency),
    pets: Boolean(body.pets), petHairLevel: clean(body.petHairLevel || 'NONE'), preferredDate: clean(body.preferredDate, 30),
    addOns: Array.isArray(body.addOns) ? body.addOns.slice(0, 20).map(item => ({ code: clean(item.code, 50), quantity: Math.max(1, Math.min(100, Number(item.quantity || 1))) })) : [],
    additionalNotes: clean(body.notes, 3000), consent: Boolean(body.consent), smsConsent: Boolean(body.smsConsent), smsConsentText: 'I agree to receive transactional text messages about this estimate and related appointments. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.', smsConsentVersion: 'SMS-1.0', submittedAt: now
  }
  if (!payload.consent) return json({ ok: false, error: 'Consent is required before submitting.' }, 400)
  await env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(id, 'QUOTE', 'NEW', now, now, payload.email, JSON.stringify(payload)).run()
  return json({ ok: true, reference: id, message: 'Your estimate request has been received.' }, 201)
}

async function scheduling(request, env, url) {
  if (request.method === 'GET') {
    const token = clean(url.searchParams.get('token'), 180)
    if (!tokenOkay(token)) return json({ ok: false, error: 'This scheduling link is invalid.' }, 400)
    const row = await env.DB.prepare('SELECT status,expires_at,payload,selected_option_id,confirmed_at FROM scheduling_sessions WHERE token=?').bind(token).first()
    if (!row) return json({ ok: false, error: 'This scheduling request was not found.' }, 404)
    if (Date.parse(row.expires_at) < Date.now()) return json({ ok: false, error: 'This scheduling link has expired.' }, 410)
    const holdActive = row.status === 'HELD' && Date.parse(row.confirmed_at) > Date.now()
    return json({ ok: true, status: holdActive ? 'HELD' : (row.status === 'HELD' ? 'OPEN' : row.status), ...JSON.parse(row.payload), selectedOptionId: holdActive ? row.selected_option_id : '', holdExpiresAt: holdActive ? row.confirmed_at : '', confirmedAt: row.status === 'CONFIRMED' ? row.confirmed_at : '' })
  }
  const body = await request.json().catch(() => null)
  const token = clean(body?.token, 180)
  const action = clean(body?.action || 'SELECT', 30).toUpperCase()
  const optionId = clean(body?.optionId, 100)
  if (!tokenOkay(token)) return json({ ok: false, error: 'This scheduling link is invalid.' }, 400)
  const row = await env.DB.prepare('SELECT status,expires_at,payload,selected_option_id,confirmed_at FROM scheduling_sessions WHERE token=?').bind(token).first()
  if (!row) return json({ ok: false, error: 'This scheduling request was not found.' }, 404)
  if (row.status === 'CONFIRMED') return json({ ok: true, status: 'CONFIRMED', idempotent: true })
  if (Date.parse(row.expires_at) < Date.now()) return json({ ok: false, error: 'This scheduling link has expired.' }, 410)
  const session = JSON.parse(row.payload)
  const now = new Date().toISOString()
  if (action === 'ALTERNATE') {
    const requestedDate = clean(body?.requestedDate, 20)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return json({ ok: false, error: 'Choose a preferred alternate date.' }, 400)
    const id = `SCHED-${crypto.randomUUID()}`
    const responsePayload = {
      token,
      action: 'REQUEST_ALTERNATE',
      schedulingRequestId: session.schedulingRequestId,
      quoteId: session.quoteId,
      requestedDate,
      timeWindow: clean(body?.timeWindow, 40),
      notes: clean(body?.notes, 1000),
      submittedAt: now
    }
    await env.DB.batch([
      env.DB.prepare('UPDATE scheduling_sessions SET status=?,updated_at=?,customer_notes=? WHERE token=?').bind('ALTERNATE_REQUESTED', now, responsePayload.notes, token),
      env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(id, 'SCHEDULING', 'NEW', now, now, clean(session.customerEmail).toLowerCase(), JSON.stringify(responsePayload))
    ])
    return json({ ok: true, status: 'ALTERNATE_REQUESTED', message: 'Your alternate-date request was received. The current options remain unconfirmed.' })
  }
  if (!optionId) return json({ ok: false, error: 'Choose an available appointment option.' }, 400)
  const option = (session.options || []).find(item => String(item.id) === optionId)
  if (!option) return json({ ok: false, error: 'That appointment option is no longer available.' }, 409)
  if (action === 'HOLD') {
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await env.DB.prepare('UPDATE scheduling_sessions SET status=?,updated_at=?,selected_option_id=?,confirmed_at=? WHERE token=?')
      .bind('HELD', now, optionId, holdExpiresAt, token).run()
    return json({ ok: true, status: 'HELD', optionId, holdExpiresAt, message: 'This option is held for ten minutes while you finish.' })
  }
  if (action !== 'SELECT') return json({ ok: false, error: 'Unsupported scheduling action.' }, 400)
  if (row.status === 'HELD' && (row.selected_option_id !== optionId || Date.parse(row.confirmed_at) < Date.now())) {
    return json({ ok: false, error: 'The temporary hold expired. Select the appointment again to refresh it.' }, 409)
  }
  const id = `SCHED-${crypto.randomUUID()}`
  const notes = clean(body.notes, 1000)
  const responsePayload = { token, action: 'SELECT', schedulingRequestId: session.schedulingRequestId, quoteId: session.quoteId, optionId, option, notes, submittedAt: now }
  await env.DB.batch([
    env.DB.prepare('UPDATE scheduling_sessions SET status=?,updated_at=?,selected_option_id=?,customer_notes=?,confirmed_at=? WHERE token=?').bind('CUSTOMER_SELECTED', now, optionId, notes, now, token),
    env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(id, 'SCHEDULING', 'NEW', now, now, clean(session.customerEmail).toLowerCase(), JSON.stringify(responsePayload))
  ])
  return json({ ok: true, status: 'CUSTOMER_SELECTED', message: 'Your selection was received. We will email the final confirmation after availability is verified.' })
}

function preparationReadiness(plan) {
  if (plan.presencePlan === 'UNSURE') return 'NEEDS_REVIEW'
  if (plan.petsPresent && ['AGGRESSIVE', 'ESCAPE_RISK'].includes(plan.petRisk)) return 'NEEDS_REVIEW'
  if (plan.petsPresent && plan.petContainment === 'FREE_ROAM') return 'NEEDS_REVIEW'
  if (['CUSTOMER_HOME', 'OTHER_PERSON_HOME'].includes(plan.presencePlan)) return plan.homeContactName ? 'CUSTOMER_PRESENT_CONFIRMED' : 'NEEDS_REVIEW'
  if (plan.presencePlan === 'INDEPENDENT_ACCESS' && plan.accessMethod) return 'SECURE_ACCESS_CONFIRMED'
  return 'NEEDS_REVIEW'
}

async function preparation(request, env, url) {
  if (request.method === 'GET') {
    const token = clean(url.searchParams.get('token'), 180)
    if (!tokenOkay(token)) return json({ ok: false, error: 'This preparation link is invalid.' }, 400)
    const row = await env.DB.prepare('SELECT status,readiness,expires_at,safe_payload,submitted_at FROM preparation_sessions WHERE token=?').bind(token).first()
    if (!row) return json({ ok: false, error: 'This preparation request was not found.' }, 404)
    if (Date.parse(row.expires_at) < Date.now()) return json({ ok: false, error: 'This preparation link has expired.' }, 410)
    return json({ ok: true, status: row.status, readiness: row.readiness, safePlan: JSON.parse(row.safe_payload), submittedAt: row.submitted_at })
  }
  const body = await request.json().catch(() => null), token = clean(body?.token, 180)
  if (!tokenOkay(token)) return json({ ok: false, error: 'This preparation link is invalid.' }, 400)
  const row = await env.DB.prepare('SELECT job_id,expires_at,safe_payload FROM preparation_sessions WHERE token=?').bind(token).first()
  if (!row) return json({ ok: false, error: 'This preparation request was not found.' }, 404)
  if (Date.parse(row.expires_at) < Date.now()) return json({ ok: false, error: 'This preparation link has expired.' }, 410)
  const presencePlan = clean(body.presencePlan, 30)
  if (!['CUSTOMER_HOME', 'OTHER_PERSON_HOME', 'INDEPENDENT_ACCESS', 'UNSURE'].includes(presencePlan)) return json({ ok: false, error: 'Choose who will be home.' }, 400)
  if (!body.secureAccessConsent) return json({ ok: false, error: 'Confirm the secure access authorization.' }, 400)
  const petsPresent = Boolean(body.petsPresent), petContainment = clean(body.petContainment, 30), petRisk = clean(body.petRisk || 'LOW', 30)
  if (petsPresent && (!petContainment || !body.petAcknowledgement)) return json({ ok: false, error: 'Complete the pet containment plan and acknowledgement.' }, 400)
  const accessMethod = clean(body.accessMethod, 30), codeMethods = ['SMART_LOCK', 'KEYPAD', 'LOCKBOX', 'OTHER']
  if (presencePlan === 'INDEPENDENT_ACCESS' && !['SMART_LOCK', 'KEYPAD', 'LOCKBOX', 'CONCIERGE', 'COMPANY_KEY', 'REMOTE_UNLOCK', 'OTHER'].includes(accessMethod)) return json({ ok: false, error: 'Choose a secure entry method.' }, 400)
  if (presencePlan === 'INDEPENDENT_ACCESS' && codeMethods.includes(accessMethod) && !clean(body.accessCode, 160)) return json({ ok: false, error: 'Enter the temporary access credential.' }, 400)
  if (clean(body.alarmPlan, 30) === 'TEMPORARY_CODE' && !clean(body.alarmCode, 160)) return json({ ok: false, error: 'Enter the temporary alarm code.' }, 400)
  const current = JSON.parse(row.safe_payload), now = new Date().toISOString()
  const safePlan = {
    jobId: row.job_id,
    customerName: clean(current.customerName),
    serviceName: clean(current.serviceName),
    appointmentStart: clean(current.appointmentStart, 50),
    appointmentEnd: clean(current.appointmentEnd, 50),
    presencePlan,
    homeContactName: clean(body.homeContactName),
    homeContactPhone: clean(body.homeContactPhone, 40),
    accessMethod: presencePlan === 'INDEPENDENT_ACCESS' ? accessMethod : '',
    entryPoint: clean(body.entryPoint, 160),
    accessInstructions: clean(body.accessInstructions, 1500),
    credentialExpiresAt: clean(body.credentialExpiresAt, 50),
    alarmPlan: clean(body.alarmPlan || 'NONE', 30),
    rearmAlarm: Boolean(body.rearmAlarm),
    petsPresent,
    petSummary: petsPresent ? clean(body.petSummary, 500) : '',
    petContainment: petsPresent ? petContainment : '',
    petLocation: petsPresent ? clean(body.petLocation, 300) : '',
    petRisk: petsPresent ? petRisk : 'NONE',
    petInstructions: petsPresent ? clean(body.petInstructions, 1500) : '',
    petAcknowledgement: petsPresent ? Boolean(body.petAcknowledgement) : false,
    secureAccessConsent: true
  }
  const readiness = preparationReadiness(safePlan)
  const credentials = presencePlan === 'INDEPENDENT_ACCESS'
    ? await encryptCredentials({ accessCode: clean(body.accessCode, 160), alarmCode: clean(body.alarmCode, 160) }, env)
    : null
  const eventId = `PREP-${crypto.randomUUID()}`
  const eventPayload = { jobId: row.job_id, readiness, presencePlan, accessMethod: safePlan.accessMethod, petsPresent, petRisk: safePlan.petRisk, petContainment: safePlan.petContainment, submittedAt: now }
  await env.DB.batch([
    env.DB.prepare('UPDATE preparation_sessions SET status=?,readiness=?,updated_at=?,submitted_at=?,safe_payload=?,encrypted_credentials=? WHERE token=?').bind('SUBMITTED', readiness, now, now, JSON.stringify(safePlan), credentials, token),
    env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(eventId, 'PROPERTY_PREPARATION', 'NEW', now, now, '', JSON.stringify(eventPayload))
  ])
  return json({ ok: true, status: 'SUBMITTED', readiness })
}

async function marbleQueue(request, env, url) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  if (request.method === 'GET') {
    const kind = clean(url.searchParams.get('kind') || 'ALL', 20).toUpperCase(), limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))
    const result = kind === 'ALL'
      ? await env.DB.prepare("SELECT * FROM public_intake WHERE status='NEW' ORDER BY created_at LIMIT ?").bind(limit).all()
      : await env.DB.prepare("SELECT * FROM public_intake WHERE status='NEW' AND kind=? ORDER BY created_at LIMIT ?").bind(kind, limit).all()
    return json({ ok: true, items: result.results.map(row => ({ id: row.id, kind: row.kind, createdAt: row.created_at, payload: JSON.parse(row.payload) })) })
  }
  const body = await request.json().catch(() => null), id = clean(body?.id, 100), action = clean(body?.action, 20).toUpperCase()
  if (!id || !['PROCESSED', 'FAILED', 'RELEASE'].includes(action)) return json({ ok: false, error: 'Invalid queue acknowledgement.' }, 400)
  const now = new Date().toISOString(), status = action === 'RELEASE' ? 'NEW' : action
  await env.DB.prepare('UPDATE public_intake SET status=?,updated_at=?,processed_at=?,private_reference=?,error=? WHERE id=?').bind(status, now, action === 'RELEASE' ? null : now, clean(body.privateReference, 120), clean(body.error, 1000), id).run()
  return json({ ok: true, id, status })
}

async function publishSchedule(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null), token = clean(body?.token, 180)
  if (!tokenOkay(token) || !body?.schedulingRequestId || !Array.isArray(body.options) || !body.options.length) return json({ ok: false, error: 'Invalid scheduling session.' }, 400)
  const now = new Date().toISOString(), expiresAt = clean(body.expiresAt, 40) || new Date(Date.now() + 7 * 86400000).toISOString()
  const payload = { schedulingRequestId: clean(body.schedulingRequestId, 100), quoteId: clean(body.quoteId, 100), customerName: clean(body.customerName), customerEmail: clean(body.customerEmail), serviceName: clean(body.serviceName), crewSize: Number(body.crewSize || 1), durationMinutes: Number(body.durationMinutes || 0), options: body.options.slice(0, 10).map(o => ({ id: clean(o.id, 100), label: clean(o.label, 200), start: clean(o.start, 40), end: clean(o.end, 40) })) }
  await env.DB.prepare("INSERT INTO scheduling_sessions (token,status,expires_at,created_at,updated_at,payload) VALUES (?,?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET status='OPEN',expires_at=excluded.expires_at,updated_at=excluded.updated_at,payload=excluded.payload").bind(token, 'OPEN', expiresAt, now, now, JSON.stringify(payload)).run()
  return json({ ok: true, url: `https://marlboromanorcleaning.com/schedule/?token=${encodeURIComponent(token)}` })
}

async function publishPreparation(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null), token = clean(body?.token, 180), jobId = clean(body?.jobId, 100)
  if (!tokenOkay(token) || !jobId || !body?.expiresAt) return json({ ok: false, error: 'Invalid preparation session.' }, 400)
  const now = new Date().toISOString()
  const safePayload = {
    jobId,
    customerName: clean(body.customerName),
    serviceName: clean(body.serviceName),
    appointmentStart: clean(body.appointmentStart, 50),
    appointmentEnd: clean(body.appointmentEnd, 50)
  }
  await env.DB.prepare("INSERT INTO preparation_sessions (token,job_id,status,readiness,expires_at,reveal_after,reveal_until,created_at,updated_at,safe_payload) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET job_id=excluded.job_id,status='OPEN',readiness='INCOMPLETE',expires_at=excluded.expires_at,reveal_after=excluded.reveal_after,reveal_until=excluded.reveal_until,updated_at=excluded.updated_at,safe_payload=excluded.safe_payload").bind(token, jobId, 'OPEN', 'INCOMPLETE', clean(body.expiresAt, 50), clean(body.revealAfter, 50), clean(body.revealUntil, 50), now, now, JSON.stringify(safePayload)).run()
  return json({ ok: true, url: `https://marlboromanorcleaning.com/prepare/?token=${encodeURIComponent(token)}` })
}

async function preparationStatus(request, env, url) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const jobId = clean(url.searchParams.get('jobId'), 100)
  if (!jobId) return json({ ok: false, error: 'Job ID is required.' }, 400)
  const row = await env.DB.prepare('SELECT status,readiness,updated_at,submitted_at,safe_payload FROM preparation_sessions WHERE job_id=? ORDER BY updated_at DESC LIMIT 1').bind(jobId).first()
  if (!row) return json({ ok: true, jobId, status: 'NOT_REQUESTED', readiness: 'INCOMPLETE' })
  return json({ ok: true, jobId, status: row.status, readiness: row.readiness, updatedAt: row.updated_at, submittedAt: row.submitted_at, safePlan: JSON.parse(row.safe_payload) })
}

async function revealPreparation(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null), jobId = clean(body?.jobId, 100), actorId = clean(body?.actorId, 100), crewMemberId = clean(body?.crewMemberId, 100)
  if (!jobId || !actorId || !crewMemberId) return json({ ok: false, error: 'Job, actor, and assigned crew member are required.' }, 400)
  const row = await env.DB.prepare('SELECT token,status,readiness,reveal_after,reveal_until,safe_payload,encrypted_credentials FROM preparation_sessions WHERE job_id=? ORDER BY updated_at DESC LIMIT 1').bind(jobId).first()
  if (!row || row.status !== 'SUBMITTED' || !['CUSTOMER_PRESENT_CONFIRMED', 'SECURE_ACCESS_CONFIRMED'].includes(row.readiness)) return json({ ok: false, error: 'This job is not access-ready.' }, 409)
  const nowMs = Date.now()
  if (row.reveal_after && Date.parse(row.reveal_after) > nowMs) return json({ ok: false, error: 'Access details are not available yet.' }, 403)
  if (row.reveal_until && Date.parse(row.reveal_until) < nowMs) return json({ ok: false, error: 'The access window has closed.' }, 410)
  const credentials = row.encrypted_credentials ? await decryptCredentials(row.encrypted_credentials, env) : {}
  const now = new Date().toISOString(), auditId = `ACCESS-${crypto.randomUUID()}`
  await env.DB.prepare('INSERT INTO access_audit (id,job_id,token,actor_id,crew_member_id,action,created_at,detail) VALUES (?,?,?,?,?,?,?,?)').bind(auditId, jobId, row.token, actorId, crewMemberId, 'REVEAL', now, JSON.stringify({ reason: clean(body.reason || 'JOB_ACCESS', 100) })).run()
  return json({ ok: true, jobId, safePlan: JSON.parse(row.safe_payload), credentials, revealedAt: now, expiresAt: row.reveal_until })
}

async function secureDeparture(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null), jobId = clean(body?.jobId, 100), actorId = clean(body?.actorId, 100), crewMemberId = clean(body?.crewMemberId, 100)
  if (!jobId || !actorId || !crewMemberId || !body?.doorLocked) return json({ ok: false, error: 'Door-lock confirmation is required.' }, 400)
  const row = await env.DB.prepare('SELECT token,safe_payload FROM preparation_sessions WHERE job_id=? ORDER BY updated_at DESC LIMIT 1').bind(jobId).first()
  if (!row) return json({ ok: false, error: 'Preparation record not found.' }, 404)
  const plan = JSON.parse(row.safe_payload)
  if (plan.rearmAlarm && !body.alarmRearmed) return json({ ok: false, error: 'Alarm re-arm confirmation is required.' }, 400)
  const now = new Date().toISOString(), auditId = `ACCESS-${crypto.randomUUID()}`, eventId = `DEPART-${crypto.randomUUID()}`
  const detail = { doorLocked: true, alarmRearmed: Boolean(body.alarmRearmed), notes: clean(body.notes, 500) }
  await env.DB.batch([
    env.DB.prepare("UPDATE preparation_sessions SET status='SECURED',updated_at=?,encrypted_credentials=NULL WHERE token=?").bind(now, row.token),
    env.DB.prepare('INSERT INTO access_audit (id,job_id,token,actor_id,crew_member_id,action,created_at,detail) VALUES (?,?,?,?,?,?,?,?)').bind(auditId, jobId, row.token, actorId, crewMemberId, 'SECURE_DEPARTURE', now, JSON.stringify(detail)),
    env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(eventId, 'SECURE_DEPARTURE', 'NEW', now, now, '', JSON.stringify({ jobId, ...detail, completedAt: now }))
  ])
  return json({ ok: true, jobId, status: 'SECURED', credentialsRevoked: true })
}

async function publishCrewOffer(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null), token = clean(body?.token, 180), offerId = clean(body?.offerId, 100)
  if (!tokenOkay(token) || !offerId || !body?.expiresAt) return json({ ok: false, error: 'Invalid crew offer session.' }, 400)
  const now = new Date().toISOString(), payload = { offerId, jobId: clean(body.jobId, 100), teamMemberId: clean(body.teamMemberId, 100), contractorName: clean(body.contractorName), serviceName: clean(body.serviceName), startAt: clean(body.startAt, 50), endAt: clean(body.endAt, 50), city: clean(body.city), zip: clean(body.zip, 10), role: clean(body.role), coverageType: clean(body.coverageType, 30) || 'POSITION', crewSizeCovered: Math.max(1, Number(body.crewSizeCovered || 1)), estimatedLaborHours: Number(body.estimatedLaborHours || 0), expectedDurationMinutes: Number(body.expectedDurationMinutes || 0), offerAmount: Number(body.offerAmount || 0), terms: clean(body.terms, 3000) }
  const accessExpiresAt = new Date(Math.max(Date.parse(clean(body.expiresAt, 50)) || 0, Date.now() + 90 * 86400000)).toISOString()
  const tokenHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(byte => byte.toString(16).padStart(2, '0')).join('')
  await env.DB.batch([
    env.DB.prepare("INSERT INTO crew_offer_sessions (token,offer_id,status,expires_at,created_at,updated_at,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET status='OPEN',expires_at=excluded.expires_at,updated_at=excluded.updated_at,payload=excluded.payload").bind(token, offerId, 'OPEN', clean(body.expiresAt, 50), now, now, JSON.stringify(payload)),
    env.DB.prepare("INSERT INTO crew_access_sessions (token_hash,team_member_id,expires_at,created_at,updated_at,payload) VALUES (?,?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET team_member_id=excluded.team_member_id,expires_at=excluded.expires_at,updated_at=excluded.updated_at,payload=excluded.payload").bind(tokenHash, clean(body.teamMemberId, 100), accessExpiresAt, now, now, JSON.stringify({name:clean(body.contractorName),role:clean(body.role)}))
  ])
  return json({ ok: true, url: `https://marlboromanorcleaning.com/crew/?token=${encodeURIComponent(token)}` })
}

async function crewOffer(request, env, url) {
  if (request.method === 'GET') {
    const token = clean(url.searchParams.get('token'), 180); if (!tokenOkay(token)) return json({ ok: false, error: 'This work-offer link is invalid.' }, 400)
    const row = await env.DB.prepare('SELECT status,expires_at,payload,decision,responded_at FROM crew_offer_sessions WHERE token=?').bind(token).first()
    if (!row) return json({ ok: false, error: 'This work offer was not found.' }, 404)
    if (Date.parse(row.expires_at) < Date.now() && row.status === 'OPEN') return json({ ok: false, error: 'This work offer has expired.' }, 410)
    return json({ ok: true, status: row.status, ...JSON.parse(row.payload), decision: row.decision, respondedAt: row.responded_at })
  }
  const body = await request.json().catch(() => null), token = clean(body?.token, 180), decision = clean(body?.decision, 20).toUpperCase(), notes = clean(body?.notes, 1000)
  if (!tokenOkay(token) || !['ACCEPT', 'DECLINE'].includes(decision)) return json({ ok: false, error: 'Choose interested or decline.' }, 400)
  const row = await env.DB.prepare('SELECT status,expires_at,payload FROM crew_offer_sessions WHERE token=?').bind(token).first(); if (!row) return json({ ok: false, error: 'This work offer was not found.' }, 404)
  if (Date.parse(row.expires_at) < Date.now()) return json({ ok: false, error: 'This work offer has expired.' }, 410)
  if (row.status !== 'OPEN') return json({ ok: true, status: row.status, idempotent: true })
  const session = JSON.parse(row.payload), managed = session.coverageType === 'MANAGED_CREW', crewSlotsBid = managed ? Number(body?.crewSlotsBid || session.crewSizeCovered) : 1, payoutBidAmount = Number(body?.payoutBidAmount || session.offerAmount)
  if (decision === 'ACCEPT' && (!Number.isInteger(crewSlotsBid) || crewSlotsBid < 1 || crewSlotsBid > Number(session.crewSizeCovered || 1))) return json({ ok: false, error: `Crew slots bid must be from 1 to ${Number(session.crewSizeCovered || 1)}.` }, 400)
  if (decision === 'ACCEPT' && (!Number.isFinite(payoutBidAmount) || payoutBidAmount <= 0 || payoutBidAmount > Number(session.offerAmount || 0))) return json({ ok: false, error: 'Payout bid must be positive and cannot exceed the offered ceiling.' }, 400)
  const now = new Date().toISOString(), id = `CREW-${crypto.randomUUID()}`, status = decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', payload = { offerId: session.offerId, jobId: session.jobId, decision, notes, crewSlotsBid, payoutBidAmount, submittedAt: now }
  await env.DB.batch([env.DB.prepare('UPDATE crew_offer_sessions SET status=?,updated_at=?,decision=?,notes=?,responded_at=? WHERE token=?').bind(status, now, decision, notes, now, token), env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(id, 'CREW_OFFER_RESPONSE', 'NEW', now, now, '', JSON.stringify(payload))])
  return json({ ok: true, status, message: decision === 'ACCEPT' ? 'Your interest was recorded. This does not assign you to the job; the operations manager will send a separate assignment decision.' : 'Your decline was recorded.' })
}

async function publishCrewWallet(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null), teamMemberId = clean(body?.teamMemberId, 100)
  if (!teamMemberId || !body?.balances || !Array.isArray(body?.earnings) || !Array.isArray(body?.payouts)) return json({ ok: false, error: 'Invalid crew wallet snapshot.' }, 400)
  const now = new Date().toISOString()
  const payload = { teamMemberId, name: clean(body.name), businessName: clean(body.businessName), payout: body.payout || {}, balances: body.balances || {}, earnings: body.earnings.slice(0, 50), payouts: body.payouts.slice(0, 25), updatedAt: clean(body.updatedAt, 50) || now }
  await env.DB.prepare('INSERT INTO crew_wallets (team_member_id,updated_at,payload) VALUES (?,?,?) ON CONFLICT(team_member_id) DO UPDATE SET updated_at=excluded.updated_at,payload=excluded.payload').bind(teamMemberId, now, JSON.stringify(payload)).run()
  return json({ ok: true, teamMemberId, updatedAt: now })
}

async function crewWallet(request, env, url) {
  const token = clean(url.searchParams.get('token'), 180)
  if (!tokenOkay(token)) return json({ ok: false, error: 'This crew wallet link is invalid.' }, 400)
  const session = await env.DB.prepare('SELECT payload FROM crew_offer_sessions WHERE token=?').bind(token).first()
  if (!session) return json({ ok: false, error: 'This crew access link was not found.' }, 404)
  const teamMemberId = clean(JSON.parse(session.payload).teamMemberId, 100)
  if (!teamMemberId) return json({ ok: false, error: 'This older link does not include wallet access. Ask operations for a new work opportunity link.' }, 409)
  const wallet = await env.DB.prepare('SELECT payload,updated_at FROM crew_wallets WHERE team_member_id=?').bind(teamMemberId).first()
  if (!wallet) return json({ ok: true, empty: true, balances: { pendingQa: 0, available: 0, processing: 0, paid: 0, attention: 0 }, earnings: [], payouts: [] })
  return json({ ok: true, ...JSON.parse(wallet.payload), syncedAt: wallet.updated_at })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.hostname === 'www.marlboromanorcleaning.com') { url.hostname = 'marlboromanorcleaning.com'; return Response.redirect(url.toString(), 301) }
    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return json({ ok: false, error: 'Public workflow storage is not configured.' }, 503)
      await ensureSchema(env.DB)
      try {
        if (url.pathname === '/api/health') return json({ ok: true, service: 'marble-public-workflows', version: '2.1.0', customerServiceHub: true, brandedAppointment: true, brandedPayment: true, compliantFeedback: true, persistentCrewAccess: true, crewJobExecution: true, portalMessaging: true, operationsReplies: true, portalAnalytics: true, smsWebhooks: Boolean(env.TWILIO_AUTH_TOKEN), voiceWebhooks: Boolean(env.TWILIO_AUTH_TOKEN), crewOffers: true, managedCrewBids: true, crewWallets: true, securePreparation: Boolean(env.ACCESS_VAULT_KEY || env.MARBLE_QUEUE_SECRET) })
        const external = await handleExternalPortal(request, env, url)
        if (external) return external
        if (url.pathname === '/api/twilio/inbound' && request.method === 'POST') return twilioWebhook(request, env, 'SMS_INBOUND')
        if (url.pathname === '/api/twilio/status' && request.method === 'POST') return twilioWebhook(request, env, 'SMS_STATUS')
        if (url.pathname === '/api/twilio/voice/inbound' && request.method === 'POST') return twilioVoiceWebhook(request, env, 'VOICE_INBOUND')
        if (url.pathname === '/api/twilio/voice/gather' && request.method === 'POST') return twilioVoiceWebhook(request, env, 'VOICE_GATHER')
        if (url.pathname === '/api/twilio/voice/status' && request.method === 'POST') return twilioVoiceWebhook(request, env, 'VOICE_STATUS')
        if (url.pathname === '/api/quote' && request.method === 'POST') return submitQuote(request, env)
        if (url.pathname === '/api/scheduling' && ['GET', 'POST'].includes(request.method)) return scheduling(request, env, url)
        if (url.pathname === '/api/preparation' && ['GET', 'POST'].includes(request.method)) return preparation(request, env, url)
        if (url.pathname === '/api/crew-offer' && ['GET', 'POST'].includes(request.method)) return crewOffer(request, env, url)
        if (url.pathname === '/api/crew-wallet' && request.method === 'GET') return crewWallet(request, env, url)
        if (url.pathname === '/api/marble/queue' && ['GET', 'POST'].includes(request.method)) return marbleQueue(request, env, url)
        if (url.pathname === '/api/marble/scheduling' && request.method === 'POST') return publishSchedule(request, env)
        if (url.pathname === '/api/marble/preparation' && request.method === 'POST') return publishPreparation(request, env)
        if (url.pathname === '/api/marble/preparation/status' && request.method === 'GET') return preparationStatus(request, env, url)
        if (url.pathname === '/api/marble/preparation/reveal' && request.method === 'POST') return revealPreparation(request, env)
        if (url.pathname === '/api/marble/preparation/departure' && request.method === 'POST') return secureDeparture(request, env)
        if (url.pathname === '/api/marble/crew-offer' && request.method === 'POST') return publishCrewOffer(request, env)
        if (url.pathname === '/api/marble/crew-wallet' && request.method === 'POST') return publishCrewWallet(request, env)
        return json({ ok: false, error: 'Not found' }, 404)
      } catch (error) { console.error('Public workflow error', error); return json({ ok: false, error: 'We could not complete that request. Please try again.' }, 500) }
    }
    return env.ASSETS.fetch(request)
  }
}
