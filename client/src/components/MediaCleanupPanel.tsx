import { useMutation, useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { mediaCleanupCopy } from "@/lib/media-cleanup-copy";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Summary {
  enabled: boolean;
  counts: Record<string, number>;
  review: Array<{ id: number; path: string; errorCode: string | null; attempts: number }>;
}
export function MediaCleanupPanel() {
  const { language } = useI18n();
  const copy = mediaCleanupCopy[language];
  const query = useQuery<Summary>({
    queryKey: ["/api/admin/media-cleanup"], refetchInterval: 30_000,
  });
  const retry = useMutation({
    mutationFn: async (ids: number[]) => apiRequest("POST", "/api/admin/media-cleanup/retry", { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/media-cleanup"] }),
  });
  const waiting = (query.data?.counts.pending || 0) + (query.data?.counts.processing || 0) +
    (query.data?.counts.retry || 0);
  return (
    <Card data-testid="media-cleanup-panel">
      <CardHeader><CardTitle>{copy.title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{copy.explanation}</p>
        {query.isPending ? <p>…</p> : query.isError ? <p role="alert">{copy.error}</p> : (
          <>
            {!query.data?.enabled && <p>{copy.disabled}</p>}
            <p>{copy.pending}: {waiting} · {copy.review}: {query.data?.counts.review || 0}</p>
            {query.data?.review.map(job => (
              <div key={job.id} className="border rounded-lg p-3 text-sm space-y-2">
                <code className="block break-all">{job.path}</code>
                <p>{copy.review} ({job.errorCode})</p>
                <Button size="sm" variant="outline" disabled={retry.isPending}
                  onClick={() => retry.mutate([job.id])}>{copy.retry}</Button>
              </div>
            ))}
          </>
        )}
        {retry.isError && <p role="alert">{copy.error}</p>}
      </CardContent>
    </Card>
  );
}