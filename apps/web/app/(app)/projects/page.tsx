"use client";

import { useState } from "react";
import { trpc } from "~/trpc/client";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";

export default function ProjectsPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully!");
      setName("");
      setDescription("");
      utils.projects.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create project");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description: description || undefined });
  };

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create Project</CardTitle>
              <CardDescription>Start a new knowledge base</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name</label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Quantum Physics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="desc" className="text-sm font-medium">Description</label>
                  <Input
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading projects...</div>
          ) : projects?.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/20">
              <h3 className="text-lg font-medium">No projects yet</h3>
              <p className="text-muted-foreground">Create your first project to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects?.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="truncate">{project.name}</CardTitle>
                      <CardDescription className="truncate">
                        {project.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
