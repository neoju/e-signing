import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";

const title = "SignZ — Sign PDFs in seconds";
const description =
  "Upload, sign, and download PDFs in your browser. PDF rendering and signing happen on your device; optional sign-in syncs your sent requests.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "SignZ",
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
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
