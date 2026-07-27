import type { Field } from "./pdf-editor";

export type RequestStatus = "pending" | "completed";

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
export type OwnedRequestSummary = {
  id: string;
  title: string;
  token: string;
  status: RequestStatus;
  createdAt: string;
  signedUrl: string | null;
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
