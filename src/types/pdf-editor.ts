export type FieldKind = "signature" | "text" | "date";

// "sender" fields are filled in by the person creating the request (and are
// read-only for whoever they share the link with). "recipient" fields are
// the areas the sender marks for the next signer to fill in themselves.
export type FieldAssignee = "sender" | "recipient";

export type Field = {
  id: string;
  kind: FieldKind;
  pageIndex: number;
  // fractional coordinates (0..1) relative to page width/height (top-left origin)
  x: number;
  y: number;
  w: number;
  h: number;
  value: string;
  assignee: FieldAssignee;
};

export type RenderedPage = {
  width: number;
  height: number;
  dataUrl: string;
};
