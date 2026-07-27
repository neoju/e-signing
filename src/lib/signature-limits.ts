// Cap the saved-signature library per user. Small enough to keep the
// manager UI tidy (fits a single row on desktop) and to prevent one
// account from filling the `signatures` table with data-URL blobs. The
// server (`POST /api/signatures`) enforces this; the manager UI mirrors
// it to hide the "Add signature" button once you hit the cap.
export const MAX_SIGNATURES_PER_USER = 5;
