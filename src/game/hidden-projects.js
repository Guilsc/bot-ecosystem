/**
 * Repos you have taken off the map.
 *
 * Colony-only, and that is the whole point: hiding writes nothing to any harness and archives
 * nothing. The threads stay exactly where they are and keep working; the map just stops drawing
 * that repo until you show it again. It is for the checkout you have forty dead threads in and
 * do not want owning a third of your ground.
 *
 * Keyed on the project *name*, which is what plots are keyed on too. That has a consequence
 * worth knowing: a second checkout of the same repo appearing renames `foo` to `1/foo` (see
 * `disambiguateProjects` in server/scan.mjs) and the hide quietly stops matching. Keying on the
 * path instead would fix it and break the moment somebody moves a folder, and the layout has the
 * same trade — so both are wrong in the same direction, which is at least predictable.
 */

export function hideProject(hidden, name) {
  const id = String(name || '')
  if (!id || hidden.includes(id)) return [...hidden]
  return [...hidden, id]
}

export function unhideProject(hidden, name) {
  const id = String(name || '')
  return hidden.filter((n) => n !== id)
}

/** The threads the colony should actually draw. */
export function liveThreadsForColony(threads, archivedIds, hiddenProjects) {
  const archived = archivedIds instanceof Set ? archivedIds : new Set(archivedIds)
  const hidden = hiddenProjects instanceof Set ? hiddenProjects : new Set(hiddenProjects)
  return threads.filter((t) => !t.archived && !archived.has(t.id) && !hidden.has(t.project || 'unknown'))
}

/** Active project choices for the world picker, without ever drawing a global roster. */
export function projectChoices(threads, archivedIds, hiddenProjects) {
  const counts = new Map()
  for (const thread of liveThreadsForColony(threads, archivedIds, hiddenProjects)) {
    const name = thread.project || 'unknown'
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/**
 * What the sidebar lists, with a live count each — so a hidden repo that has since gone quiet
 * reads as `0` and you can tell it is safe to forget rather than having to show it to find out.
 */
export function hiddenCatalog(hidden, threads) {
  const names = [...new Set(hidden.map(String).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return names.map((name) => ({
    name,
    count: threads.filter((t) => !t.archived && (t.project || 'unknown') === name).length,
  }))
}
