import {useApp} from '@/app/context';
import {generateCurl,generateJavaScript,generateNode,generatePython} from '@/app/services/codeGenerator';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,DialogHeader,DialogTitle,DialogTrigger
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import type {HttpMethod} from '@/lib/types/api';
import {ChevronDown,Code,Loader2,Save,Send} from 'lucide-react';
import {useState} from 'react';
import {KeyValueEditor} from './keyvalue-editor';
import {MethodBadge} from './method-badge';

type RequestTab = 'params' | 'headers' | 'body' | 'auth';
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function RequestPanel() {
  const {
    method, setMethod, url, setUrl, headers, setHeaders,
    params, setParams, body, setBody, bodyType, setBodyType,
    loading, sendRequest, saveToCollection,
  } = useApp();
  const [activeTab, setActiveTab] = useState<RequestTab>('params');
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [codeGenTab, setCodeGenTab] = useState<'curl' | 'javascript' | 'python' | 'node'>('curl');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendRequest();
  };

  const handleSave = () => {
    if (collectionName.trim()) {
      saveToCollection(collectionName.trim());
      setCollectionName('');
      setSaveDialogOpen(false);
    }
  };

  const getCodeGen = () => {
    const req = { method, url, headers, body };
    switch (codeGenTab) {
      case 'curl': return generateCurl(req);
      case 'javascript': return generateJavaScript(req);
      case 'python': return generatePython(req);
      case 'node': return generateNode(req);
    }
  };

  const methodStyle: Record<HttpMethod, string> = {
    GET: 'border-method-get/30 text-method-get',
    POST: 'border-method-post/30 text-method-post',
    PUT: 'border-method-put/30 text-method-put',
    PATCH: 'border-method-patch/30 text-method-patch',
    DELETE: 'border-method-delete/30 text-method-delete',
  };

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-b border-border">
        {/* Method selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMethodMenu(!showMethodMenu)}
            className={`flex items-center gap-1 px-3 py-2 rounded-md border font-mono font-bold text-sm transition-colors ${methodStyle[method]} bg-input`}
          >
            {method}
            <ChevronDown size={12} />
          </button>
          {showMethodMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMethodMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 py-1 min-w-25">
                {METHODS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setShowMethodMenu(false); }}
                    className={`w-full px-3 py-1.5 text-left font-mono font-bold text-sm hover:bg-accent transition-colors ${
                      m === method ? 'bg-accent' : ''
                    }`}
                  >
                    <MethodBadge method={m} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* URL input */}
        <Input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 h-9 font-mono"
        />

        {/* Send button */}
        <Button
          type="submit"
          disabled={loading || !url.trim()}
          className="h-9 px-5 gap-2 font-semibold"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
          Send
        </Button>

        {/* Save button */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger render={
			<button
              type="button"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              title="Save to collection"
            >
              <Save size={16} />
            </button>
		  }>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Save to Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                value={collectionName}
                onChange={e => setCollectionName(e.target.value)}
                placeholder="Collection name"
                className="w-full"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <DialogClose render={
					<Button variant="ghost" className="px-3 py-1.5 text-sm">
                    Cancel
                  </Button>
				}>
                </DialogClose>
                <Button
                  onClick={handleSave}
                  disabled={!collectionName.trim()}
                  className="px-4 py-1.5"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Code gen */}
        <Dialog>
          <DialogTrigger render={
			<button
              type="button"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              title="Generate code"
            >
              <Code size={16} />
            </button>
		  }>
            
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Code</DialogTitle>
            </DialogHeader>
            <div className="flex gap-1 border-b border-border">
              {(['curl', 'javascript', 'python', 'node'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCodeGenTab(tab)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${
                    codeGenTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <pre className="bg-input rounded-md p-4 text-sm font-mono text-foreground overflow-x-auto max-h-80 whitespace-pre-wrap">
              {getCodeGen()}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(getCodeGen())}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Copy to clipboard
            </button>
          </DialogContent>
        </Dialog>
      </form>

      {/* Request Tabs */}
      <div className="flex border-b border-border shrink-0">
        {(['params', 'headers', 'body', 'auth'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'params' ? 'Query Params' : tab}
            {tab === 'params' && params.some(p => p.key) && (
              <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                {params.filter(p => p.key).length}
              </span>
            )}
            {tab === 'headers' && headers.some(h => h.key) && (
              <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                {headers.filter(h => h.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'params' && (
          <KeyValueEditor items={params} onChange={setParams} keyPlaceholder="Parameter" valuePlaceholder="Value" />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor items={headers} onChange={setHeaders} keyPlaceholder="Header" valuePlaceholder="Value" />
        )}
        {activeTab === 'body' && (
          <div className="p-3 flex flex-col h-full">
            <div className="flex gap-2 mb-3">
              {(['json', 'form-data', 'raw'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBodyType(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    bodyType === t
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {t === 'json' ? 'JSON' : t === 'form-data' ? 'Form Data' : 'Raw'}
                </button>
              ))}
            </div>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Request body...'}
              className="flex-1 min-h-30 font-mono resize-none p-3"
              spellCheck={false}
            />
          </div>
        )}
        {activeTab === 'auth' && (
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Add authorization headers. Use environment variables like <code className="text-primary font-mono">{'{{API_KEY}}'}</code>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const existing = headers.find(h => h.key === 'Authorization');
                  if (!existing) {
                    setHeaders([...headers, { id: crypto.randomUUID(), key: 'Authorization', value: 'Bearer {{API_KEY}}', enabled: true }]);
                  }
                  setActiveTab('headers');
                }}
                className="w-full text-left px-3 py-2.5 bg-input border border-border rounded-md text-sm hover:bg-accent transition-colors"
              >
                <span className="font-medium text-foreground">Bearer Token</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Authorization: Bearer {'{{API_KEY}}'}</span>
              </button>
              <button
                onClick={() => {
                  const existing = headers.find(h => h.key === 'X-API-Key');
                  if (!existing) {
                    setHeaders([...headers, { id: crypto.randomUUID(), key: 'X-API-Key', value: '{{API_KEY}}', enabled: true }]);
                  }
                  setActiveTab('headers');
                }}
                className="w-full text-left px-3 py-2.5 bg-input border border-border rounded-md text-sm hover:bg-accent transition-colors"
              >
                <span className="font-medium text-foreground">API Key Header</span>
                <span className="block text-xs text-muted-foreground mt-0.5">X-API-Key: {'{{API_KEY}}'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
