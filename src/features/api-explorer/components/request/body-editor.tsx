import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlignLeft, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useState } from 'react';
import { useApiExplorer } from '../../context/api-explorer-context';
import { useSchemaPanel } from '../../hooks/use-schema-panel';
import { SchemaPanel } from '../schema/schema-panel';

export function BodyEditor() {
  const { body, setBody, activeEndpoint } = useApiExplorer();
  const [showSchema, setShowSchema] = useState(true);
  const schemaRoot = useSchemaPanel(activeEndpoint?.requestBody);

  const prettyPrint = () => {
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      // Not valid JSON — leave as-is
    }
  };

  const copyToClipboard = () => {
    if (activeEndpoint?.exampleBody) {
      navigator.clipboard.writeText(activeEndpoint.exampleBody);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Body toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground">JSON</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={prettyPrint}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="Pretty print JSON"
          >
            <AlignLeft size={12} />
            Format
          </Button>
          {schemaRoot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSchema(v => !v)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title={showSchema ? 'Hide schema' : 'Show schema'}
            >
              {showSchema ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
              Schema
            </Button>
          )}
        </div>
      </div>

      {/* Editor + schema panel */}
      <div className="flex flex-1 overflow-hidden">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={'{\n  "key": "value"\n}'}
          className="flex-1 resize-none rounded-none border-0 font-mono text-xs p-3 focus-visible:ring-0 h-full"
          spellCheck={false}
        />
        {schemaRoot && showSchema && (
          <SchemaPanel
            root={schemaRoot}
            exampleBody={activeEndpoint?.exampleBody ?? ''}
            onCopySample={copyToClipboard}
          />
        )}
      </div>
    </div>
  );
}
