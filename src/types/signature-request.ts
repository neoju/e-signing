import type { Field } from "./pdf-editor";

export type RequestStatus = "draft" | "pending" | "completed";

export type SignatureRequestRow = {
  id: string;
  title: string;
  original_path: string;
  signed_path: string | null;
  token: string;
  status: RequestStatus;
  fields: Field[];
  created_at: string;
  completed_at: string | null;
  owner_email: string | null;
};

// Row returned by GET /api/documents for a logged-in user's dashboard.
// Covers both sent requests (draft/pending/completed) and in-progress drafts
// the user saved from the editor without sending.
export type OwnedRequestSummary = {
  id: string;
  title: string;
  token: string;
  status: RequestStatus;
  createdAt: string;
  signedUrl: string | null;
};

// Payload returned by GET /api/documents/[id] to resume editing a draft.
export type DraftDocument = {
  id: string;
  title: string;
  fields: Field[];
  pdfUrl: string;
};

// Local record kept in the sender's browser (localStorage) so they can find
// their own sent requests again. There is no server-side identity backing
// this list.
export type SentRequestRecord = {
  id: string;
  token: string;
  title: string;
  createdAt: string;
};
