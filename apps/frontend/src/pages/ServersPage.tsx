import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '@/lib/api';
import type { McpServer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import ServerFormDialog from '@/components/ServerFormDialog';
import DeleteServerDialog from '@/components/DeleteServerDialog';

const statusColor: Record<string, string> = {
  UP: 'bg-green-500/15 text-green-700 border-green-200',
  DOWN: 'bg-red-500/15 text-red-700 border-red-200',
  UNKNOWN: 'bg-gray-500/15 text-gray-600 border-gray-200',
};

export default function ServersPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [deletingServer, setDeletingServer] = useState<McpServer | null>(null);

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: serversApi.list,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? serversApi.enable(id) : serversApi.disable(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servers'] }),
  });

  const openCreate = () => {
    setEditingServer(null);
    setFormOpen(true);
  };

  const openEdit = (server: McpServer) => {
    setEditingServer(server);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">MCP Servers</h2>
        <Button onClick={openCreate}>Add Server</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading servers...</p>
      ) : servers.length === 0 ? (
        <p className="text-muted-foreground">No servers registered yet. Click "Add Server" to get started.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{server.alias}</code>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate text-sm">{server.url}</span>
                        </TooltipTrigger>
                        <TooltipContent><p>{server.url}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[server.status]}>
                      {server.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {server.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={server.isEnabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: server.id, enabled: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(server)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingServer(server)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ServerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        server={editingServer}
      />

      <DeleteServerDialog
        server={deletingServer}
        onClose={() => setDeletingServer(null)}
      />
    </div>
  );
}
