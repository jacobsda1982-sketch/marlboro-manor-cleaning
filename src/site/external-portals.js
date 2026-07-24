const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  }
})

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max)
const tokenOkay = value => /^[A-Za-z0-9_-]{24,160}$/.test(value)
const sessionTables = Object.freeze({
  service: 'service_portal_sessions',
  appointment: 'appointment_portal_sessions',
  payment: 'payment_portal_sessions',
  feedback: 'feedback_portal_sessions'
})

export const externalPortalSchema = [
  'CREATE TABLE IF NOT EXISTS service_portal_sessions (token_hash TEXT PRIMARY KEY, job_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_service_portal_job ON service_portal_sessions(job_id,updated_at)',
  'CREATE TABLE IF NOT EXISTS appointment_portal_sessions (token_hash TEXT PRIMARY KEY, job_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_appointment_portal_job ON appointment_portal_sessions(job_id,updated_at)',
  'CREATE TABLE IF NOT EXISTS payment_portal_sessions (token_hash TEXT PRIMARY KEY, job_id TEXT NOT NULL, request_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_payment_portal_request ON payment_portal_sessions(request_id,updated_at)',
  'CREATE INDEX IF NOT EXISTS idx_payment_portal_job ON payment_portal_sessions(job_id,updated_at)',
  'CREATE TABLE IF NOT EXISTS feedback_portal_sessions (token_hash TEXT PRIMARY KEY, job_id TEXT NOT NULL, request_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_feedback_portal_request ON feedback_portal_sessions(request_id,updated_at)',
  'CREATE TABLE IF NOT EXISTS crew_access_sessions (token_hash TEXT PRIMARY KEY, team_member_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_crew_access_member ON crew_access_sessions(team_member_id,updated_at)',
  'CREATE TABLE IF NOT EXISTS portal_messages (id TEXT PRIMARY KEY, session_type TEXT NOT NULL, session_hash TEXT NOT NULL, case_id TEXT, sender_type TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_portal_messages_session ON portal_messages(session_type,session_hash,created_at)',
  'CREATE TABLE IF NOT EXISTS portal_events (id TEXT PRIMARY KEY, event_name TEXT NOT NULL, route TEXT NOT NULL, session_type TEXT, session_fingerprint TEXT, detail TEXT, created_at TEXT NOT NULL)'
]

async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function authorized(request, env) {
  const expected = clean(env.MARBLE_QUEUE_SECRET, 300)
  return Boolean(expected) && clean(request.headers.get('authorization'), 400) === `Bearer ${expected}`
}

