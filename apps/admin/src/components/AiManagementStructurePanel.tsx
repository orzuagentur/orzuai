import type { AiStructureSection } from "@/features/ai-management/types";

type AiManagementStructurePanelProps = {
  sections: AiStructureSection[];
};

export function AiManagementStructurePanel({
  sections,
}: AiManagementStructurePanelProps) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.description}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {section.cards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold">{card.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {card.summary}
                </p>

                <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                  {card.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>

                {card.callTypes && card.callTypes.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {card.callTypes.map((callType) => (
                      <span
                        key={callType}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
                      >
                        {callType}
                      </span>
                    ))}
                  </div>
                ) : null}

                {card.limits ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {card.limits}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
