"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { draftApi } from "@/services/api";
import { Edit2, Trash2, CheckCircle, AlertCircle, Play, MoreVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = async () => {
    try {
      setIsLoading(true);
      const response = await draftApi.listCampaigns();
      setDrafts(response.data);
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
      toast.error("Failed to load drafts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    try {
      await draftApi.deleteCampaign(id);
      toast.success("Draft deleted");
      fetchDrafts();
    } catch (error) {
      toast.error("Failed to delete draft");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      case "READY":
        return <Badge className="bg-green-600">Ready to Publish</Badge>;
      case "VALIDATION_FAILED":
        return <Badge variant="destructive">Validation Failed</Badge>;
      case "PUBLISHING":
        return <Badge className="bg-blue-600 animate-pulse">Publishing...</Badge>;
      case "PUBLISHED":
        return <Badge className="bg-green-700">Published</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Publish Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Internal Drafts</h1>
            <p className="text-gray-400 mt-1">Manage and edit drafts before publishing to Meta.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse h-48" />
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <Layers className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No drafts found</h3>
            <p className="text-gray-400 mt-2">Duplicated campaigns will appear here when you choose "Save as Draft".</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft) => (
              <Card key={draft.id} className="bg-gray-900 border-gray-800 hover:border-blue-500/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg truncate max-w-[200px]">{draft.name}</CardTitle>
                      <div className="flex gap-2 items-center text-xs text-gray-400">
                        <span>{draft.objective}</span>
                        <span>•</span>
                        <span>{draft._count?.adSets} Ad Sets</span>
                      </div>
                    </div>
                    {getStatusBadge(draft.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-xs text-gray-500">
                      Updated {new Date(draft.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(draft.id)}>
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </Button>
                      <Link href={`/drafts/${draft.id}`}>
                        <Button size="sm" className="gap-2">
                          <Edit2 className="w-4 h-4" />
                          Edit Draft
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { Layers } from "lucide-react";
