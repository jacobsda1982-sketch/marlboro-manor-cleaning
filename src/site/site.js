(() => {
  const send = (name, detail = {}) => {
    const payload = { event: name, page: location.pathname, ...detail }
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(payload)
    window.dispatchEvent(new CustomEvent('marble:conversion', { detail: payload }))
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-conversion]')
    if (!link) return
    send(link.dataset.conversion, { destination: link.getAttribute('href') || '' })
  })

  const quoteFrame = document.querySelector('.quote-frame')
  if (quoteFrame) {
    send('quote_form_view')
    quoteFrame.addEventListener('load', () => send('quote_form_loaded'))
  }

  const schedulingFrame = document.querySelector('[data-scheduling-frame]')
  if (schedulingFrame) {
    const message = document.querySelector('#schedule-message')
    const token = new URLSearchParams(window.location.search).get('t') || ''
    const backend = schedulingFrame.dataset.backend || ''
    if (/^[a-f0-9]{64}$/i.test(token) && /^https:\/\/script\.google\.com\//.test(backend)) {
      const separator = backend.includes('?') ? '&' : '?'
      schedulingFrame.src = `${backend}${separator}mode=schedule&embed=1&t=${encodeURIComponent(token)}`
      schedulingFrame.addEventListener('load', () => {
        if (message) message.hidden = true
        send('scheduling_form_loaded')
      })
      send('scheduling_form_view')
    } else {
      schedulingFrame.hidden = true
      if (message) message.textContent = 'This scheduling link is incomplete or invalid. Please use the secure link in your scheduling email.'
    }
  }

  document.querySelectorAll('.mobile-menu a').forEach(link => link.addEventListener('click', () => {
    const menu = link.closest('details')
    if (menu) menu.open = false
  }))
})()
