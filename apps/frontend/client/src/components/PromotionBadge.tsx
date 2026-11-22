import type { Promotion } from "@tiendadcc/utils";
import { promotionBadge } from "../logic/promotionFormat.ts";
import { Badge } from "./ui/badge.tsx";

interface PromotionBadgeProps {
  promotion: Promotion;
}

export function PromotionBadge({ promotion }: PromotionBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="max-w-full font-mono whitespace-normal text-left"
    >
      {promotionBadge(promotion)}
    </Badge>
  );
}
