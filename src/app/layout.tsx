import type { Metadata } from "next";
import "./globals.css";

const title = "SignFlow — Sign PDFs in seconds";
const description =
  "Upload, sign, and download PDFs in your browser. No sign-up. Nothing leaves your device.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "SignFlow",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
