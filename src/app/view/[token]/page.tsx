import { ViewSharedDraftClient } from "@/components/view/ViewSharedDraftClient";

export default async function ViewSharedDraftPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ViewSharedDraftClient token={token} />;
}