function cookieValue(request, name) {
  const match = String(request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function tokenFrom(request, url, body, cookieName) {
  return clean(body?.token || url.searchParams.get('token') || cookieValue(request, cookieName), 180)
}

function sessionCookie(name, token, expiresAt) {
  const expires = Date.parse(expiresAt)
  const maxAge = Number.isFinite(expires) ? Math.max(60, Math.floor((expires - Date.now()) / 1000)) : 86400
  return `${name}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
}

function safePayload(row) {
  try { return JSON.parse(row.payload || '{}') } catch { return {} }
}

async function queue(env, kind, payload, email = '') {
  const id = `${kind}-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO public_intake (id,kind,status,created_at,updated_at,email,payload) VALUES (?,?,?,?,?,?,?)')
    .bind(id, kind, 'NEW', now, now, clean(email).toLowerCase(), JSON.stringify(payload)).run()
  return id
}

async function getSession(db, type, token) {
  if (!tokenOkay(token) || !sessionTables[type]) return null
  const hash = await sha256(token)
  const row = await db.prepare(`SELECT * FROM ${sessionTables[type]} WHERE token_hash=?`).bind(hash).first()
  if (!row) return null
  if (Date.parse(row.expires_at) < Date.now()) return { expired: true, row, hash }
  return { row, hash, payload: safePayload(row) }
}

async function upsertBasicSession(env, type, body) {
  const table = sessionTables[type]
  const now = new Date().toISOString()
  const jobId = clean(body?.jobId, 100)
  const status = clean(body?.status || 'OPEN', 50)
  const expiresAt = clean(body?.expiresAt, 50)
  if (!table || !jobId || !expiresAt) return json({ ok: false, error: 'Invalid portal session.' }, 400)
  const incoming = body.payload && typeof body.payload === 'object' ? body.payload : {}

  if (!body.token) {
    const current = await env.DB.prepare(`SELECT * FROM ${table} WHERE job_id=? ORDER BY updated_at DESC LIMIT 1`).bind(jobId).first()
    if (!current) return json({ ok: false, error: 'Portal session not found for this job.' }, 404)
    const previous = safePayload(current)
    const payload = { ...previous, ...incoming, links: { ...(previous.links || {}), ...(incoming.links || {}) } }
    await env.DB.prepare(`UPDATE ${table} SET status=?,expires_at=?,updated_at=?,payload=? WHERE token_hash=?`)
      .bind(status, expiresAt, now, JSON.stringify(payload), current.token_hash).run()
    return json({ ok: true, jobId, status })
  }

  const token = clean(body.token, 180)
  if (!tokenOkay(token)) return json({ ok: false, error: 'Invalid portal token.' }, 400)
  const hash = await sha256(token)
  const existing = await env.DB.prepare(`SELECT payload FROM ${table} WHERE token_hash=?`).bind(hash).first()
  const previous = existing ? safePayload(existing) : {}
  const payload = { ...previous, ...incoming, links: { ...(previous.links || {}), ...(incoming.links || {}) } }
  await env.DB.prepare(`INSERT INTO ${table} (token_hash,job_id,status,expires_at,created_at,updated_at,payload)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET job_id=excluded.job_id,status=excluded.status,
    expires_at=excluded.expires_at,updated_at=excluded.updated_at,payload=excluded.payload`)
    .bind(hash, jobId, status, expiresAt, now, now, JSON.stringify(payload)).run()
  const route = type === 'service' ? '/my-service/' : `/${type}/`
  return json({ ok: true, jobId, status, url: `https://marlboromanorcleaning.com${route}?token=${encodeURIComponent(token)}` })
}

async function publishPayment(env, body) {
  const now = new Date().toISOString()
  const requestId = clean(body?.requestId, 100)
  const jobId = clean(body?.jobId, 100)
  const status = clean(body?.status || 'OPEN', 50)
  const expiresAt = clean(body?.expiresAt, 50)
  const incoming = body.payload && typeof body.payload === 'object' ? body.payload : {}
  if (!requestId || !jobId || !expiresAt) return json({ ok: false, error: 'Invalid payment session.' }, 400)
  let current
  if (body.token) {
    const token = clean(body.token, 180)
    if (!tokenOkay(token)) return json({ ok: false, error: 'Invalid payment token.' }, 400)
    const hash = await sha256(token)
    current = await env.DB.prepare('SELECT payload FROM payment_portal_sessions WHERE token_hash=?').bind(hash).first()
    const payload = { ...(current ? safePayload(current) : {}), ...incoming }
    await env.DB.prepare(`INSERT INTO payment_portal_sessions (token_hash,job_id,request_id,status,expires_at,created_at,updated_at,payload)
      VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET job_id=excluded.job_id,request_id=excluded.request_id,
      status=excluded.status,expires_at=excluded.expires_at,updated_at=excluded.updated_at,payload=excluded.payload`)
      .bind(hash, jobId, requestId, status, expiresAt, now, now, JSON.stringify(payload)).run()
    return json({ ok: true, requestId, status, url: `https://marlboromanorcleaning.com/payment/?token=${encodeURIComponent(token)}` })
  }
  current = await env.DB.prepare('SELECT * FROM payment_portal_sessions WHERE request_id=? ORDER BY updated_at DESC LIMIT 1').bind(requestId).first()
  if (!current) return json({ ok: false, error: 'Payment session not found.' }, 404)
  const payload = { ...safePayload(current), ...incoming }
  await env.DB.prepare('UPDATE payment_portal_sessions SET status=?,expires_at=?,updated_at=?,payload=? WHERE token_hash=?')
    .bind(status, expiresAt, now, JSON.stringify(payload), current.token_hash).run()
  return json({ ok: true, requestId, status })
}

async function publishFeedback(env, body) {
  const now = new Date().toISOString()
  const token = clean(body?.token, 180)
  const requestId = clean(body?.requestId, 100)
  const jobId = clean(body?.jobId, 100)
  const expiresAt = clean(body?.expiresAt, 50)
  if (!tokenOkay(token) || !requestId || !jobId || !expiresAt) return json({ ok: false, error: 'Invalid feedback session.' }, 400)
  const hash = await sha256(token)
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}
  await env.DB.prepare(`INSERT INTO feedback_portal_sessions (token_hash,job_id,request_id,status,expires_at,created_at,updated_at,payload)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET status=excluded.status,expires_at=excluded.expires_at,
    updated_at=excluded.updated_at,payload=excluded.payload`)
    .bind(hash, jobId, requestId, clean(body.status || 'OPEN', 50), expiresAt, now, now, JSON.stringify(payload)).run()
  return json({ ok: true, requestId, url: `https://marlboromanorcleaning.com/feedback/?token=${encodeURIComponent(token)}` })
}

async function servicePortal(request, env, url) {
  const token = tokenFrom(request, url, null, 'mmc_service')
  const session = await getSession(env.DB, 'service', token)
  if (!session) return json({ ok: false, error: 'This service link is invalid.' }, 400)
  if (session.expired) return json({ ok: false, error: 'This service link has expired. Contact us for a fresh link.' }, 410)
  const messages = await env.DB.prepare('SELECT id,sender_type,body,status,created_at FROM portal_messages WHERE session_type=? AND session_hash=? ORDER BY created_at DESC LIMIT 30')
    .bind('CUSTOMER', session.hash).all()
  return json({
    ok: true,
    status: session.row.status,
    ...session.payload,
    messages: [...messages.results].reverse()
  }, 200, { 'set-cookie': sessionCookie('mmc_service', token, session.row.expires_at) })
}

async function appointmentPortal(request, env, url) {
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null
  const token = tokenFrom(request, url, body, 'mmc_appointment')
  const session = await getSession(env.DB, 'appointment', token)
  if (!session) return json({ ok: false, error: 'This appointment link is invalid.' }, 400)
  if (session.expired) return json({ ok: false, error: 'This appointment link has expired. Contact scheduling for help.' }, 410)
  if (request.method === 'GET') {
    return json({ ok: true, status: session.row.status, ...session.payload }, 200, {
      'set-cookie': sessionCookie('mmc_appointment', token, session.row.expires_at)
    })
  }
  const action = clean(body?.action, 30).toUpperCase()
  if (!['READY', 'RESCHEDULE', 'CANCEL'].includes(action)) return json({ ok: false, error: 'Choose an appointment action.' }, 400)
  if (['RESCHEDULE', 'CANCEL'].includes(action) && !clean(body?.reason, 300)) return json({ ok: false, error: 'Please provide a reason.' }, 400)
  if (action === 'RESCHEDULE' && !/^\d{4}-\d{2}-\d{2}$/.test(clean(body?.requestedDate, 20))) return json({ ok: false, error: 'Choose a preferred date.' }, 400)
  const now = new Date().toISOString()
  const event = {
    jobId: session.row.job_id,
    action,
    requestedDate: clean(body?.requestedDate, 20),
    timeWindow: clean(body?.timeWindow, 40),
    reason: clean(body?.reason, 300),
    notes: clean(body?.notes, 1000),
    submittedAt: now
  }
  const id = await queue(env, 'APPOINTMENT_REQUEST', event, session.payload.customerEmail)
  const nextStatus = action === 'READY' ? 'READY_SUBMITTED' : 'CHANGE_PENDING'
  await env.DB.prepare('UPDATE appointment_portal_sessions SET status=?,updated_at=? WHERE token_hash=?')
    .bind(nextStatus, now, session.hash).run()
  return json({ ok: true, status: nextStatus, reference: id, message: action === 'READY'
    ? 'Your readiness details were received.'
    : 'Your request is waiting for review. The current appointment remains active until we confirm a change.' })
}

async function paymentPortal(request, env, url) {
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null
  const token = tokenFrom(request, url, body, 'mmc_payment')
  const session = await getSession(env.DB, 'payment', token)
  if (!session) return json({ ok: false, error: 'This payment link is invalid.' }, 400)
  if (session.expired) return json({ ok: false, error: 'This payment link has expired. Contact billing for help.' }, 410)
  if (request.method === 'GET') {
    return json({ ok: true, status: session.row.status, requestId: session.row.request_id, ...session.payload }, 200, {
      'set-cookie': sessionCookie('mmc_payment', token, session.row.expires_at)
    })
  }
  const action = clean(body?.action, 30).toUpperCase()
  if (action === 'CONSENT') {
    const consentName = clean(body?.consentName, 120)
    if (!body?.accepted || consentName.length < 2) return json({ ok: false, error: 'Enter your name and accept the cancellation policy.' }, 400)
    const now = new Date().toISOString()
    await env.DB.prepare('UPDATE payment_portal_sessions SET status=?,updated_at=? WHERE token_hash=?')
      .bind('CONSENT_RECORDED', now, session.hash).run()
    await queue(env, 'CARD_SETUP_CONSENT', {
      requestId: session.row.request_id,
      jobId: session.row.job_id,
      token,
      consentName,
      policyVersion: clean(session.payload.policyVersion, 100),
      consentAt: now
    }, session.payload.customerEmail)
    return json({ ok: true, status: 'CONSENT_RECORDED', message: 'Your agreement was recorded. The secure Stripe page is being prepared.' })
  }
  if (action === 'VERIFY') {
    const sessionId = clean(body?.sessionId, 200)
    if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return json({ ok: false, error: 'Stripe confirmation reference is invalid.' }, 400)
    await queue(env, 'CARD_SETUP_VERIFY', {
      requestId: session.row.request_id,
      jobId: session.row.job_id,
      checkoutSessionId: sessionId,
      verifiedAt: new Date().toISOString()
    }, session.payload.customerEmail)
    await env.DB.prepare('UPDATE payment_portal_sessions SET status=?,updated_at=? WHERE token_hash=?')
      .bind('VERIFYING', new Date().toISOString(), session.hash).run()
    return json({ ok: true, status: 'VERIFYING' })
  }
  return json({ ok: false, error: 'Unsupported payment action.' }, 400)
}

async function feedbackPortal(request, env, url) {
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null
  const token = tokenFrom(request, url, body, 'mmc_feedback')
  const session = await getSession(env.DB, 'feedback', token)
  if (!session) return json({ ok: false, error: 'This feedback link is invalid.' }, 400)
  if (session.expired) return json({ ok: false, error: 'This feedback link has expired.' }, 410)
  if (request.method === 'GET') {
    return json({ ok: true, status: session.row.status, submitted: session.row.status !== 'OPEN', ...session.payload }, 200, {
      'set-cookie': sessionCookie('mmc_feedback', token, session.row.expires_at)
    })
  }
  if (session.row.status !== 'OPEN') return json({ ok: true, status: session.row.status, idempotent: true, ...session.payload })
  const rating = Number(body?.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ ok: false, error: 'Choose a rating from one to five.' }, 400)
  const comments = clean(body?.comments, 2000)
  const now = new Date().toISOString()
  const nextStatus = rating < 4 ? 'SERVICE_RECOVERY' : 'SUBMITTED'
  await env.DB.prepare('UPDATE feedback_portal_sessions SET status=?,updated_at=?,payload=? WHERE token_hash=?')
    .bind(nextStatus, now, JSON.stringify({ ...session.payload, rating, comments, submittedAt: now }), session.hash).run()
  await queue(env, 'FEEDBACK', {
    requestId: session.row.request_id,
    jobId: session.row.job_id,
    rating,
    comments,
    submittedAt: now
  }, session.payload.customerEmail)
  return json({
    ok: true,
    status: nextStatus,
    message: rating < 4 ? 'Thank you. A care coordinator will review your concern.' : 'Thank you for sharing your experience.',
    reviewUrl: clean(session.payload.reviewUrl, 1000),
    referralCode: clean(session.payload.referralCode, 100)
  })
}

