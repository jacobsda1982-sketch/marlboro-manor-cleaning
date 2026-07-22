const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max)
const emailOkay = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const tokenOkay = value => /^[A-Za-z0-9_-]{24,160}$/.test(value)

async function ensureSchema(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS public_intake (id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, email TEXT, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, processed_at TEXT, private_reference TEXT, error TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_public_intake_queue ON public_intake(kind,status,created_at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS scheduling_sessions (token TEXT PRIMARY KEY, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL, selected_option_id TEXT, customer_notes TEXT, confirmed_at TEXT)')
  ])
}

const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
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
    return json({ ok: true, status: row.status, ...JSON.parse(row.payload), selectedOptionId: row.selected_option_id, confirmedAt: row.confirmed_at })
  }
  const body = await request.json().catch(() => null), token = clean(body?.token, 180), optionId = clean(body?.optionId, 100)
  if (!tokenOkay(token) || !optionId) return json({ ok: false, error: 'Choose an available appointment option.' }, 400)
  const row = await env.DB.prepare('SELECT status,expires_at,payload FROM scheduling_sessions WHERE token=?').bind(token).first()
  if (!row) return json({ ok: false, error: 'This scheduling request was not found.' }, 404)
  if (row.status === 'CONFIRMED') return json({ ok: true, status: 'CONFIRMED', idempotent: true })
  if (Date.parse(row.expires_at) < Date.now()) return json({ ok: false, error: 'This scheduling link has expired.' }, 410)
  const session = JSON.parse(row.payload), option = (session.options || []).find(item => String(item.id) === optionId)
  if (!option) return json({ ok: false, error: 'That appointment option is no longer available.' }, 409)
  const now = new Date().toISOString(), id = `SCHED-${crypto.randomUUID()}`, notes = clean(body.notes, 1000)
  const responsePayload = { token, schedulingRequestId: session.schedulingRequestId, quoteId: session.quoteId, optionId, option, notes, submittedAt: now }
  await env.DB.batch([
    env.DB.prepare('UPDATE scheduling_sessions SET status=?,updated_at=?,selected_option_id=?,customer_notes=?,confirmed_at=? WHERE token=?').bind('CUSTOMER_SELECTED', now, optionId, notes, now, token),
    env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)').bind(id, 'SCHEDULING', 'NEW', now, now, clean(session.customerEmail).toLowerCase(), JSON.stringify(responsePayload))
  ])
  return json({ ok: true, status: 'CUSTOMER_SELECTED', message: 'Your selection was received. We will email the final confirmation after availability is verified.' })
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.hostname === 'www.marlboromanorcleaning.com') { url.hostname = 'marlboromanorcleaning.com'; return Response.redirect(url.toString(), 301) }
    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return json({ ok: false, error: 'Public workflow storage is not configured.' }, 503)
      await ensureSchema(env.DB)
      try {
        if (url.pathname === '/api/health') return json({ ok: true, service: 'marble-public-workflows', version: '1.1.0', smsWebhooks: Boolean(env.TWILIO_AUTH_TOKEN) })
        if (url.pathname === '/api/twilio/inbound' && request.method === 'POST') return twilioWebhook(request, env, 'SMS_INBOUND')
        if (url.pathname === '/api/twilio/status' && request.method === 'POST') return twilioWebhook(request, env, 'SMS_STATUS')
        if (url.pathname === '/api/quote' && request.method === 'POST') return submitQuote(request, env)
        if (url.pathname === '/api/scheduling' && ['GET', 'POST'].includes(request.method)) return scheduling(request, env, url)
        if (url.pathname === '/api/marble/queue' && ['GET', 'POST'].includes(request.method)) return marbleQueue(request, env, url)
        if (url.pathname === '/api/marble/scheduling' && request.method === 'POST') return publishSchedule(request, env)
        return json({ ok: false, error: 'Not found' }, 404)
      } catch (error) { console.error('Public workflow error', error); return json({ ok: false, error: 'We could not complete that request. Please try again.' }, 500) }
    }
    return env.ASSETS.fetch(request)
  }
}
