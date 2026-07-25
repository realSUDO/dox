"use client";

import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminOverviewPage() {
  const { data: health, isLoading: isLoadingHealth } = trpc.admin.getSystemHealth.useQuery();
  const { data: metrics, isLoading: isLoadingMetrics } = trpc.admin.getMetricsSummary.useQuery();
  const { data: ingestStats } = trpc.admin.getIngestionStats.useQuery();
  const { data: ragStats } = trpc.admin.getRAGStats.useQuery();

  const StatusBadge = ({ status }: { status?: string }) => {
    if (status === "healthy") return <Badge className="bg-emerald-500 hover:bg-emerald-600">Healthy</Badge>;
    if (status === "unhealthy") return <Badge variant="destructive">Unhealthy</Badge>;
    return <Badge variant="secondary">Unknown</Badge>;
  };

  if (isLoadingHealth || isLoadingMetrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground mt-2">Live metrics and health status for the RAG pipeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Postgres DB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{health?.postgres.status === "healthy" ? "OK" : "Error"}</span>
              <StatusBadge status={health?.postgres.status} />
            </div>
            {health?.postgres.error && <p className="text-xs text-destructive mt-2 truncate">{health.postgres.error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qdrant Vector DB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{health?.qdrant.status === "healthy" ? "OK" : "Error"}</span>
              <StatusBadge status={health?.qdrant.status} />
            </div>
            {health?.qdrant.error && <p className="text-xs text-destructive mt-2 truncate">{health.qdrant.error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valkey (Redis)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{health?.valkey.status === "healthy" ? "OK" : "Error"}</span>
              <StatusBadge status={health?.valkey.status} />
            </div>
            {health?.valkey.error && <p className="text-xs text-destructive mt-2 truncate">{health.valkey.error}</p>}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mt-8 mb-4">Activity Today</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.sources.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500">{metrics?.sources.indexed || 0}</span> indexed, 
              <span className="text-destructive ml-1">{metrics?.sources.failed || 0}</span> failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chat Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.queriesToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guardrail Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{metrics?.guardrailEventsToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingestion P95</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {ingestStats?.p95 ? `${(ingestStats.p95 / 1000).toFixed(1)}s` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
