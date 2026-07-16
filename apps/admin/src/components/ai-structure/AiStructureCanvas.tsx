"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { XIcon } from "lucide-react";

import { StructureFlowNode } from "@/components/ai-structure/StructureFlowNode";
import type {
  AiStructureFlow,
  AiStructureFlowNode,
  AiStructureLiveStatus,
  AiStructureLiveSummary,
} from "@/features/ai-management/types";
import { cn } from "@/lib/utils";

const nodeTypes: NodeTypes = {
  structure: StructureFlowNode,
};

const X_GAP = 270;
const Y_GAP = 110;

function layoutFlow(flow: AiStructureFlow): { nodes: Node[]; edges: Edge[] } {
  const levels = bfsLevels(flow);
  const nodes: Node[] = [];

  levels.forEach((levelNodes, depth) => {
    levelNodes.forEach((nodeId, indexInLevel) => {
      const node = flow.nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }
      const total = levelNodes.length;
      const yOffset = (indexInLevel - (total - 1) / 2) * Y_GAP;
      nodes.push({
        id: `${flow.id}:${node.id}`,
        type: "structure",
        position: {
          x: 48 + depth * X_GAP,
          y: 220 + yOffset,
        },
        data: {
          label: node.label,
          kind: node.kind,
          summary: node.summary,
          liveStatus: node.liveStatus,
          liveDetail: node.liveDetail,
          flowId: flow.id,
          nodeId: node.id,
        },
      });
    });
  });

  const edges: Edge[] = flow.edges.map((edge) => ({
    id: `${flow.id}:${edge.id}`,
    source: `${flow.id}:${edge.source}`,
    target: `${flow.id}:${edge.target}`,
    label: edge.label,
    type: "smoothstep",
    animated: Boolean(edge.label),
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 1.5 },
    labelStyle: { fontSize: 11, fill: "var(--muted-foreground)" },
  }));

  return { nodes, edges };
}

function bfsLevels(flow: AiStructureFlow): string[][] {
  const ids = flow.nodes.map((node) => node.id);
  const incoming = new Map(ids.map((id) => [id, 0]));
  const outgoing = new Map<string, string[]>();

  for (const edge of flow.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }

  const roots = ids.filter((id) => (incoming.get(id) ?? 0) === 0);
  const levels: string[][] = [];
  const seen = new Set<string>();
  let frontier = roots.length > 0 ? roots : ids.slice(0, 1);

  while (frontier.length > 0) {
    const level = frontier.filter((id) => !seen.has(id));
    for (const id of level) {
      seen.add(id);
    }
    if (level.length > 0) {
      levels.push(level);
    }
    const next: string[] = [];
    for (const id of level) {
      for (const child of outgoing.get(id) ?? []) {
        if (!seen.has(child) && !next.includes(child)) {
          next.push(child);
        }
      }
    }
    frontier = next;
  }

  for (const id of ids) {
    if (!seen.has(id)) {
      levels.push([id]);
    }
  }

  return levels;
}

function findFlowNode(
  flows: AiStructureFlow[],
  canvasNodeId: string,
): { flow: AiStructureFlow; node: AiStructureFlowNode } | null {
  const [flowId, ...rest] = canvasNodeId.split(":");
  const nodeId = rest.join(":");
  const flow = flows.find((item) => item.id === flowId);
  const node = flow?.nodes.find((item) => item.id === nodeId);
  if (!flow || !node) {
    return null;
  }
  return { flow, node };
}

function StatusPill({
  label,
  ready,
  total,
}: {
  label: string;
  ready: number;
  total: number;
}) {
  const status: AiStructureLiveStatus =
    ready === total && total > 0
      ? "ready"
      : ready === 0
        ? "missing"
        : "partial";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
        status === "ready" && "border-emerald-500/30 bg-emerald-500/10",
        status === "partial" && "border-amber-500/30 bg-amber-500/10",
        status === "missing" && "border-rose-500/30 bg-rose-500/10",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {ready}/{total}
      </span>
    </span>
  );
}

type AiStructureCanvasProps = {
  flows: AiStructureFlow[];
  summary: AiStructureLiveSummary;
};

