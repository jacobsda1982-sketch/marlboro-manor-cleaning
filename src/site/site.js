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

  document.querySelectorAll('.mobile-menu a').forEach(link => link.addEventListener('click', () => {
    const menu = link.closest('details')
    if (menu) menu.open = false
  }))
})()
