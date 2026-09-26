const WORLDS = [
  { id: 'olympus', name: 'Olympus', eyebrow: 'THE MYTHIC WORLD', detail: 'Sunlit marble, olive groves, and a colony beneath the gods.', action: 'Enter Olympus', art: 'olympus' },
  { id: 'moon', name: 'Luna', eyebrow: 'THE SPACE COLONY', detail: 'A quiet frontier beneath the stars, built one thread at a time.', action: 'Enter Luna', art: 'moon' },
  { id: 'terra', name: 'Terra', eyebrow: 'THE EARTH COLONY', detail: 'Familiar ground for your projects, people, and passing days.', action: 'Enter Terra', art: 'terra' },
]

/** The entry screen commits a world and one project before the scene draws a roster. */
export function createRealmGate(app, onSelect) {
  const root = document.createElement('section')
  root.className = 'realm-gate'
  root.hidden = true
  root.setAttribute('aria-label', 'Choose a world')
  root.innerHTML = `<div class="realm-gate-scroll"><div class="realm-gate-shell">
    <header class="realm-gate-header">
      <div class="realm-gate-mark" aria-hidden="true">✦</div>
      <p class="realm-gate-kicker">THREADLANDS · THE WORLDS</p>
      <h1>Where shall we begin?</h1>
      <p>Choose a project, then the world you want to see it in.</p>
    </header>
    <div class="realm-project-picker">
      <label for="realm-project">YOUR PROJECT</label>
      <select id="realm-project" disabled><option value="">Loading projects…</option></select>
      <small class="realm-project-note" role="status">Only this project's bots will appear in the world.</small>
    </div>
    <div class="realm-gate-grid">
      ${WORLDS.map((world) => `<button class="realm-card realm-${world.art}" type="button" data-realm="${world.id}" disabled>
        <span class="realm-art" aria-hidden="true"><span class="realm-orb"></span><span class="realm-land"></span><span class="realm-building"></span></span>
        <span class="realm-card-body"><span class="realm-eyebrow">${world.eyebrow}</span><strong>${world.name}</strong><span class="realm-detail">${world.detail}</span><span class="realm-link">${world.action} <span aria-hidden="true">↗</span></span></span>
      </button>`).join('')}
    </div>
    <div class="realm-future" aria-label="Dashboard, coming soon">
      <span class="realm-future-icon" aria-hidden="true"><i></i><i></i><i></i></span>
      <span><strong>Classic dashboard</strong><small>The future all-project view for tracking every bot without the 3D scene.</small></span>
      <span class="realm-future-tag">COMING SOON</span>
    </div>
    <p class="realm-gate-foot">You can switch projects or worlds any time from the colony.</p>
  </div></div>`
  const projectSelect = root.querySelector('#realm-project')
  const note = root.querySelector('.realm-project-note')
  const buttons = [...root.querySelectorAll('[data-realm]')]
  projectSelect.addEventListener('change', () => {
    for (const button of buttons) button.disabled = !projectSelect.value
  })
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-realm]')
    if (button && projectSelect.value && onSelect(button.dataset.realm, projectSelect.value)) gate.hide()
  })
  app.append(root)
  const gate = {
    get visible() { return !root.hidden },
    show() {
      root.hidden = false
      projectSelect.focus()
    },
    hide() { root.hidden = true },
    setProjects(projects) {
      const previous = projectSelect.value
      projectSelect.replaceChildren()
      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = projects.length ? 'Select a project' : 'No projects found'
      projectSelect.append(placeholder)
      for (const { name, count } of projects) {
        const option = document.createElement('option')
        option.value = name
        option.textContent = `${name} · ${count} ${count === 1 ? 'bot' : 'bots'}`
        projectSelect.append(option)
      }
      projectSelect.disabled = !projects.length
      projectSelect.value = projects.some((p) => p.name === previous) ? previous : ''
      note.textContent = projects.length
        ? "Only this project's bots will appear in the world."
        : 'No active projects found. Start a coding thread, then refresh this page.'
      projectSelect.dispatchEvent(new Event('change'))
    },
    setError(message) { note.textContent = message },
  }
  return gate
}
