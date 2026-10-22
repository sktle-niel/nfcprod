/**
 * What the setup wizard leaves in the router state when it hands the owner over to the dashboard. The button that was
 * pressed is gone by then, so the dashboard puts the focus on the title of the page the owner lands on.
 */
export const FROM_SETUP = { fromSetup: true } as const

export function cameFromSetup(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'fromSetup' in state && state.fromSetup === true
}
