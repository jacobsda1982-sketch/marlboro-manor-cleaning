const $ = (selector, root = document) => root.querySelector(selector)
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const show = (target, message, error = false) => { target.hidden = false; target.className = `form-status${error ? ' form-status-error' : ''}`; target.textContent = message }

function quotePayload(form) {
  const data = Object.fromEntries(new FormData(form).entries())
  const addOns = [...form.querySelectorAll('[name="addOn"]:checked')].map(input => ({ code: input.value, quantity: input.value === 'AO-BLINDS' ? Number($('#blindsQuantity')?.value || 1) : 1 }))
  return { ...data, finishedBasement: data.finishedBasement === 'on', pets: data.pets === 'on', consent: data.consent === 'on', addOns }
}

function setupQuote() {
  const form = $('#native-quote-form'), status = $('#quote-status'), button = $('#quote-submit')
  if (!form) return
  const blinds = $('#addon-blinds'), quantityWrap = $('#blinds-quantity-wrap'), quantity = $('#blindsQuantity')
  blinds?.addEventListener('change', () => { quantityWrap.hidden = !blinds.checked; quantity.required = blinds.checked })
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return
    button.disabled = true; button.textContent = 'Submitting securely…'; status.hidden = true
    try {
      const response = await fetch('/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(quotePayload(form)) })
      const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'Submission failed.')
      form.hidden = true; show(status, `Thank you. Your request was received. Reference: ${result.reference}`); localStorage.removeItem('mmc-quote-draft')
    } catch (error) { show(status, `${error.message} You may also email quotes@marlboromanorcleaning.com.`, true); button.disabled = false; button.textContent = 'Submit estimate request' }
  })
}

function setupScheduling() {
  const root = $('#native-scheduling'), status = $('#schedule-status'); if (!root) return
  const token = new URLSearchParams(location.search).get('token') || ''
  if (!token) return show(status, 'Open the secure link from your scheduling email.', true)
  fetch(`/api/scheduling?token=${encodeURIComponent(token)}`).then(async response => {
    const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error)
    if (result.status === 'CONFIRMED') return show(status, 'This appointment has already been confirmed.')
    root.innerHTML = `<div class="schedule-summary"><strong>${esc(result.serviceName || 'Residential cleaning')}</strong><span>Estimated duration: ${Math.round(Number(result.durationMinutes || 0) / 60 * 10) / 10} hours with ${esc(result.crewSize || 1)} crew member(s)</span></div><form id="schedule-options-form"><fieldset><legend>Choose one available time</legend>${(result.options || []).map((option, index) => `<label class="schedule-option"><input type="radio" name="optionId" value="${esc(option.id)}" ${index === 0 ? 'required' : ''}><span><strong>${esc(option.label)}</strong><small>${esc(option.start)} – ${esc(option.end)}</small></span></label>`).join('')}</fieldset><label>Notes for our scheduling team<textarea name="notes" maxlength="1000"></textarea></label><button class="button button-gold" type="submit">Confirm my selection</button></form>`
    const form = $('#schedule-options-form')
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = form.querySelector('button'); button.disabled = true
      const data = Object.fromEntries(new FormData(form).entries())
      try { const response = await fetch('/api/scheduling', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, ...data }) }); const output = await response.json(); if (!response.ok || !output.ok) throw new Error(output.error); form.hidden = true; show(status, output.message) }
      catch (error) { button.disabled = false; show(status, error.message || String(error), true) }
    })
  }).catch(error => show(status, `${error.message || error} Reply to your scheduling email for assistance.`, true))
}

if (document.body.dataset.page === '/quote/') setupQuote()
if (document.body.dataset.page === '/schedule/') setupScheduling()
