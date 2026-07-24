const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const show = (target, message, error = false) => { target.hidden = false; target.className = `form-status${error ? ' form-status-error' : ''}`; target.textContent = message }
const serviceNames = { 'MMC-MAINT': 'Maintenance clean', 'MMC-DETAIL': 'Detail / deep clean', 'MMC-MOVEIN': 'Move-in clean', 'MMC-MOVEOUT': 'Move-out clean' }
const frequencyNames = { ONE_TIME: 'One time', WEEKLY: 'Weekly', BIWEEKLY: 'Biweekly', EVERY_FOUR_WEEKS: 'Every four weeks' }
const addOnNames = { 'AO-OVEN': 'Oven interior', 'AO-FRIDGE': 'Refrigerator interior', 'AO-WINDOWS': 'Interior windows', 'AO-BLINDS': 'Blinds' }
const portalToken = () => new URLSearchParams(location.search).get('token') || ''
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
const friendlyStatus = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase())

async function api(path, options = {}) {
  const response = await fetch(path, options)
  const output = await response.json().catch(() => ({}))
  if (!response.ok || !output.ok) throw new Error(output.error || 'The request could not be completed.')
  return output
}

function forgetPortalToken() {
  if (new URLSearchParams(location.search).has('token')) history.replaceState({}, '', location.pathname)
}

function trackPortal(eventName, sessionType, detail = {}) {
  fetch('/api/portal-event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ eventName, route: location.pathname, sessionType, token: portalToken(), detail })
  }).catch(() => {})
}

function quotePayload(form) {
  const data = Object.fromEntries(new FormData(form).entries())
  const addOns = $$('[name="addOn"]:checked', form).map(input => ({ code: input.value, quantity: input.value === 'AO-BLINDS' ? Number($('#blindsQuantity')?.value || 1) : 1 }))
  return { ...data, finishedBasement: data.finishedBasement === 'on', pets: data.pets === 'on', consent: data.consent === 'on', smsConsent: data.smsConsent === 'on', addOns }
}

function saveDraft(form) {
  const values = {}
  $$('input,select,textarea', form).forEach(field => {
    if (!field.name || field.name === 'website' || field.name === 'consent') return
    if (field.type === 'checkbox' || field.type === 'radio') values[field.name === 'addOn' ? `${field.name}:${field.value}` : field.name] = field.checked
    else values[field.name] = field.value
  })
  localStorage.setItem('mmc-quote-draft', JSON.stringify({ values, savedAt: Date.now() }))
  const state = $('#draft-state'); if (state) state.textContent = 'Progress saved just now.'
}

function restoreDraft(form) {
  try {
    const draft = JSON.parse(localStorage.getItem('mmc-quote-draft') || 'null')
    if (!draft?.values) return 0
    $$('input,select,textarea', form).forEach(field => {
      const key = field.name === 'addOn' ? `${field.name}:${field.value}` : field.name
      if (!(key in draft.values)) return
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = Boolean(draft.values[key])
      else field.value = draft.values[key]
    })
    $('#draft-state').textContent = 'Saved progress restored.'
    return true
  } catch { return false }
}

