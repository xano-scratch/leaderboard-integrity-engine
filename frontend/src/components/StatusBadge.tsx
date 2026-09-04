import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  accepted: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  flagged: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  rejected: "border-rose-500/30 bg-rose-500/15 text-rose-300",
};

export function StatusBadge({ decision, className }: { decision: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STYLES[decision] ?? "", className)}>
      {decision}
    </Badge>
  );
}
