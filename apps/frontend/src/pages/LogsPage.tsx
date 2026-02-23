import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsApi, serversApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PAGE_SIZE = 20;

export default function LogsPage() {
  const [serverAlias, setServerAlias] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [live, setLive] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: serversApi.list,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['logs', serverAlias, status, from, to, page],
    queryFn: () =>
      logsApi.list({
        serverAlias: serverAlias || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    refetchInterval: live ? 5000 : false,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clearFilters = () => {
    setServerAlias('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Request Logs</h2>
        <Button
          variant={live ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLive(!live)}
        >
          {live && <span className="mr-2 h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />}
          {live ? 'Live' : 'Live'}
        </Button>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Server</Label>
            <Select value={serverAlias} onValueChange={(v) => { setServerAlias(v === 'all' ? '' : v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="All servers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All servers</SelectItem>
                {servers.map((s) => (
                  <SelectItem key={s.alias} value={s.alias}>{s.alias}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="datetime-local" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="datetime-local" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
          </div>

          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground">No logs found.</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tool Name</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{log.toolName}</code>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{log.serverAlias}</code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.status === 'success'
                            ? 'bg-green-500/15 text-green-700 border-green-200'
                            : 'bg-red-500/15 text-red-700 border-red-200'
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.latencyMs}ms</TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.errorMessage ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate text-sm text-destructive">
                                {log.errorMessage}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="whitespace-pre-wrap">{log.errorMessage}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} results
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
