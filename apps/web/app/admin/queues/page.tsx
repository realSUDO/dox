"use client";

import { env } from "~/env";

export default function AdminQueuesPage() {
  // We use the public URL if it's available, otherwise fallback to a generic relative path
  const iframeUrl = env.NEXT_PUBLIC_API_URL 
    ? `${env.NEXT_PUBLIC_API_URL}/admin/queues` 
    : "/api/admin/queues";

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b shrink-0 bg-background">
        <h1 className="text-2xl font-bold tracking-tight">Queues Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Live BullMQ job visibility via Bull Board.</p>
      </div>
      <div className="flex-1 bg-card">
        <iframe 
          src={iframeUrl} 
          className="w-full h-full border-none"
          title="Bull Board"
        />
      </div>
    </div>
  );
}
