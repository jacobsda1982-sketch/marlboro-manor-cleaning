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
  return { ...data, finishedBasement: data.finishedBasement === 'on', pets: data.pets === 'on', consent: data.consent === 'on', addOns }
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

if (document.body.dataset.page === '/quote/') setupQuote()
if (document.body.dataset.page === '/schedule/') setupScheduling()
