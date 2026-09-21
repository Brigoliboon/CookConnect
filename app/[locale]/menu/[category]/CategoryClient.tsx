"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CategoryMealCard } from "@/components/landing/CategoryMealCard";
import { toDialogMeal } from "@/lib/meal-detail";
import type { MenuItem as DialogMeal } from "@/constants";
import type { MenuItem } from "../MenuClient";

const MealDetailDialog = dynamic(
  () => import("@/components/ui/MealDetailDialog").then((mod) => mod.MealDetailDialog),
  { ssr: false },
);

export function CategoryClient({
  items,
  emptyLabel,
}: {
  items: MenuItem[];
  emptyLabel: string;
}) {
  const [selected, setSelected] = useState<DialogMeal | null>(null);

  if (items.length === 0) {
    return (
      <p className="font-nunito mt-8 border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <CategoryMealCard
            key={item.id}
            id={item.id}
            name={item.name}
            image={item.image}
            price={item.price}
            calories={item.calories}
            onClick={() => setSelected(toDialogMeal(item))}
          />
        ))}
      </ul>

      {selected && <MealDetailDialog item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
