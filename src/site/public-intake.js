const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const show = (target, message, error = false) => { target.hidden = false; target.className = `form-status${error ? ' form-status-error' : ''}`; target.textContent = message }
const serviceNames = { 'MMC-MAINT': 'Maintenance clean', 'MMC-DETAIL': 'Detail / deep clean', 'MMC-MOVEIN': 'Move-in clean', 'MMC-MOVEOUT': 'Move-out clean' }
const frequencyNames = { ONE_TIME: 'One time', WEEKLY: 'Weekly', BIWEEKLY: 'Biweekly', EVERY_FOUR_WEEKS: 'Every four weeks' }
const addOnNames = { 'AO-OVEN': 'Oven interior', 'AO-FRIDGE': 'Refrigerator interior', 'AO-WINDOWS': 'Interior windows', 'AO-BLINDS': 'Blinds' }

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
    root.innerHTML = `<div class="schedule-summary"><div><span class="summary-label">Accepted service</span><strong>${esc(result.serviceName || 'Residential cleaning')}</strong></div><div class="summary-metrics"><span><strong>${duration || '—'}</strong> estimated hours</span><span><strong>${esc(result.crewSize || 1)}</strong> crew member${Number(result.crewSize || 1) === 1 ? '' : 's'}</span></div></div><form id="schedule-options-form"><fieldset><legend>Select an available appointment</legend><p class="field-help">Times shown are held only after our team sends the final confirmation.</p><div class="appointment-grid">${(result.options || []).map((option, index) => { const slot = formatSlot(option); return `<label class="schedule-option"><input type="radio" name="optionId" value="${esc(option.id)}" ${index === 0 ? 'required' : ''}><span class="date-tile"><small>${esc(slot.day)}</small><strong>${esc(slot.date)}</strong></span><span class="time-tile"><strong>${esc(slot.time)}</strong><small>${index === 0 ? 'Recommended option' : 'Available appointment'}</small></span>${index === 0 ? '<span class="recommended-badge">Recommended</span>' : ''}</label>` }).join('')}</div></fieldset><details class="schedule-notes"><summary>Add a note for the scheduling team</summary><label><span class="sr-only">Scheduling notes</span><textarea name="notes" maxlength="1000" placeholder="Access, timing, parking, or another scheduling detail"></textarea></label></details><div class="schedule-action"><p id="selection-help">Choose an appointment to continue.</p><button class="button button-gold" type="submit" disabled>Confirm selected time</button></div></form>`
    const form = $('#schedule-options-form'), button = $('button[type="submit"]', form), help = $('#selection-help')
    $$('[name="optionId"]', form).forEach(input => input.addEventListener('change', () => { $$('.schedule-option', form).forEach(card => card.classList.toggle('selected', $('input', card).checked)); button.disabled = false; help.textContent = 'We will email your final confirmation after review.' }))
    form.addEventListener('submit', async event => {
      event.preventDefault(); button.disabled = true; button.textContent = 'Confirming…'
      const data = Object.fromEntries(new FormData(form).entries())
      try {
        const response = await fetch('/api/scheduling', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, ...data }) }); const output = await response.json(); if (!response.ok || !output.ok) throw new Error(output.error)
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

if (document.body.dataset.page === '/crew/') setupCrewOffer()