async function crewSession(request, env, url) {
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null
  const token = tokenFrom(request, url, body, 'mmc_crew')
  if (!tokenOkay(token)) return json({ ok: false, error: 'This crew access link is invalid.' }, 400)
  const hash = await sha256(token)
  const access = await env.DB.prepare('SELECT * FROM crew_access_sessions WHERE token_hash=?').bind(hash).first()
  if (!access) return json({ ok: false, error: 'This crew access link was not found.' }, 404)
  if (Date.parse(access.expires_at) < Date.now()) return json({ ok: false, error: 'This crew access link has expired. Ask operations for a new link.' }, 410)
  const allOffers = await env.DB.prepare('SELECT offer_id,status,expires_at,payload,decision,responded_at FROM crew_offer_sessions ORDER BY updated_at DESC').all()
  const offers = allOffers.results
    .map(row => ({ row, payload: safePayload(row) }))
    .filter(item => clean(item.payload.teamMemberId, 100) === access.team_member_id)
    .map(item => ({ offerId: item.row.offer_id, status: item.row.status, expiresAt: item.row.expires_at, decision: item.row.decision, respondedAt: item.row.responded_at, ...item.payload }))
  const wallet = await env.DB.prepare('SELECT payload,updated_at FROM crew_wallets WHERE team_member_id=?').bind(access.team_member_id).first()
  const messages = await env.DB.prepare('SELECT id,sender_type,body,status,created_at FROM portal_messages WHERE session_type=? AND session_hash=? ORDER BY created_at DESC LIMIT 30')
    .bind('CREW', hash).all()
  if (request.method === 'GET') {
    return json({
      ok: true,
      profile: safePayload(access),
      offers,
      wallet: wallet ? { ...safePayload(wallet), syncedAt: wallet.updated_at } : null,
      messages: [...messages.results].reverse()
    }, 200, { 'set-cookie': sessionCookie('mmc_crew', token, access.expires_at) })
  }
  const offerId = clean(body?.offerId, 100)
  const decision = clean(body?.decision, 20).toUpperCase()
  if (!offerId || !['ACCEPT', 'DECLINE'].includes(decision)) return json({ ok: false, error: 'Choose an opportunity and response.' }, 400)
  const matched = offers.find(offer => offer.offerId === offerId)
  if (!matched) return json({ ok: false, error: 'This opportunity is not available to your account.' }, 404)
  if (Date.parse(matched.expiresAt) < Date.now()) return json({ ok: false, error: 'This work opportunity has expired.' }, 410)
  if (matched.status !== 'OPEN') return json({ ok: true, status: matched.status, idempotent: true })
  const managed = matched.coverageType === 'MANAGED_CREW'
  const crewSlotsBid = managed ? Number(body?.crewSlotsBid || matched.crewSizeCovered) : 1
  const payoutBidAmount = Number(body?.payoutBidAmount || matched.offerAmount)
  if (!Number.isInteger(crewSlotsBid) || crewSlotsBid < 1 || crewSlotsBid > Number(matched.crewSizeCovered || 1)) return json({ ok: false, error: 'Crew coverage is outside the offered range.' }, 400)
  if (!Number.isFinite(payoutBidAmount) || payoutBidAmount <= 0 || payoutBidAmount > Number(matched.offerAmount || 0)) return json({ ok: false, error: 'Payout bid is outside the offered range.' }, 400)
  const now = new Date().toISOString()
  const status = decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
  await env.DB.prepare('UPDATE crew_offer_sessions SET status=?,updated_at=?,decision=?,notes=?,responded_at=? WHERE offer_id=?')
    .bind(status, now, decision, clean(body?.notes, 1000), now, offerId).run()
  await queue(env, 'CREW_OFFER_RESPONSE', {
    offerId,
    jobId: matched.jobId,
    decision,
    notes: clean(body?.notes, 1000),
    crewSlotsBid,
    payoutBidAmount,
    submittedAt: now
  })
  return json({ ok: true, status, message: decision === 'ACCEPT'
    ? 'Your bid was recorded. Operations will send a separate assignment decision.'
    : 'Your decline was recorded.' })
}

