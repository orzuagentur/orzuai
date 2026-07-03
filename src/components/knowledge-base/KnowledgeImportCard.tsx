"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUpIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importKnowledgeTextAction } from "@/features/knowledge-base/actions/import-knowledge-text";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";

type KnowledgeImportCardProps = {
  geminiConfigured: boolean;
  disabled?: boolean;
  compact?: boolean;
};

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,text/plain,text/markdown,text/csv";

export function KnowledgeImportCard({
  geminiConfigured,
  disabled = false,
  compact = false,
}: KnowledgeImportCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleImport(sourceText: string) {
    if (!geminiConfigured) {
      toast.error("AI is not configured. Contact support or check environment settings.");
      return;
    }

    setBusy(true);

    try {
      const result = await importKnowledgeTextAction({ text: sourceText });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(
        `${KNOWLEDGE_MESSAGES.importSuccess} (${result.data.created} entries)`,
      );
      setText("");
      setFileName(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 512_000) {
      toast.error("File is too large. Maximum size is 512 KB.");
      event.target.value = "";
      return;
    }

    const content = await file.text();
    setText(content);
    setFileName(file.name);
    event.target.value = "";
  }

  const form = (
    <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="knowledge-import-text">Text</Label>
          <Textarea
            id="knowledge-import-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={KNOWLEDGE_MESSAGES.importPlaceholder}
            className="min-h-24"
            disabled={busy || disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="knowledge-import-file">
            {KNOWLEDGE_MESSAGES.importUploadLabel}
          </Label>
          <input
            ref={fileInputRef}
            id="knowledge-import-file"
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy || disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUpIcon className="size-4" />
            {fileName ? fileName : "Choose file"}
          </Button>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={busy || disabled || text.trim().length < 20 || !geminiConfigured}
          onClick={() => void handleImport(text)}
        >
          {busy ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Importing...
            </>
          ) : (
            KNOWLEDGE_MESSAGES.importAction
          )}
        </Button>
    </div>
  );

  if (compact) {
    return form;
  }

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UploadIcon className="size-5" />
        </div>
        <CardTitle className="text-base">{KNOWLEDGE_MESSAGES.importTitle}</CardTitle>
        <CardDescription>{KNOWLEDGE_MESSAGES.importDescription}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">{form}</CardContent>
    </Card>
  );
}
