import { MealsSectionNav } from "./MealsSectionNav"

export default function MealsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <MealsSectionNav />
      {children}
    </div>
  )
}