function setupQuote() {
  const form = $('#native-quote-form'), status = $('#quote-status'), submit = $('#quote-submit')
  if (!form) return
  const consentRow = $('[name="consent"]', form)?.closest('label')
  if (consentRow && !$('[name="smsConsent"]', form)) consentRow.insertAdjacentHTML('afterend', '<label class="consent-row"><input name="smsConsent" type="checkbox"><span>I agree to receive transactional text messages about this estimate and related appointments. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.</span></label>')
  restoreDraft(form)

  const syncConditionalFields = () => {
    const blinds = $('#addon-blinds'), quantityWrap = $('#blinds-quantity-wrap'), quantity = $('#blindsQuantity')
    quantityWrap.hidden = !blinds.checked; quantity.required = blinds.checked
    const pets = $('#pets-toggle'), petHair = $('#pet-hair-wrap')
    petHair.hidden = !pets.checked
  }
  const renderSummary = () => {
    const data = quotePayload(form)
    const extras = data.addOns.length ? data.addOns.map(item => `${addOnNames[item.code] || item.code}${item.quantity > 1 ? ` (${item.quantity})` : ''}`).join(', ') : 'No add-ons selected'
    const required = $$('[required]', form).filter(field => field.type !== 'radio' || field.checked || !$$(`[name="${field.name}"]:checked`, form).length)
    const complete = required.filter(field => field.type === 'checkbox' ? field.checked : field.type === 'radio' ? $$(`[name="${field.name}"]:checked`, form).length : String(field.value).trim()).length
    const percent = Math.min(100, Math.round((complete / Math.max(required.length, 1)) * 100))
    $('#completion-ring').style.setProperty('--progress', percent)
    $('#completion-percent').textContent = `${percent}%`
    $('#completion-title').textContent = percent === 100 ? 'Ready to submit' : percent > 55 ? 'Almost there' : percent > 20 ? 'Great progress' : 'Let’s get started'
    $('#completion-copy').textContent = percent === 100 ? 'Review your choices, agree to the contact terms, and send your request.' : 'Complete the remaining required details to prepare your estimate.'
    const items = []
    if (data.service) items.push(`<div><span>Service</span><strong>${esc(serviceNames[data.service])}</strong></div>`)
    if (data.frequency) items.push(`<div><span>Frequency</span><strong>${esc(frequencyNames[data.frequency])}</strong></div>`)
    if (data.squareFeet) items.push(`<div><span>Home</span><strong>${esc(data.squareFeet)} sq. ft. · ${esc(data.bedrooms || '—')} bed</strong></div>`)
    if (data.city) items.push(`<div><span>Location</span><strong>${esc(data.city)}, ${esc(data.state || 'MD')} ${esc(data.zip || '')}</strong></div>`)
    if (data.addOns.length) items.push(`<div><span>Add-ons</span><strong>${esc(extras)}</strong></div>`)
    $('#live-quote-summary').innerHTML = `<h3>Your request</h3>${items.length ? items.join('') : '<p class="empty-summary">Selections will appear here as you complete the form.</p>'}`
  }

  syncConditionalFields(); renderSummary()
  form.addEventListener('input', () => { syncConditionalFields(); saveDraft(form); renderSummary() })
  $('#clear-quote-draft').addEventListener('click', () => { localStorage.removeItem('mmc-quote-draft'); form.reset(); syncConditionalFields(); renderSummary(); $('#draft-state').textContent = 'Form cleared.' })
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return
    submit.disabled = true; submit.textContent = 'Submitting securely…'; status.hidden = true
    try {
      const response = await fetch('/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(quotePayload(form)) })
      const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'Submission failed.')
      form.hidden = true; show(status, `Thank you. Your request was received. Reference: ${result.reference}`); localStorage.removeItem('mmc-quote-draft')
    } catch (error) { show(status, `${error.message} You may also email quotes@marlboromanorcleaning.com.`, true); submit.disabled = false; submit.textContent = 'Submit estimate request' }
  })
}

function formatSlot(option) {
  const start = new Date(option.start), end = new Date(option.end)
  if (Number.isNaN(start.getTime())) return { day: option.label, date: option.start, time: option.end }
  return { day: start.toLocaleDateString('en-US', { weekday: 'long' }), date: start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), time: `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` }
}

function setupScheduling() {
  const root = $('#native-scheduling'), status = $('#schedule-status'); if (!root) return
  const token = new URLSearchParams(location.search).get('token') || ''
  if (!token) return show(status, 'Open the secure link from your scheduling email.', true)
  fetch(`/api/scheduling?token=${encodeURIComponent(token)}`).then(async response => {
    const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error)
    if (result.status === 'CONFIRMED') return show(status, 'This appointment has already been confirmed. Check your email for the appointment details.')
    status.hidden = true
    const duration = Math.round(Number(result.durationMinutes || 0) / 6) / 10
    root.innerHTML = `<div class="schedule-summary"><div><span class="summary-label">Accepted service</span><strong>${esc(result.serviceName || 'Residential cleaning')}</strong></div><div class="summary-metrics"><span><strong>${duration || '—'}</strong> estimated hours</span><span><strong>${esc(result.crewSize || 1)}</strong> crew member${Number(result.crewSize || 1) === 1 ? '' : 's'}</span></div></div><form id="schedule-options-form"><fieldset><legend>Select an available appointment</legend><p class="field-help">Selecting a time places a private 10-minute hold while you confirm.</p><div class="appointment-grid">${(result.options || []).map((option, index) => { const slot = formatSlot(option); return `<label class="schedule-option"><input type="radio" name="optionId" value="${esc(option.id)}" ${index === 0 ? 'required' : ''}><span class="date-tile"><small>${esc(slot.day)}</small><strong>${esc(slot.date)}</strong></span><span class="time-tile"><strong>${esc(slot.time)}</strong><small>${index === 0 ? 'Recommended option' : 'Available appointment'}</small></span>${index === 0 ? '<span class="recommended-badge">Recommended</span>' : ''}</label>` }).join('')}</div></fieldset><details class="schedule-notes"><summary>None of these times work?</summary><div class="form-grid"><label>Preferred date<input name="alternateDate" type="date"></label><label>Preferred window<select name="alternateWindow"><option value="">Choose a window</option><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option></select></label></div><label>Scheduling note<textarea name="notes" maxlength="1000" placeholder="Access, timing, parking, or another scheduling detail"></textarea></label><button id="alternate-request" class="button button-ghost" type="button">Request another time</button></details><div class="schedule-action"><p id="selection-help">Choose an appointment to continue.</p><button class="button button-gold" type="submit" disabled>Confirm selected time</button></div></form>`
    const form = $('#schedule-options-form'), button = $('button[type="submit"]', form), help = $('#selection-help')
    $$('[name="optionId"]', form).forEach(input => input.addEventListener('change', async () => {
      $$('.schedule-option', form).forEach(card => card.classList.toggle('selected', $('input', card).checked))
      button.disabled = true
      help.textContent = 'Placing a 10-minute hold…'
      try {
        const held = await api('/api/scheduling', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, optionId: input.value, action: 'HOLD' }) })
        button.disabled = false
        help.dataset.expiresAt = held.holdExpiresAt || ''
        help.textContent = 'Held for 10 minutes. Confirm below to submit your choice.'
        trackPortal('scheduling_slot_held', 'SCHEDULING', { optionId: input.value })
      } catch (error) {
        help.textContent = error.message
      }
    }))
    $('#alternate-request', form).addEventListener('click', async () => {
      const alternateDate = $('[name="alternateDate"]', form).value
      const alternateWindow = $('[name="alternateWindow"]', form).value
      if (!alternateDate || !alternateWindow) return show(status, 'Choose a preferred date and time window.', true)
      try {
        await api('/api/scheduling', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'ALTERNATE', requestedDate: alternateDate, timeWindow: alternateWindow, notes: $('[name="notes"]', form).value }) })
        root.innerHTML = '<div class="schedule-success"><span aria-hidden="true">&#10003;</span><p class="eyebrow">Request received</p><h3>We will review your preferred time.</h3><p>Your current appointment is unchanged until scheduling confirms an alternative.</p></div>'
      } catch (error) { show(status, error.message, true) }
    })
    form.addEventListener('submit', async event => {
      event.preventDefault(); button.disabled = true; button.textContent = 'Confirming…'
      const data = Object.fromEntries(new FormData(form).entries())
      try {
        const output = await api('/api/scheduling', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'SELECT', ...data }) })
        const selected = $('input[name="optionId"]:checked', form)?.closest('.schedule-option'); const recap = selected ? selected.innerText.replace('Recommended', '').trim() : ''
        root.innerHTML = `<div class="schedule-success"><span aria-hidden="true">&#10003;</span><p class="eyebrow">Selection received</p><h3>${esc(output.message || 'Your appointment choice is on its way to our team.')}</h3><p>${esc(recap)}</p><div><strong>What happens next</strong><small>Watch for a confirmation from scheduling@marlboromanorcleaning.com.</small></div></div>`
      } catch (error) { button.disabled = false; button.textContent = 'Confirm selected time'; show(status, error.message || String(error), true) }
    })
  }).catch(error => show(status, `${error.message || error} Reply to your scheduling email for assistance.`, true))
}