function AiStructureCanvasInner({ flows, summary }: AiStructureCanvasProps) {
  const [activeFlowId, setActiveFlowId] = useState(flows[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    const flow = flows.find((item) => item.id === activeFlowId) ?? flows[0];
    if (!flow) {
      return { initialNodes: [] as Node[], initialEdges: [] as Edge[] };
    }
    const layout = layoutFlow(flow);
    return { initialNodes: layout.nodes, initialEdges: layout.edges };
  }, [flows, activeFlowId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedId(null);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const selected = selectedId ? findFlowNode(flows, selectedId) : null;
  const activeFlow = flows.find((flow) => flow.id === activeFlowId) ?? flows[0];

  const onNodeClick = useCallback((_: MouseEvent, node: Node) => {
    setSelectedId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border bg-muted/20">
      <div className="space-y-3 border-b bg-card px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Живая карта платформенного AI</p>
            <p className="truncate text-xs text-muted-foreground">
              {activeFlow?.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Сценарии"
              ready={summary.useCasesReady}
              total={summary.useCasesTotal}
            />
            <StatusPill
              label="Ключи"
              ready={summary.credentialsReady}
              total={summary.credentialsTotal}
            />
            <StatusPill
              label="Промпты"
              ready={summary.promptsReady}
              total={summary.promptsTotal}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              onClick={() => setActiveFlowId(flow.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeFlowId === flow.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {flow.title}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.3}
          maxZoom={1.4}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          className="bg-muted/30"
        >
          <Background gap={18} size={1} color="var(--border)" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            className="!border !bg-card"
            maskColor="color-mix(in oklab, var(--background) 70%, transparent)"
          />
        </ReactFlow>

        {selected ? (
          <aside className="absolute bottom-3 right-3 top-3 z-10 flex w-[min(100%,340px)] flex-col overflow-hidden rounded-xl border bg-card shadow-lg">
            <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {selected.flow.title}
                </p>
                <h2 className="text-base font-semibold leading-snug">
                  {selected.node.label}
                </h2>
                {selected.node.liveStatus ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Статус: {selected.node.liveStatus}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setSelectedId(null)}
                aria-label="Закрыть"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
              <p className="text-muted-foreground">{selected.node.summary}</p>

              {selected.node.liveDetail ? (
                <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {selected.node.liveDetail}
                </pre>
              ) : null}

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Детали
                </p>
                <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                  {selected.node.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              {selected.node.useCases && selected.node.useCases.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Сценарии (БД)
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {selected.node.useCases.map((useCase) => (
                      <Link
                        key={useCase.useCaseId}
                        href="/ai-management/use-cases"
                        className="rounded-md border px-2.5 py-2 text-xs hover:bg-muted"
                      >
                        <span className="font-medium">{useCase.label}</span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {useCase.provider}
                          {useCase.model ? ` / ${useCase.model}` : ""} ·{" "}
                          {useCase.credentialConfigured
                            ? useCase.credentialName ?? "ключ OK"
                            : "нет ключа"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.node.prompts && selected.node.prompts.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Prompt CMS
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {selected.node.prompts.map((prompt) => (
                      <Link
                        key={prompt.promptKey}
                        href="/ai-management/prompts"
                        className="rounded-md border px-2.5 py-2 text-xs hover:bg-muted"
                      >
                        <span className="font-medium">{prompt.label}</span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {prompt.activeVersion
                            ? `v${prompt.activeVersion} · ${prompt.usageCount} uses`
                            : "нет активной версии"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.node.callTypes && selected.node.callTypes.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Call types
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.node.callTypes.map((callType) => (
                      <span
                        key={callType}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium"
                      >
                        {callType}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.node.limits ? (
                <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  {selected.node.limits}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/ai-management/use-cases"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  Сценарии AI
                </Link>
                <Link
                  href="/ai-management/credentials"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  General API AI
                </Link>
                <Link
                  href="/ai-management/prompts"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  Prompt CMS
                </Link>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function AiStructureCanvas(props: AiStructureCanvasProps) {
  return (
    <ReactFlowProvider>
      <AiStructureCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
