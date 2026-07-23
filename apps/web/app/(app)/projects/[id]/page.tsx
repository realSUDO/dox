"use client";

import { use } from "react";
import { trpc } from "~/trpc/client";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Trash2, RefreshCw, Plus, Link as LinkIcon, FileText } from "lucide-react";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const { data: project, isLoading: isProjectLoading } = trpc.projects.get.useQuery({ id: projectId });
  
  // Poll every 3 seconds for source status updates
  const { data: sources, isLoading: isSourcesLoading } = trpc.sources.listSources.useQuery(
    { projectId },
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

  if (isProjectLoading) return <div className="p-10 text-center">Loading project...</div>;
  if (!project) return <div className="p-10 text-center">Project not found</div>;

  return (
    <div className="container mx-auto py-10 max-w-5xl space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/projects" className="text-sm text-muted-foreground hover:underline mb-2 block">
            &larr; Back to projects
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-muted-foreground mt-2">{project.description}</p>}
        </div>
        <Link href={`/projects/${projectId}/upload`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Source
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Sources</h2>
        {isSourcesLoading ? (
          <div className="text-muted-foreground">Loading sources...</div>
        ) : sources?.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium">No sources</h3>
            <p className="text-muted-foreground mb-4">Add some documents, links, or text to chat with.</p>
            <Link href={`/projects/${projectId}/upload`}>
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
