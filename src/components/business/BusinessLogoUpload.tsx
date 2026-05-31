"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBusinessLogoUpload } from "@/hooks/use-business-logo-upload";
import { cn } from "@/lib/utils";
import {
  ALLOWED_BUSINESS_LOGO_TYPES,
  MAX_BUSINESS_LOGO_SIZE_BYTES,
} from "@/types/business.types";

type BusinessLogoUploadProps = {
  businessId?: string;
  logoUrl?: string | null;
  className?: string;
};

export function BusinessLogoUpload({
  businessId,
  logoUrl,
  className,
}: BusinessLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl ?? null);
  const { upload, isUploading, canUpload } = useBusinessLogoUpload({
    businessId,
    onSuccess: (nextLogoUrl) => {
      setPreviewUrl(nextLogoUrl);
    },
  });

  useEffect(() => {
    setPreviewUrl(logoUrl ?? null);
  }, [logoUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const result = await upload(file);

    if (!result.success) {
      setPreviewUrl(logoUrl ?? null);
    }

    URL.revokeObjectURL(localPreview);
    event.target.value = "";
  }

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader>
        <CardTitle>Business Logo</CardTitle>
        <CardDescription>
          Upload a square logo for your business profile. JPEG, PNG, WebP, or GIF
          up to 2 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Business logo preview"
              width={96}
              height={96}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <ImagePlusIcon className="size-8 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_BUSINESS_LOGO_TYPES.join(",")}
            className="hidden"
            disabled={!canUpload || isUploading}
            onChange={(event) => {
              void handleFileChange(event);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!canUpload || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload logo"
            )}
          </Button>
          {!canUpload ? (
            <p className="text-xs text-muted-foreground">
              Save your business profile first, then upload a logo.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Max file size: {Math.round(MAX_BUSINESS_LOGO_SIZE_BYTES / (1024 * 1024))} MB
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
