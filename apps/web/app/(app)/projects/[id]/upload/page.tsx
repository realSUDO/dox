"use client";

import { use, useState, useRef } from "react";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UploadCloud } from "lucide-react";

export default function UploadSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  
  // Text state
  const [text, setText] = useState("");
  const [textTitle, setTextTitle] = useState("");
  
  // Link state
  const [url, setUrl] = useState("");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTextMutation = trpc.sources.addText.useMutation({
    onSuccess: () => {
      toast.success("Text source added successfully!");
      router.push(`/projects/${projectId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add text source");
    }
  });

  const addLinkMutation = trpc.sources.addLink.useMutation({
    onSuccess: () => {
      toast.success("Link added successfully!");
      router.push(`/projects/${projectId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add link");
    }
  });

  const getUploadUrlMutation = trpc.sources.requestUploadUrl.useMutation();
  const confirmUploadMutation = trpc.sources.confirmUpload.useMutation();

  const handleAddText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTextMutation.mutate({ projectId, content: text, title: textTitle || undefined });
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    addLinkMutation.mutate({ projectId, url });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      // 1. Get presigned URL
      const { sourceId, uploadUrl } = await getUploadUrlMutation.mutateAsync({
        projectId,
        fileName: file.name,
        mimeType: (file.type || "application/octet-stream") as any,
        fileSizeBytes: file.size,
      });

      // 2. Upload file directly to Spaces
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        }
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage server");
      }

      // 3. Confirm upload
      await confirmUploadMutation.mutateAsync({ sourceId });
      
      toast.success("File uploaded successfully!");
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Link href={`/projects/${projectId}`} className="text-sm text-muted-foreground hover:underline mb-6 block">
        &larr; Back to project
      </Link>
      
      <h1 className="text-3xl font-bold tracking-tight mb-8">Add Source</h1>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="file">File Upload</TabsTrigger>
          <TabsTrigger value="link">Web Link</TabsTrigger>
          <TabsTrigger value="text">Raw Text</TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle>Upload Document or Subtitles</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">Click to select file</h3>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, SRT, VTT, Images, ZIP (Max 50MB)
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>

              {file && (
                <div className="mt-6 p-4 border rounded-md flex justify-between items-center">
                  <div className="truncate pr-4">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button 
                    onClick={handleUploadFile} 
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle>Add Web Link</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddLink} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium">URL</label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    required
                  />
                </div>
                <Button type="submit" disabled={addLinkMutation.isPending}>
                  {addLinkMutation.isPending ? "Adding..." : "Add Link"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Paste Raw Text</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddText} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title (Optional)</label>
                  <Input
                    id="title"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="Meeting Notes - Oct 12"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="text" className="text-sm font-medium">Content</label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your text here..."
                    className="min-h-[200px]"
                    required
                  />
                </div>
                <Button type="submit" disabled={addTextMutation.isPending}>
                  {addTextMutation.isPending ? "Adding..." : "Add Text"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
