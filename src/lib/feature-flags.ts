// Toggle modes that swap large chunks of UI without deleting the original.
//
// RECOVERY_MODE: replace the auto-scheduled revision flow (/revise and the
// Dashboard revision section) with a static "Hifz Recovery Plan" page.
// Set to false to restore the original revision UI — all the underlying
// scheduling logic (useTodaysTasks, RevisionSession, etc.) is still in place.
export const RECOVERY_MODE = true
