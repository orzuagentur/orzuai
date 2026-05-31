import type { LegalSection } from "@/features/legal/content";

type LegalDocumentProps = {
  sections: LegalSection[];
};

export function LegalDocument({ sections }: LegalDocumentProps) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-7 text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
          {section.list ? (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
