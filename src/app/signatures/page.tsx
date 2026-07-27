import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";
import { auth } from "@/auth";
import { AuthMenu } from "@/components/AuthMenu";
import { SignatureManager } from "@/components/signatures/SignatureManager";

export default async function SignaturesPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  return (
    <div className="min-h-[100dvh] bg-bg p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" /> New document
          </Link>
          <AuthMenu />
        </div>

        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
            <PenLine className="h-3.5 w-3.5" />
          </div>
          <h1 className="text-lg font-semibold">Your Signatures</h1>
        </div>

        {email ? (
          <>
            <p className="mb-6 text-sm text-muted">
              Signatures saved here can be reused across documents. The
              default one is applied automatically when you place a new
              signature field.
            </p>
            <SignatureManager />
          </>
        ) : (
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="text-text/90">Sign in</span> to save and reuse
              signatures across documents.
            </p>
            <Link href="/login" className="btn-primary !px-4">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
