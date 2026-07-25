"use client";

import { useState } from "react";
import { trpc } from "~/trpc/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "~/components/ui/badge";

export default function AdminJobsPage() {
  const utils = trpc.useUtils();
  const { data: failedJobs, isLoading } = trpc.admin.listFailedJobs.useQuery();
  
  const retryMutation = trpc.admin.retryJob.useMutation({
    onSuccess: () => {
      toast.success("Job retry initiated");
      utils.admin.listFailedJobs.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to retry job: ${err.message}`);
    }
  });

  const handleRetry = (queueName: string, jobId: string) => {
    retryMutation.mutate({ queueName, jobId });
  };

  const allBullMqJobs = [
    ...(failedJobs?.bullmq.ingestion?.map(j => ({ ...j, queue: "extract-queue" })) || []),
    ...(failedJobs?.bullmq.embed?.map(j => ({ ...j, queue: "embed-queue" })) || []),
    ...(failedJobs?.bullmq.ocr?.map(j => ({ ...j, queue: "ocr-queue" })) || [])
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Failed Jobs</h1>
        <p className="text-muted-foreground mt-2">Manage and retry failed background processing jobs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BullMQ Failed Jobs</CardTitle>
          <CardDescription>Jobs that have exhausted their retry attempts in Redis.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : allBullMqJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-md">
              No failed jobs in the queues!
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue</TableHead>
                    <TableHead>Job ID / Name</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Failed At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBullMqJobs.map((job) => (
                    <TableRow key={`${job.queue}-${job.id}`}>
                      <TableCell>
                        <Badge variant="outline">{job.queue}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{job.id}</div>
                        <div className="text-xs text-muted-foreground">{job.name}</div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-destructive">
                        {job.failedReason || "Unknown error"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(job.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleRetry(job.queue, job.id!)}
                          disabled={retryMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
