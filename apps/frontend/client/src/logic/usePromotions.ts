import { useEffect, useState } from "react";
import type { Promotion } from "@tiendadcc/utils";
import { activePromotions } from "./promotionFormat.ts";
import { fetchPromotions } from "./promotionsApi.ts";

export function usePromotions(): Promotion[] {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    let active = true;
    void fetchPromotions().then((result) => {
      if (!active || !result.ok) return;
      setPromotions(activePromotions(result.promotions));
    });
    return () => {
      active = false;
    };
  }, []);

  return promotions;
}
