"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_MESSAGES } from "@/features/business/constants";
import { useBusinessProfileForm } from "@/hooks/use-business-profile-form";
import { cn } from "@/lib/utils";
import type { BusinessProfileData } from "@/types/business.types";

type BusinessProfileFormProps = {
  business?: BusinessProfileData | null;
  className?: string;
  onSuccess?: () => void;
};

type FormErrors = Partial<
  Record<
    | "businessName"
    | "businessDescription"
    | "phone"
    | "email"
    | "address"
    | "website",
    string
  >
>;

export function BusinessProfileForm({
  business,
  className,
  onSuccess,
}: BusinessProfileFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const { save, isLoading, isEditMode } = useBusinessProfileForm({
    businessId: business?.id,
    onCreateSuccess: () => {
      router.refresh();
      onSuccess?.();
    },
    onUpdateSuccess: () => {
      router.refresh();
      onSuccess?.();
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await save({
      businessName: String(formData.get("businessName") ?? ""),
      businessDescription: String(formData.get("businessDescription") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      website: String(formData.get("website") ?? ""),
    });

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      const message = result.error.message.toLowerCase();

      if (message.includes("business name")) {
        setErrors({ businessName: result.error.message });
      } else if (message.includes("email")) {
        setErrors({ email: result.error.message });
      } else if (message.includes("website") || message.includes("url")) {
        setErrors({ website: result.error.message });
      } else if (message.includes("description")) {
        setErrors({ businessDescription: result.error.message });
      } else if (message.includes("phone")) {
        setErrors({ phone: result.error.message });
      } else if (message.includes("address")) {
        setErrors({ address: result.error.message });
      }
    }
  }

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader>
        <CardTitle>
          {isEditMode
            ? BUSINESS_MESSAGES.editTitle
            : BUSINESS_MESSAGES.createTitle}
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? BUSINESS_MESSAGES.editDescription
            : BUSINESS_MESSAGES.createDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              name="businessName"
              defaultValue={business?.businessName ?? ""}
              placeholder="Acme Coffee Shop"
              required
              aria-invalid={Boolean(errors.businessName)}
            />
            {errors.businessName ? (
              <p className="text-xs text-destructive">{errors.businessName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-description">Description</Label>
            <Textarea
              id="business-description"
              name="businessDescription"
              defaultValue={business?.businessDescription ?? ""}
              placeholder="Tell customers what your business offers."
              aria-invalid={Boolean(errors.businessDescription)}
            />
            {errors.businessDescription ? (
              <p className="text-xs text-destructive">
                {errors.businessDescription}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-phone">Phone</Label>
              <Input
                id="business-phone"
                name="phone"
                type="tel"
                defaultValue={business?.phone ?? ""}
                placeholder="+1 555 0100"
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-email">Business Email</Label>
              <Input
                id="business-email"
                name="email"
                type="email"
                defaultValue={business?.email ?? ""}
                placeholder="hello@business.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-address">Address</Label>
            <Input
              id="business-address"
              name="address"
              defaultValue={business?.address ?? ""}
              placeholder="123 Main Street, City"
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address ? (
              <p className="text-xs text-destructive">{errors.address}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-website">Website</Label>
            <Input
              id="business-website"
              name="website"
              type="url"
              defaultValue={business?.website ?? ""}
              placeholder="https://yourbusiness.com"
              aria-invalid={Boolean(errors.website)}
            />
            {errors.website ? (
              <p className="text-xs text-destructive">{errors.website}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              "Save changes"
            ) : (
              "Create business profile"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
