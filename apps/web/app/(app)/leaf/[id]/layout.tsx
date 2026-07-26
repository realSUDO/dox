import { use } from "react";
import { LeafShell } from "~/components/leaf-shell";

export default function LeafLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <LeafShell leafId={id}>{children}</LeafShell>;
}
