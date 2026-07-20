import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between bg-brand-900 px-6 py-4 text-white">
        <span className="text-xl font-bold tracking-tight">CookConnect</span>
        <Link
          href="/login"
          className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-brand-700"
        >
          Sign In
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
          Fresh, Custom Meal Plans — Delivered to Your Door
        </h1>
        <p className="mt-4 max-w-lg text-lg text-text-secondary">
          CookConnect makes it easy to subscribe to a meal plan that fits your lifestyle.
          Customize your weekly menu, and we&apos;ll handle the rest.
        </p>
        <Link
          href="/login"
          className="mt-8 rounded-lg bg-brand-900 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-brand-700"
        >
          Get Started
        </Link>
      </main>
    </div>
  )
}
