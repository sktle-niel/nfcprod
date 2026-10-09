// Runs before first paint so the saved theme shows with no flash.
// Kept as a file (not inline) so a strict CSP can stay on.
;(function () {
  var theme = 'light'
  try {
    var saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') {
      theme = saved
    } else if (matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark'
    }
  } catch {
    // Storage blocked: fall back to light.
  }
  document.documentElement.dataset.theme = theme
})()
