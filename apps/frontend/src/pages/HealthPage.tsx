import { useQuery, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColor: Record<string, string> = {
  UP: 'bg-green-500/15 text-green-700 border-green-200',
  DOWN: 'bg-red-500/15 text-red-700 border-red-200',
  UNKNOWN: 'bg-gray-500/15 text-gray-600 border-gray-200',
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function HealthPage() {
  const queryClient = useQueryClient();

  const { data: servers = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.status,
    refetchInterval: 15000,
  });

  const upCount = servers.filter((s) => s.status === 'UP').length;
  const downCount = servers.filter((s) => s.status === 'DOWN').length;
  const unknownCount = servers.filter((s) => s.status === 'UNKNOWN').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Health Dashboard</h2>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-sm text-muted-foreground">
              Last refreshed: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['health'] })}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading health data...</p>
      ) : (
        <>
          <div className="flex gap-4 text-sm font-medium">
            <span className="text-green-700">{upCount} UP</span>
            <span className="text-red-700">{downCount} DOWN</span>
            <span className="text-gray-600">{unknownCount} UNKNOWN</span>
          </div>

          {servers.length === 0 ? (
            <p className="text-muted-foreground">No servers registered.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <Card key={server.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{server.name}</CardTitle>
                      <Badge variant="outline" className={statusColor[server.status]}>
                        {server.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Alias:</span>{' '}
                      <code className="bg-muted px-1 rounded">{server.alias}</code>
                    </p>
                    <p className="truncate">
                      <span className="font-medium text-foreground">URL:</span> {server.url}
                    </p>
                    <p>Last checked: {relativeTime(server.lastCheckedAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
