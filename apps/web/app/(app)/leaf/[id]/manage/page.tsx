"use client";

import { use } from "react";
import { trpc } from "~/trpc/client";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Trash2, RefreshCw, Plus, Link as LinkIcon, FileText, CheckCircle, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export default function LeafDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leafId } = use(params);
  const utils = trpc.useUtils();

  const { data: leaf, isLoading: isLeafLoading } = trpc.leafs.get.useQuery({ id: leafId });
  
  // Poll every 3 seconds for source status updates
  const { data: sources, isLoading: isSourcesLoading } = trpc.sources.listSources.useQuery(
    { leafId },
    { refetchInterval: 3000 }
  );

  const deleteMutation = trpc.sources.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Source deleted");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete source");
    }
  });

  const reindexMutation = trpc.sources.reindexSource.useMutation({
    onSuccess: () => {
      toast.success("Reindexing started");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start reindexing");
    }
  });

  const approveMutation = trpc.sources.approveSource.useMutation({
    onSuccess: () => {
      toast.success("Source approved for embedding!");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to approve source");
    }
  });

  if (isLeafLoading) return <div className="p-10 text-center">Loading leaf...</div>;
  if (!leaf) return <div className="p-10 text-center">Leaf not found</div>;

  return (
    <div className="container mx-auto py-10 max-w-5xl space-y-8 mt-16 px-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline mb-2 block">
            &larr; Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{leaf.name}</h1>
          {leaf.description && <p className="text-muted-foreground mt-2">{leaf.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/leaf/${leafId}`}>
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" /> Workspace
            </Button>
          </Link>
          <Link href={`/leaf/${leafId}/upload`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Source
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Sources</h2>
        {isSourcesLoading ? (
          <div className="text-muted-foreground">Loading sources...</div>
        ) : sources?.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium">No sources</h3>
            <p className="text-muted-foreground mb-4">Add some documents, links, or text to chat with.</p>
            <Link href={`/leaf/${leafId}/upload`}>
              <Button variant="outline">Add your first source</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {sources?.map((source) => (
              <Card key={source.id}>
                <CardHeader className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {source.type === "link" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        {source.fileName || source.sourceUrl || "Text Document"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Status: <span className="font-semibold">{source.status}</span>
                        {source.chunkCount !== null && ` • Chunks: ${source.chunkCount}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {(source.status === "indexed" || source.status === "failed") && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => reindexMutation.mutate({ sourceId: source.id })}
                          disabled={reindexMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" /> Reindex
                        </Button>
                      )}
                      {source.status === "pending_approval" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-primary-foreground">
                              <CheckCircle className="h-4 w-4 mr-2" /> Review & Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Review Ingestion Preview</DialogTitle>
                              <DialogDescription>
                                Please review the context extracted from your document/ZIP before we generate the vector embeddings.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-4">
                              {(source.zipSummary || (source.metadata as any)?.summary) && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-1 text-primary">Generated Summary</h4>
                                  <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
                                    {source.zipSummary || (source.metadata as any).summary}
                                  </div>
                                </div>
                              )}
                              {source.zipApproved !== undefined && source.zipApproved !== null && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-1 text-primary">AI Recommendation</h4>
                                  <div className={`p-3 rounded-md text-sm font-medium ${source.zipApproved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {source.zipApproved ? 'Approve' : 'Reject'}
                                    {(source.metadata as any)?.reasoning && (
                                      <div className="mt-1 font-normal italic text-xs text-muted-foreground opacity-80">Reason: {(source.metadata as any).reasoning}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {source.zipFailedFiles && source.zipFailedFiles.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-1 text-red-600 flex items-center gap-2">
                                    Failed Files ({source.zipFailedFiles.length})
                                  </h4>
                                  <div className="p-3 bg-red-50/50 border border-red-100 rounded-md text-xs font-mono h-32 overflow-y-auto text-red-700">
                                    {source.zipFailedFiles.map((f: any, i: number) => (
                                      <div key={i} className="mb-1 truncate"><span className="font-semibold">{f.fileName}</span>: {f.error}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(source.metadata as any)?.fileTree && Array.isArray((source.metadata as any).fileTree) && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-1 text-primary">Included Files ({(source.metadata as any).fileTree.length})</h4>
                                  <div className="p-3 bg-muted/30 border rounded-md text-xs font-mono h-48 overflow-y-auto">
                                    {(source.metadata as any).fileTree.map((f: string, i: number) => (
                                      <div key={i} className="truncate">{f}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!source.metadata && (
                                <p className="text-sm text-muted-foreground italic">No preview metadata available for this source.</p>
                              )}
                            </div>
                            <div className="flex justify-end mt-6">
                              <Button
                                onClick={() => approveMutation.mutate({ sourceId: source.id })}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending ? "Approving..." : "Approve & Generate Embeddings"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this source?")) {
                            deleteMutation.mutate({ sourceId: source.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {source.lastError && (
                  <CardContent className="py-2 text-sm text-destructive">
                    Error: {source.lastError}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
