import { setRequestLocale, getTranslations } from "next-intl/server"
import { Nav } from "@/components/landing/Nav"

const roman = (n: number): string => {
  const table: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ]
  let result = ""
  let remaining = n
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}

type TermItem = { term?: string; desc: string }
type TermSection = {
  title: string
  items?: TermItem[]
  clauses?: string[]
}

export default async function TermsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("terms")
  const sections = t.raw("sections") as TermSection[]
  const declarationItems = t.raw("declarationItems") as string[]

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      <main className="mx-auto max-w-3xl px-4 py-24 sm:px-8 lg:py-28">
        <div className="mb-10">
          <h1 className="font-playfair text-3xl font-medium text-neutral-900 sm:text-4xl">{t("title")}</h1>
          <p className="font-nunito mt-3 text-sm text-neutral-500">{t("license")}</p>
          <p className="font-nunito mt-6 border-l-2 border-brand-900 pl-4 text-sm leading-relaxed text-neutral-600">
            {t("intro")}
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={section.title}>
              <h2 className="font-playfair mb-4 border-b border-neutral-100 pb-2 text-xl font-medium text-neutral-900">
                {roman(i + 1)}. {section.title}
              </h2>

              {"items" in section && section.items && (
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.desc} className="text-sm leading-relaxed text-neutral-600">
                      {"term" in item && item.term ? (
                        <span className="font-semibold text-neutral-800">{item.term} — </span>
                      ) : null}
                      {item.desc}
                    </li>
                  ))}
                </ul>
              )}

              {"clauses" in section && section.clauses && (
                <ol className="space-y-2.5">
                  {section.clauses.map((clause, idx) => (
                    <li key={idx} className="flex gap-3 text-sm leading-relaxed text-neutral-600">
                      <span className="font-nunito mt-0.5 shrink-0 text-xs font-semibold text-neutral-400">
                        {idx + 1}.
                      </span>
                      {clause}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-neutral-100 pt-8">
          <h3 className="font-playfair text-lg font-medium text-neutral-900">{t("declarationTitle")}</h3>
          <ul className="mt-3 space-y-2">
            {declarationItems.map((item) => (
              <li key={item} className="font-nunito flex gap-2 text-sm text-neutral-600">
                <span className="text-brand-900">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-nunito mt-8 text-center text-xs text-neutral-400">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </main>
    </div>
  )
}