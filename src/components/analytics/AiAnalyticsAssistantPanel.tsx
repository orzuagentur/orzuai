"use client";

import { useState } from "react";
import { Loader2Icon, MessageCircleQuestionIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { askAnalyticsAssistantAction } from "@/features/analytics/actions/ask-analytics-assistant";

const EXAMPLE_QUESTIONS = [
  "Why did conversions drop?",
  "Which channel brings the most leads?",
  "How is AI performing vs my team?",
];

export function AiAnalyticsAssistantPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  async function handleAsk() {
    if (!question.trim()) {
      return;
    }

    setIsAsking(true);
    setAnswer(null);

    try {
      const result = await askAnalyticsAssistantAction({ question });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setAnswer(result.answer);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <Card className="shadow-none lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircleQuestionIcon className="size-5 text-primary" />
          <div>
            <CardTitle className="text-base">
              {ANALYTICS_MESSAGES.assistantTitle}
            </CardTitle>
            <CardDescription>
              {ANALYTICS_MESSAGES.assistantDescription}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuestion(example)}
            >
              {example}
            </Button>
          ))}
        </div>

        <Textarea
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={ANALYTICS_MESSAGES.assistantPlaceholder}
        />

        <Button
          type="button"
          disabled={isAsking || !question.trim()}
          onClick={() => {
            void handleAsk();
          }}
        >
          {isAsking ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            ANALYTICS_MESSAGES.assistantAsk
          )}
        </Button>

        {answer ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
            {answer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