async function portalMessage(request, env, url) {
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null
  const audience = clean(body?.audience || url.searchParams.get('audience') || 'CUSTOMER', 20).toUpperCase()
  const cookieName = audience === 'CREW' ? 'mmc_crew' : 'mmc_service'
  const token = tokenFrom(request, url, body, cookieName)
  if (!tokenOkay(token)) return json({ ok: false, error: 'Portal access is required.' }, 401)
  const hash = await sha256(token)
  let caseId = ''
  if (audience === 'CREW') {
    const session = await env.DB.prepare('SELECT team_member_id,expires_at FROM crew_access_sessions WHERE token_hash=?').bind(hash).first()
    if (!session || Date.parse(session.expires_at) < Date.now()) return json({ ok: false, error: 'Crew access has expired.' }, 401)
    caseId = clean(body?.caseId, 100)
  } else {
    const session = await env.DB.prepare('SELECT job_id,expires_at FROM service_portal_sessions WHERE token_hash=?').bind(hash).first()
    if (!session || Date.parse(session.expires_at) < Date.now()) return json({ ok: false, error: 'Service access has expired.' }, 401)
    caseId = session.job_id
  }
  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT id,sender_type,body,status,created_at FROM portal_messages WHERE session_type=? AND session_hash=? ORDER BY created_at DESC LIMIT 30')
      .bind(audience, hash).all()
    return json({ ok: true, messages: [...result.results].reverse() })
  }
  const message = clean(body?.message, 2000)
  if (message.length < 2) return json({ ok: false, error: 'Enter a message.' }, 400)
  const now = new Date().toISOString()
  const id = `MSG-${crypto.randomUUID()}`
  await env.DB.prepare('INSERT INTO portal_messages (id,session_type,session_hash,case_id,sender_type,body,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, audience, hash, caseId, audience, message, 'QUEUED', now, now).run()
  await queue(env, audience === 'CREW' ? 'CREW_PORTAL_MESSAGE' : 'CUSTOMER_PORTAL_MESSAGE', {
    messageId: id,
    caseId,
    body: message,
    submittedAt: now
  })
  return json({ ok: true, messageId: id, status: 'QUEUED' })
}

