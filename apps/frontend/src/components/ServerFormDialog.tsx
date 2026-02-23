import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '@/lib/api';
import type { McpServer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  alias: z
    .string()
    .min(1, 'Alias is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Lowercase alphanumeric with hyphens only'),
  url: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  tags: z.string().optional(),
  authType: z.enum(['none', 'bearer', 'api_key']),
  authCredential: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServer | null;
}

export default function ServerFormDialog({ open, onOpenChange, server }: Props) {
  const queryClient = useQueryClient();
  const isEdit = server !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      alias: '',
      url: '',
      description: '',
      tags: '',
      authType: 'none',
      authCredential: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (server) {
        form.reset({
          name: server.name,
          alias: server.alias,
          url: server.url,
          description: server.description ?? '',
          tags: server.tags.join(', '),
          authType: server.authType,
          authCredential: '',
        });
      } else {
        form.reset({
          name: '',
          alias: '',
          url: '',
          description: '',
          tags: '',
          authType: 'none',
          authCredential: '',
        });
      }
    }
  }, [open, server, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const dto = {
        name: values.name,
        alias: values.alias,
        url: values.url,
        description: values.description || undefined,
        tags: values.tags
          ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
        authType: values.authType as 'none' | 'bearer' | 'api_key',
        authCredential: values.authCredential || undefined,
      };
      return isEdit ? serversApi.update(server.id, dto) : serversApi.create(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      onOpenChange(false);
    },
  });

  const authType = form.watch('authType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Server' : 'Add Server'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v: FormValues) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="GitHub MCP Server" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              placeholder="github"
              disabled={isEdit}
              {...form.register('alias')}
            />
            {form.formState.errors.alias && (
              <p className="text-sm text-destructive">{form.formState.errors.alias.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" placeholder="http://github-mcp-server:8080" {...form.register('url')} />
            {form.formState.errors.url && (
              <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Optional description..." {...form.register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" placeholder="github, code" {...form.register('tags')} />
          </div>

          <div className="space-y-2">
            <Label>Auth Type</Label>
            <Select
              value={form.watch('authType')}
              onValueChange={(v) => form.setValue('authType', v as 'none' | 'bearer' | 'api_key')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="authCredential">
                {authType === 'bearer' ? 'Bearer Token' : 'API Key'}
              </Label>
              <Input
                id="authCredential"
                type="password"
                placeholder={isEdit ? '(leave empty to keep current)' : 'Enter credential...'}
                {...form.register('authCredential')}
              />
            </div>
          )}

          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
