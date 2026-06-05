export function getLeadScoreLabel(score: number): string {
  if (score >= 70) {
    return "Hot lead";
  }

  if (score >= 40) {
    return "Warm lead";
  }

  return "Cold lead";
}

export function getLeadScoreBadgeClassName(score: number): string {
  if (score >= 70) {
    return "border-success/40 bg-success/10 text-success";
  }

  if (score >= 40) {
    return "border-warning/40 bg-warning/10 text-warning";
  }

  return "border-muted-foreground/30 bg-muted text-muted-foreground";
}