function setupPreparation() {
  const form = $('#preparation-form'), status = $('#preparation-status')
  if (!form) return
  const token = new URLSearchParams(location.search).get('token') || ''
  if (!token) return show(status, 'Open the private preparation link sent for your appointment.', true)
  const sync = () => {
    const presence = $('[name="presencePlan"]:checked', form)?.value || ''
    $('#home-contact-fields').hidden = !['CUSTOMER_HOME', 'OTHER_PERSON_HOME'].includes(presence)
    $('#access-plan-card').hidden = presence !== 'INDEPENDENT_ACCESS'
    const method = $('[name="accessMethod"]', form)?.value || ''
    $('#access-code-field').hidden = !['SMART_LOCK', 'KEYPAD', 'LOCKBOX', 'OTHER'].includes(method)
    $('#alarm-code-field').hidden = $('[name="alarmPlan"]', form)?.value !== 'TEMPORARY_CODE'
    $('#pet-plan-fields').hidden = !$('#pets-at-visit').checked
  }
  fetch(`/api/preparation?token=${encodeURIComponent(token)}`).then(async response => {
    const result = await response.json()
    if (!response.ok || !result.ok) throw new Error(result.error)
    status.hidden = true
    form.hidden = false
    if (result.safePlan) {
      Object.entries(result.safePlan).forEach(([name, value]) => {
        $$(`[name="${name}"]`, form).forEach(field => {
          if (field.type === 'radio') field.checked = field.value === value
          else if (field.type === 'checkbox') field.checked = Boolean(value)
          else if (!['accessCode', 'alarmCode'].includes(name)) field.value = value ?? ''
        })
      })
    }
    sync()
    form.addEventListener('change', sync)
    form.addEventListener('submit', async event => {
      event.preventDefault()
      sync()
      if (!form.reportValidity()) return
      const button = $('button[type="submit"]', form)
      button.disabled = true
      button.textContent = 'Encrypting and saving…'
      try {
        const values = Object.fromEntries(new FormData(form).entries())
        const payload = {
          token,
          ...values,
          petsPresent: values.petsPresent === 'on',
          petAcknowledgement: values.petAcknowledgement === 'on',
          rearmAlarm: values.rearmAlarm === 'on',
          secureAccessConsent: values.secureAccessConsent === 'on'
        }
        const response = await fetch('/api/preparation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        const output = await response.json()
        if (!response.ok || !output.ok) throw new Error(output.error)
        form.hidden = true
        show(status, output.readiness === 'NEEDS_REVIEW'
          ? 'Your plan was saved. A care coordinator will contact you before dispatch to resolve the remaining safety details.'
          : 'Your preparation plan is saved. The team will receive only the information needed for this appointment.')
      } catch (error) {
        button.disabled = false
        button.textContent = 'Save preparation plan'
        show(status, error.message || String(error), true)
      }
    })
  }).catch(error => show(status, `${error.message || error} Contact scheduling for assistance.`, true))
}

if (document.body.dataset.page === '/quote/') setupQuote()
if (document.body.dataset.page === '/schedule/') setupScheduling()
if (document.body.dataset.page === '/prepare/') setupPreparation()

function setupCrewOffer() {
  const root = $('#native-crew-offer'), status = $('#crew-offer-status'); if (!root) return
  const token = new URLSearchParams(location.search).get('token') || ''
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
  setupCrewWallet(token, money)
  fetch(`/api/crew-offer?token=${encodeURIComponent(token)}`).then(async response => {
    const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error); status.hidden = true
    const managed = data.coverageType === 'MANAGED_CREW'
    root.innerHTML = `<article class="schedule-summary"><p class="eyebrow">${esc(data.role || 'Cleaner')} opportunity</p><h2>${esc(data.serviceName || 'Residential cleaning')}</h2><dl class="sidebar-facts"><div><dt>Date</dt><dd>${esc(new Date(data.startAt).toLocaleString())}</dd></div><div><dt>Area</dt><dd>${esc(data.city || '')}, ${esc(data.zip || '')}</dd></div><div><dt>Estimated labor</dt><dd>${Number(data.estimatedLaborHours || 0).toFixed(1)} hours</dd></div><div><dt>Maximum crew coverage requested</dt><dd>${managed ? `${Number(data.crewSizeCovered || 1)} managed crew slot(s)` : 'One individual crew position'}</dd></div><div><dt>Maximum payout offered</dt><dd><strong>${money(data.offerAmount)}</strong></dd></div></dl><div class="security-note"><span aria-hidden="true">i</span><span>${esc(data.terms || '')}</span></div></article>${data.status === 'OPEN' ? `<form id="crew-offer-form" class="native-form">${managed?`<div class="form-grid"><label>Crew slots you can provide<input name="crewSlotsBid" type="number" min="1" max="${Number(data.crewSizeCovered||1)}" step="1" value="${Number(data.crewSizeCovered||1)}" required></label><label>Your payout bid<input name="payoutBidAmount" type="number" min="1" max="${Number(data.offerAmount||0)}" step="0.01" value="${Number(data.offerAmount||0).toFixed(2)}" required></label></div>`:''}<label>Optional note<textarea name="notes" maxlength="1000" placeholder="Availability details, crew capacity confirmation, or a question for operations"></textarea></label><div class="schedule-action"><button class="button button-gold" name="decision" value="ACCEPT" type="submit">Submit bid response</button><button class="button button-ghost" name="decision" value="DECLINE" type="submit">Decline</button></div></form>` : `<div class="form-status success">Response recorded: ${esc(data.status)}. Assignment requires a separate confirmation from operations.</div>`}`
    const form = $('#crew-offer-form'); if (!form) return; let decision = ''
    $$('button[name=decision]', form).forEach(button => button.addEventListener('click', () => { decision = button.value }))
    form.addEventListener('submit', async event => { event.preventDefault(); try { if (!decision) throw new Error('Choose interested or decline.'); const values=new FormData(form),notes=values.get('notes')||'',crewSlotsBid=managed?Number(values.get('crewSlotsBid')):1,payoutBidAmount=managed?Number(values.get('payoutBidAmount')):Number(data.offerAmount||0),response = await fetch('/api/crew-offer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, decision, notes, crewSlotsBid, payoutBidAmount }) }), output = await response.json(); if (!response.ok || !output.ok) throw new Error(output.error); root.innerHTML = `<div class="form-status success">${esc(output.message)}</div>` } catch (error) { show(status, error.message || String(error), true) } })
  }).catch(error => show(status, error.message || String(error), true))
}

function setupCrewWallet(token, money) {
  const root = $('#crew-wallet'); if (!root || !token) return
  const date = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const statusLabel = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase())
  fetch(`/api/crew-wallet?token=${encodeURIComponent(token)}`).then(async response => {
    const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error)
    const balances = data.balances || {}, earnings = data.earnings || [], payouts = data.payouts || []
    root.innerHTML = `<div class="wallet-heading"><div><p class="eyebrow">Private earnings wallet</p><h2 id="wallet-title">${esc(data.name || 'Your earnings')}</h2><p>Weekly payout day: <strong>${esc(data.payout?.schedule || 'Friday')}</strong> · ${esc(data.payout?.provider || 'PayPal')} ${esc(data.payout?.recipient || '')}</p></div><span class="wallet-sync">Updated ${esc(date(data.updatedAt || data.syncedAt))}</span></div><div class="wallet-balances"><article><span>Available</span><strong>${money(balances.available)}</strong><small>QA approved</small></article><article><span>Processing</span><strong>${money(balances.processing)}</strong><small>In a payout batch</small></article><article><span>Paid</span><strong>${money(balances.paid)}</strong><small>Completed earnings</small></article><article class="${Number(balances.attention || 0) ? 'attention' : ''}"><span>Needs attention</span><strong>${money(balances.attention)}</strong><small>Failed or disputed</small></article></div><div class="wallet-grid"><section><h3>Earnings activity</h3>${earnings.length ? `<div class="wallet-list">${earnings.map(item => `<article><div><strong>${esc(item.serviceName || 'Cleaning service')}</strong><small>${esc(date(item.serviceDate))} · ${esc(item.jobId)}</small></div><div><strong>${money(item.payableAmount)}</strong><span class="wallet-status status-${esc(String(item.status || '').toLowerCase())}">${esc(statusLabel(item.status))}</span></div></article>`).join('')}</div>` : '<p class="wallet-empty">No earnings have been recorded yet. Awarded work appears here after owner-approved QA.</p>'}</section><section><h3>Payout history</h3>${payouts.length ? `<div class="wallet-list">${payouts.map(item => `<article><div><strong>${esc(item.batchId || 'Payout')}</strong><small>${esc(date(item.submittedAt || item.paidAt))}</small></div><div><strong>${money(item.amount)}</strong><span class="wallet-status status-${esc(String(item.status || '').toLowerCase())}">${esc(statusLabel(item.status))}</span></div></article>`).join('')}</div>` : '<p class="wallet-empty">No payouts have been issued yet.</p>'}</section></div><div class="wallet-policy"><strong>How earnings move</strong><span>Awarded job → completed work → owner-approved QA → weekly payout → provider confirmation.</span></div>`
  }).catch(error => { root.innerHTML = `<div class="form-status form-status-error">${esc(error.message || String(error))}</div>` })
}

function renderMessages(target, messages = []) {
  if (!target) return
  target.innerHTML = messages.length
    ? messages.map(item => `<article class="portal-message ${String(item.sender_type || '').toLowerCase()}"><strong>${item.sender_type === 'OPERATIONS' ? 'Care team' : 'You'}</strong><p>${esc(item.body)}</p><time>${esc(new Date(item.created_at).toLocaleString())}</time></article>`).join('')
    : '<p class="portal-empty">No messages yet. Use this secure thread whenever you need help.</p>'
}

function setupPortalMessaging(audience, token) {
  const form = audience === 'CREW' ? $('#crew-message-form') : $('#service-message-form')
  const list = audience === 'CREW' ? $('#crew-messages') : $('#service-messages')
  if (!form || !list) return
  form.addEventListener('submit', async event => {
    event.preventDefault()
    const field = $('textarea[name="message"]', form)
    const button = $('button[type="submit"]', form)
    button.disabled = true
    try {
      await api('/api/portal-message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ audience, token, message: field.value })
      })
      field.value = ''
      const messages = await api(`/api/portal-message?audience=${audience}&token=${encodeURIComponent(token)}`)
      renderMessages(list, messages.messages)
      trackPortal('portal_message_sent', audience, {})
    } catch (error) {
      list.insertAdjacentHTML('beforeend', `<p class="form-status form-status-error">${esc(error.message)}</p>`)
    } finally { button.disabled = false }
  })
}

function setupServicePortal() {
  const root = $('#service-portal'), status = $('#service-portal-status')
  if (!root) return
  const token = portalToken()
  api(`/api/my-service${token ? `?token=${encodeURIComponent(token)}` : ''}`).then(data => {
    status.hidden = true
    forgetPortalToken()
    const timeline = Array.isArray(data.timeline) ? data.timeline : []
    const links = data.links || {}
    const next = data.nextAction || {}
    root.innerHTML = `<section class="portal-hero-card"><div><p class="eyebrow">${esc(data.reference || data.jobId || 'Private service')}</p><h2>${esc(data.serviceName || 'Your cleaning service')}</h2><p>${esc(data.addressSummary || data.appointmentLabel || 'Your care team will keep this workspace current.')}</p></div><span class="portal-status">${esc(friendlyStatus(data.status))}</span></section>
      <section class="portal-next-step"><div><p class="eyebrow">Recommended next step</p><h3>${esc(next.title || 'Review your service details')}</h3><p>${esc(next.copy || 'Use the available actions below or message your care coordinator.')}</p></div>${next.url ? `<a class="button button-gold" href="${esc(next.url)}">${esc(next.label || 'Continue')}</a>` : ''}</section>
      <div class="portal-action-grid">
        ${links.scheduleUrl ? `<a href="${esc(links.scheduleUrl)}"><span>01</span><strong>Choose a time</strong><small>Review available appointments</small></a>` : ''}
        ${links.appointmentUrl ? `<a href="${esc(links.appointmentUrl)}"><span>02</span><strong>Manage appointment</strong><small>Readiness, changes, and access</small></a>` : ''}
        ${links.preparationUrl ? `<a href="${esc(links.preparationUrl)}"><span>03</span><strong>Prepare the home</strong><small>Access and pet instructions</small></a>` : ''}
        ${links.paymentUrl ? `<a href="${esc(links.paymentUrl)}"><span>04</span><strong>Payment center</strong><small>Policy and card status</small></a>` : ''}
        ${links.feedbackUrl ? `<a href="${esc(links.feedbackUrl)}"><span>05</span><strong>Share feedback</strong><small>Tell the care team how it went</small></a>` : ''}
      </div>
      <section class="portal-timeline"><h3>Service timeline</h3>${timeline.length ? timeline.map(item => `<article class="${item.complete ? 'complete' : ''}"><span></span><div><strong>${esc(item.label || item.status)}</strong><p>${esc(item.detail || '')}</p><time>${esc(item.at || '')}</time></div></article>`).join('') : '<p class="portal-empty">Timeline updates will appear as your service progresses.</p>'}</section>
      <section class="portal-message-card"><h3>Message your care team</h3><div id="service-messages" class="portal-message-list"></div><form id="service-message-form" class="portal-message-form"><label>How can we help?<textarea name="message" maxlength="2000" required placeholder="Ask a question or share an update"></textarea></label><button class="button button-gold" type="submit">Send securely</button></form></section>`
    renderMessages($('#service-messages'), data.messages)
    setupPortalMessaging('CUSTOMER', token)
    trackPortal('service_hub_viewed', 'CUSTOMER', { status: data.status })
  }).catch(error => show(status, error.message, true))
}

function setupAppointmentPortal() {
  const root = $('#appointment-portal'), status = $('#appointment-portal-status')
  if (!root) return
  const token = portalToken()
  api(`/api/appointment${token ? `?token=${encodeURIComponent(token)}` : ''}`).then(data => {
    status.hidden = true
    forgetPortalToken()
    root.innerHTML = `<section class="portal-hero-card"><div><p class="eyebrow">${esc(data.serviceName || 'Residential cleaning')}</p><h2>${esc(data.appointmentLabel || data.appointmentStart || 'Appointment')}</h2><p>${esc(data.addressSummary || '')}</p></div><span class="portal-status">${esc(friendlyStatus(data.status))}</span></section>
      <div class="portal-detail-grid"><article><span>Arrival window</span><strong>${esc(data.arrivalWindow || data.appointmentLabel || 'See confirmation')}</strong></article><article><span>Care team</span><strong>${esc(data.crewLabel || 'Assigned before service')}</strong></article><article><span>Preparation</span><strong>${esc(friendlyStatus(data.preparationStatus || 'Not submitted'))}</strong></article></div>
      <form id="appointment-ready-form" class="portal-action-form"><h3>Confirm readiness</h3><p>Tell us you are ready, or share an access or pet update.</p><label>Optional note<textarea name="notes" maxlength="1000"></textarea></label><button class="button button-gold" type="submit">I am ready</button></form>
      <form id="appointment-change-form" class="portal-action-form"><h3>Request a change</h3><div class="form-grid"><label>Request<select name="action" required><option value="RESCHEDULE">Reschedule</option><option value="CANCEL">Cancel</option></select></label><label>Preferred new date<input name="requestedDate" type="date"></label><label>Preferred window<select name="timeWindow"><option value="">Choose one</option><option>MORNING</option><option>AFTERNOON</option><option>EVENING</option></select></label><label>Reason<input name="reason" maxlength="300" required></label></div><label>Notes<textarea name="notes" maxlength="1000"></textarea></label><button class="button button-outline" type="submit">Submit request</button><p class="field-help">Your current appointment remains active until a change is confirmed.</p></form>`
    const submit = async (form, payload) => {
      const button = $('button[type="submit"]', form); button.disabled = true
      try {
        const result = await api('/api/appointment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, ...payload }) })
        form.innerHTML = `<div class="form-status">${esc(result.message)}</div>`
      } catch (error) { show(status, error.message, true); button.disabled = false }
    }
    $('#appointment-ready-form').addEventListener('submit', event => { event.preventDefault(); submit(event.currentTarget, { action: 'READY', notes: $('[name="notes"]', event.currentTarget).value }) })
    $('#appointment-change-form').addEventListener('submit', event => { event.preventDefault(); submit(event.currentTarget, Object.fromEntries(new FormData(event.currentTarget).entries())) })
    trackPortal('appointment_portal_viewed', 'APPOINTMENT', { status: data.status })
  }).catch(error => show(status, error.message, true))
}

function setupPaymentPortal() {
  const root = $('#payment-portal'), status = $('#payment-portal-status')
  if (!root) return
  const token = portalToken()
  api(`/api/payment${token ? `?token=${encodeURIComponent(token)}` : ''}`).then(async data => {
    status.hidden = true
    const sessionId = new URLSearchParams(location.search).get('session_id')
    if (sessionId) await api('/api/payment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'VERIFY', sessionId }) })
    forgetPortalToken()
    const complete = ['CARD_ON_FILE', 'PAID', 'VERIFYING'].includes(data.status)
    root.innerHTML = `<section class="portal-hero-card payment-summary"><div><p class="eyebrow">${esc(data.reference || data.requestId)}</p><h2>${esc(money(data.amount))}</h2><p>${esc(data.serviceName || 'Approved cleaning service')}</p></div><span class="portal-status">${esc(friendlyStatus(sessionId ? 'VERIFYING' : data.status))}</span></section>
      <div class="portal-detail-grid"><article><span>Appointment</span><strong>${esc(data.appointmentLabel || 'Pending')}</strong></article><article><span>Payment method</span><strong>${data.last4 ? `${esc(data.brand || 'Card')} •••• ${esc(data.last4)}` : esc(friendlyStatus(data.status))}</strong></article><article><span>Charge timing</span><strong>${esc(data.chargeTiming || 'After service and QA')}</strong></article></div>
      <section class="policy-card"><p class="eyebrow">Cancellation policy</p><h3>Review before saving a card</h3><p>${esc(data.policyText || 'The cancellation terms accepted with your service apply. Contact billing with questions before continuing.')}</p><a href="/cancellation-policy/" target="_blank">Read the complete policy</a></section>
      ${complete ? '<div class="form-status">Your payment requirement is complete or being verified. No charge was made by saving a card.</div>' : `<form id="payment-consent-form" class="portal-action-form"><label>Name acknowledging policy<input name="consentName" autocomplete="name" required maxlength="120"></label><label class="consent-row"><input name="accepted" type="checkbox" required><span>I reviewed and accept the cancellation policy shown above. Saving a card does not charge it.</span></label><button class="button button-gold" type="submit">Continue to secure Stripe setup</button></form>`}`
    const form = $('#payment-consent-form')
    if (form) form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return
      const button = $('button', form); button.disabled = true
      try {
        const values = Object.fromEntries(new FormData(form).entries())
        const result = await api('/api/payment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'CONSENT', accepted: values.accepted === 'on', consentName: values.consentName }) })
        if (data.checkoutUrl) location.assign(data.checkoutUrl)
        else form.innerHTML = `<div class="form-status">${esc(result.message)} Refresh this page shortly to continue.</div>`
      } catch (error) { show(status, error.message, true); button.disabled = false }
    })
    trackPortal('payment_portal_viewed', 'PAYMENT', { status: data.status })
  }).catch(error => show(status, error.message, true))
}

function setupFeedbackPortal() {
  const root = $('#feedback-portal'), status = $('#feedback-portal-status')
  if (!root) return
  const token = portalToken()
  api(`/api/feedback${token ? `?token=${encodeURIComponent(token)}` : ''}`).then(data => {
    status.hidden = true
    forgetPortalToken()
    if (data.submitted) {
      root.innerHTML = '<div class="form-status">Thank you. Your feedback has already been received.</div>'
      return
    }
    root.innerHTML = `<section class="portal-hero-card"><div><p class="eyebrow">${esc(data.serviceName || 'Recent cleaning')}</p><h2>Your experience matters.</h2><p>Feedback goes directly to our local care team.</p></div></section><form id="feedback-form" class="portal-action-form"><fieldset class="rating-fieldset"><legend>Overall rating</legend><div class="star-rating">${[5,4,3,2,1].map(value => `<input id="rating-${value}" name="rating" type="radio" value="${value}" required><label for="rating-${value}" aria-label="${value} stars">★</label>`).join('')}</div></fieldset><label>What should we know?<textarea name="comments" maxlength="2000" placeholder="Tell us what went well or what we should address"></textarea></label><button class="button button-gold" type="submit">Send feedback</button></form>`
    const form = $('#feedback-form')
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return
      const values = Object.fromEntries(new FormData(form).entries())
      const result = await api('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, rating: Number(values.rating), comments: values.comments }) })
      root.innerHTML = `<div class="feedback-thanks"><span aria-hidden="true">✓</span><h3>${esc(result.message)}</h3><p>Your response is now part of our quality process.</p>${result.reviewUrl ? `<a class="button button-outline" href="${esc(result.reviewUrl)}" target="_blank" rel="noopener">You may also review us on Google</a>` : ''}${result.referralCode ? `<p class="referral-code">Your referral code: <strong>${esc(result.referralCode)}</strong></p>` : ''}</div>`
      trackPortal('feedback_submitted', 'FEEDBACK', { rating: Number(values.rating) })
    })
    trackPortal('feedback_portal_viewed', 'FEEDBACK', {})
  }).catch(error => show(status, error.message, true))
}

function setupCrewWorkspace() {
  const root = $('#native-crew-offer'), status = $('#crew-offer-status')
  if (!root) return
  const token = portalToken()
  api(`/api/crew-session${token ? `?token=${encodeURIComponent(token)}` : ''}`).then(data => {
    status.hidden = true
    forgetPortalToken()
    const offers = data.offers || []
    root.innerHTML = `<section class="portal-hero-card"><div><p class="eyebrow">Contractor workspace</p><h2>${esc(data.profile?.name || 'Available work')}</h2><p>${esc(data.profile?.role || 'Independent contractor')}</p></div><span class="portal-status">${offers.filter(item => item.status === 'OPEN').length} open</span></section><div class="crew-offer-list">${offers.length ? offers.map(item => `<article class="crew-offer-card"><div><p class="eyebrow">${esc(item.role || item.coverageType || 'Opportunity')}</p><h3>${esc(item.serviceName || 'Residential cleaning')}</h3><p>${esc(new Date(item.startAt).toLocaleString())} · ${esc(item.city || '')}, ${esc(item.zip || '')}</p></div><dl><div><dt>Labor</dt><dd>${Number(item.estimatedLaborHours || 0).toFixed(1)} hrs</dd></div><div><dt>Slots</dt><dd>${Number(item.crewSizeCovered || 1)}</dd></div><div><dt>Maximum payout</dt><dd>${money(item.offerAmount)}</dd></div></dl>${item.status === 'OPEN' ? `<form class="crew-bid-form" data-offer-id="${esc(item.offerId)}"><div class="form-grid"><label>Slots<input name="crewSlotsBid" type="number" min="1" max="${Number(item.crewSizeCovered || 1)}" value="${Number(item.crewSizeCovered || 1)}" required></label><label>Payout bid<input name="payoutBidAmount" type="number" min="1" max="${Number(item.offerAmount || 0)}" step=".01" value="${Number(item.offerAmount || 0).toFixed(2)}" required></label></div><label>Note<textarea name="notes" maxlength="1000"></textarea></label><div class="schedule-action"><button class="button button-gold" name="decision" value="ACCEPT">Submit bid</button><button class="button button-ghost" name="decision" value="DECLINE">Decline</button></div></form>` : `<span class="portal-status">${esc(friendlyStatus(item.status))}</span>`}</article>`).join('') : '<p class="portal-empty">No work opportunities are available right now.</p>'}</div>`
    $$('.crew-bid-form', root).forEach(form => {
      let decision = ''
      $$('button[name="decision"]', form).forEach(button => button.addEventListener('click', () => { decision = button.value }))
      form.addEventListener('submit', async event => {
        event.preventDefault()
        const values = Object.fromEntries(new FormData(form).entries())
        try {
          const result = await api('/api/crew-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, offerId: form.dataset.offerId, decision, notes: values.notes, crewSlotsBid: Number(values.crewSlotsBid), payoutBidAmount: Number(values.payoutBidAmount) }) })
          form.innerHTML = `<div class="form-status">${esc(result.message)}</div>`
        } catch (error) { form.insertAdjacentHTML('beforeend', `<div class="form-status form-status-error">${esc(error.message)}</div>`) }
      })
    })
    renderCrewWallet(data.wallet, data.profile)
    renderMessages($('#crew-messages'), data.messages)
    setupPortalMessaging('CREW', token)
    trackPortal('crew_workspace_viewed', 'CREW', { openOffers: offers.filter(item => item.status === 'OPEN').length })
  }).catch(error => show(status, error.message, true))
}

function renderCrewWallet(wallet, profile) {
  const root = $('#crew-wallet')
  if (!root) return
  if (!wallet) {
    root.innerHTML = '<p class="portal-empty">Earnings will appear here after an assignment is completed and quality-approved.</p>'
    return
  }
  const balances = wallet.balances || {}, earnings = wallet.earnings || [], payouts = wallet.payouts || []
  root.innerHTML = `<div class="wallet-heading"><div><p class="eyebrow">Earnings wallet</p><h2 id="wallet-title">${esc(profile?.name || 'Your earnings')}</h2><p>${esc(wallet.payout?.provider || 'Payout provider')} · ${esc(wallet.payout?.schedule || 'Weekly')}</p></div><span class="wallet-sync">${esc(friendlyStatus(wallet.payout?.verificationStatus || 'Pending setup'))}</span></div><div class="wallet-balances"><article><span>Available</span><strong>${money(balances.available)}</strong><small>QA approved</small></article><article><span>Processing</span><strong>${money(balances.processing)}</strong><small>Payout pending</small></article><article><span>Paid</span><strong>${money(balances.paid)}</strong><small>Completed</small></article><article><span>Attention</span><strong>${money(balances.attention)}</strong><small>Needs review</small></article></div><div class="wallet-grid"><section><h3>Earnings</h3>${earnings.length ? earnings.map(item => `<article><strong>${esc(item.serviceName || item.jobId)}</strong><span>${money(item.payableAmount)} · ${esc(friendlyStatus(item.status))}</span></article>`).join('') : '<p class="portal-empty">No earnings yet.</p>'}</section><section><h3>Payouts</h3>${payouts.length ? payouts.map(item => `<article><strong>${esc(item.batchId || 'Payout')}</strong><span>${money(item.amount)} · ${esc(friendlyStatus(item.status))}</span></article>`).join('') : '<p class="portal-empty">No payouts yet.</p>'}</section></div>`
}

if (document.body.dataset.page === '/my-service/') setupServicePortal()
if (document.body.dataset.page === '/appointment/') setupAppointmentPortal()
if (document.body.dataset.page === '/payment/') setupPaymentPortal()
if (document.body.dataset.page === '/feedback/') setupFeedbackPortal()
if (document.body.dataset.page === '/crew/') setupCrewWorkspace()
