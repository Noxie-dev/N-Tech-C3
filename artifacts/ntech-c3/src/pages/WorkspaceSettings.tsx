import { useGetWorkspace, useUpdateWorkspace } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { Button, Card, CardContent, Input, Spinner } from '@/components/shared';

export function WorkspaceSettings() {
  const { id } = useParams<{ id: string }>();
  const workspaceId = Number(id);
  const queryClient = useQueryClient();
  const { data: workspace, isLoading } = useGetWorkspace(workspaceId);
  const update = useUpdateWorkspace();
  if (isLoading) return <Spinner />;
  if (!workspace) return <p>Workspace not found.</p>;
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate({ workspaceId, data: {
      name: String(form.get('name')),
      description: String(form.get('description') || ''),
      currentGoal: String(form.get('currentGoal') || ''),
      brand: String(form.get('brand') || ''),
      writingVoice: String(form.get('writingVoice') || ''),
      targetAudience: String(form.get('targetAudience') || ''),
      repositoryLinks: String(form.get('repositories') || '').split('\n').map((value) => value.trim()).filter(Boolean),
      tags: String(form.get('tags') || '').split(',').map((value) => value.trim()).filter(Boolean),
    } }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}`] }) });
  };
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link href={`/workspaces/${workspaceId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Workspace overview</Link>
    <div><h1 className="text-2xl font-bold">Workspace Settings</h1><p className="text-sm text-muted-foreground">Identity, context, and Workspace DNA.</p></div>
    <Card><CardContent className="p-6"><form onSubmit={save} className="space-y-4">
      <label className="block text-sm">Name<Input name="name" defaultValue={workspace.name} required className="mt-1" /></label>
      <label className="block text-sm">Description<Input name="description" defaultValue={workspace.description || ''} className="mt-1" /></label>
      <label className="block text-sm">Current goal<Input name="currentGoal" defaultValue={workspace.currentGoal || ''} className="mt-1" /></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm">Brand<Input name="brand" defaultValue={workspace.brand || ''} className="mt-1" /></label><label className="block text-sm">Target audience<Input name="targetAudience" defaultValue={workspace.targetAudience || ''} className="mt-1" /></label></div>
      <label className="block text-sm">Writing voice<Input name="writingVoice" defaultValue={workspace.writingVoice || ''} className="mt-1" /></label>
      <label className="block text-sm">Tags<Input name="tags" defaultValue={workspace.tags.join(', ')} className="mt-1" /></label>
      <label className="block text-sm">Repositories<textarea name="repositories" defaultValue={workspace.repositoryLinks.join('\n')} className="mt-1 min-h-28 w-full rounded-md border border-border bg-background p-3 text-sm" /></label>
      <Button disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Workspace'}</Button>
    </form></CardContent></Card>
  </div>;
}
