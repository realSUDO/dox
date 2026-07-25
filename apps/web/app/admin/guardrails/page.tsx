"use client";

import { trpc } from "~/trpc/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";

export default function AdminGuardrailsPage() {
  // Pass a query limit, defaults to 50
  const { data: result, isLoading } = trpc.admin.listGuardrailEvents.useQuery({ limit: 100, page: 1 });
  
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Guardrail Events</h1>
        <p className="text-muted-foreground mt-2">Monitor security and safety interventions triggered by the AI system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Interventions</CardTitle>
          <CardDescription>Events logged when input or output failed safety checks.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !result || result.events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-md bg-muted/10">
              No guardrail events recorded yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Action Taken</TableHead>
                    <TableHead>Project ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.events.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <span className="font-medium">{event.rule}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={event.action === "blocked" ? "destructive" : "secondary"}
                        >
                          {event.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {event.projectId?.split("-")[0] || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {event.userId?.split("-")[0] || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(event.createdAt).toLocaleString()}
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
