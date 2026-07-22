export type FieldKind = "signature" | "text" | "date";

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
};

export type RenderedPage = {
  width: number;
  height: number;
  dataUrl: string;
};
