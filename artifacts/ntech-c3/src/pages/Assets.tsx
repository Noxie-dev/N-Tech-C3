import { useState } from 'react';
import { useListAssets, useCreateAsset } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, Badge, Button, Input, Select, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { Image as ImageIcon, Plus, File, Video, Search } from 'lucide-react';
import type { AssetInput } from '@workspace/api-client-react';

export function Assets() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: assets, isLoading, refetch } = useListAssets({ type: typeFilter || undefined });
  const createAsset = useCreateAsset();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const type = formData.get('type') as AssetInput['type'];
    const url = formData.get('url') as string;

    if (!title) return;

    createAsset.mutate({ data: { title, type, url } }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        refetch();
      }
    });
  };

  const assetTypes = ['Image', 'Icon', 'Illustration', 'Logo', 'Video', 'SVG', 'PDF', 'BrandAsset', 'ScreenRecording', 'Other'];

  const getIconForType = (type: string) => {
    if (type === 'Video' || type === 'ScreenRecording') return <Video className="w-8 h-8 text-primary" />;
    if (type === 'PDF' || type === 'SVG') return <File className="w-8 h-8 text-primary" />;
    return <ImageIcon className="w-8 h-8 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <ImageIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Assets</h1>
            <p className="text-sm text-muted-foreground">Media and brand resources.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">Register Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Title</label>
                <Input name="title" placeholder="e.g. Dark Mode Logo SVG" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Type</label>
                  <Select name="type" defaultValue="Image">
                    {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">URL</label>
                  <Input name="url" placeholder="https://..." />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createAsset.isPending}>
                  {createAsset.isPending ? 'Saving...' : 'Register Asset'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Select 
          className="w-full sm:w-[200px] font-mono text-sm bg-card"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">ALL ASSETS</option>
          {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-muted-foreground font-mono">Loading assets...</div>
        ) : assets?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
            <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">ASSET LIBRARY EMPTY</p>
          </div>
        ) : (
          assets?.map((asset) => (
            <Card key={asset.id} className="hover:border-primary/40 transition-colors bg-card/80 group overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center border-b border-border relative">
                {asset.url && (asset.type === 'Image' || asset.type === 'Illustration' || asset.type === 'Logo') ? (
                  <img src={asset.url} alt={asset.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">
                    {getIconForType(asset.type)}
                  </div>
                )}
                <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur text-[10px] font-mono">{asset.type}</Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-bold text-xs truncate" title={asset.title}>{asset.title}</h3>
                {asset.url && <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">{asset.url}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
