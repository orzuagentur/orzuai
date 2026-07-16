"use client";

import { AiStructureCanvas } from "@/components/ai-structure/AiStructureCanvas";
import type { AiStructureLiveData } from "@/features/ai-management/types";

type AiManagementStructurePanelProps = {
  data: AiStructureLiveData;
};

export function AiManagementStructurePanel({
  data,
}: AiManagementStructurePanelProps) {
  return <AiStructureCanvas flows={data.flows} summary={data.summary} />;
}