async function portalEvent(request, env) {
  const body = await request.json().catch(() => null)
  const eventName = clean(body?.eventName, 80)
  const route = clean(body?.route, 120)
  if (!eventName || !route) return json({ ok: false }, 400)
  const token = clean(body?.token, 180)
  const fingerprint = tokenOkay(token) ? (await sha256(token)).slice(0, 16) : ''
  const id = `EVT-${crypto.randomUUID()}`
  await env.DB.prepare('INSERT INTO portal_events (id,event_name,route,session_type,session_fingerprint,detail,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, eventName, route, clean(body?.sessionType, 30), fingerprint, JSON.stringify(body?.detail || {}), new Date().toISOString()).run()
  return json({ ok: true }, 202)
}

async function publishCrewAccess(env, body) {
  const token = clean(body?.token, 180)
  const teamMemberId = clean(body?.teamMemberId, 100)
  if (!tokenOkay(token) || !teamMemberId) return json({ ok: false, error: 'Invalid crew access session.' }, 400)
  const now = new Date().toISOString()
  const expiresAt = clean(body?.accessExpiresAt, 50) || new Date(Date.now() + 90 * 86400000).toISOString()
  const hash = await sha256(token)
  const payload = { name: clean(body?.contractorName, 200), role: clean(body?.role, 100) }
  await env.DB.prepare(`INSERT INTO crew_access_sessions (token_hash,team_member_id,expires_at,created_at,updated_at,payload)
    VALUES (?,?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET team_member_id=excluded.team_member_id,
    expires_at=excluded.expires_at,updated_at=excluded.updated_at,payload=excluded.payload`)
    .bind(hash, teamMemberId, expiresAt, now, now, JSON.stringify(payload)).run()
  return json({ ok: true, url: `https://marlboromanorcleaning.com/crew/?token=${encodeURIComponent(token)}` })
}

export async function handleExternalPortal(request, env, url) {
  const publicRoutes = {
    '/api/my-service': servicePortal,
    '/api/appointment': appointmentPortal,
    '/api/payment': paymentPortal,
    '/api/feedback': feedbackPortal,
    '/api/crew-session': crewSession,
    '/api/portal-message': portalMessage
  }
  if (publicRoutes[url.pathname] && ['GET', 'POST'].includes(request.method)) return publicRoutes[url.pathname](request, env, url)
  if (url.pathname === '/api/portal-event' && request.method === 'POST') return portalEvent(request, env)
  if (!url.pathname.startsWith('/api/marble/')) return null
  if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401)
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null
  if (url.pathname === '/api/marble/service-session' && request.method === 'POST') return upsertBasicSession(env, 'service', body)
  if (url.pathname === '/api/marble/appointment' && request.method === 'POST') return upsertBasicSession(env, 'appointment', body)
  if (url.pathname === '/api/marble/payment' && request.method === 'POST') return publishPayment(env, body)
  if (url.pathname === '/api/marble/feedback' && request.method === 'POST') return publishFeedback(env, body)
  if (url.pathname === '/api/marble/crew-session' && request.method === 'POST') return publishCrewAccess(env, body)
  return null
}
