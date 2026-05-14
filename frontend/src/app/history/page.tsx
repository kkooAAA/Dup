"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ExternalLink, Loader2, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { duplicationApi } from "@/services/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await duplicationApi.getHistory();
      setHistory(response.data);
    } catch (error) {
      toast.error("Failed to fetch duplication history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await duplicationApi.deleteHistory(id);
      setHistory(history.filter(item => item.id !== id));
      toast.success("History item deleted");
    } catch (error) {
      toast.error("Failed to delete history item");
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const response = await duplicationApi.cleanupHistory();
      toast.success(`Cleanup complete! Removed ${response.data.deletedCount} items that no longer exist on Facebook.`);
      fetchHistory();
    } catch (error) {
      toast.error("Failed to cleanup history");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Duplication History</h2>
            <p className="text-gray-400 mt-1">Audit log of all duplication actions performed.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCleanup} 
              disabled={cleaning || loading || history.length === 0}
              className="gap-2 border-gray-800 text-blue-400 hover:text-blue-300"
            >
              <RefreshCw className={`w-4 h-4 ${cleaning && 'animate-spin'}`} />
              {cleaning ? 'Syncing...' : 'Sync with Facebook'}
            </Button>
            <button 
              onClick={fetchHistory}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-gray-500 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p>Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-20 text-center text-gray-500">
              No duplication history found.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-950/50">
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Source ID</TableHead>
                  <TableHead className="text-gray-300">Target ID</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((job) => (
                  <TableRow key={job.id} className="border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 w-fit">
                          {job.type}
                        </span>
                        {job.details?.isConversion && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 w-fit">
                            CONVERSION
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-400">{job.sourceId}</TableCell>
                    <TableCell>
                      {job.targetId ? (
                        <div className="flex items-center gap-1 text-blue-400 text-xs">
                          {job.targetId}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.status === "COMPLETED" ? (
                        <div className="flex items-center gap-1.5 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Success
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          Failed
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(job.createdAt), "yyyy-MM-dd HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <button 
                        onClick={() => handleDelete(job.id)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
