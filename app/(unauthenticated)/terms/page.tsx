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

const sections = [
  {
    title: "Definitions",
    items: [
      {
        term: "Agreement",
        desc: "This Meal Plan Service Agreement.",
      },
      {
        term: "Meal Plan",
        desc: "The subscription package purchased by the Customer.",
      },
      {
        term: "Subscription",
        desc: "The agreed duration of the Meal Plan.",
      },
      {
        term: "Delivery Day",
        desc: "Any scheduled day on which meals are delivered.",
      },
      {
        term: "Website",
        desc: "Cook Connect's official website or QR-code information portal containing operational information, policies, menus, FAQs, and customer forms.",
      },
    ],
  },
  {
    title: "Our Services",
    clauses: [
      "Cook Connect provides freshly prepared meals delivered within our designated service areas in the United Arab Emirates.",
      "Meal Plans are prepared according to the Customer's selected subscription, nutritional goal, meal frequency, dietary preferences, and food restrictions as provided during registration.",
      "Operational information, including delivery schedules, menu publication dates, ordering deadlines, heating instructions, storage guidance, and similar procedures, is published on our Website and may be updated from time to time.",
    ],
  },
  {
    title: "Subscription",
    clauses: [
      "A Meal Plan becomes active only after payment has been successfully received and the agreed commencement date has been confirmed.",
      "The Customer shall provide complete and accurate information during registration.",
      "Subscription plans are personal to the Customer and may not be transferred without Cook Connect's prior written approval.",
    ],
  },
  {
    title: "Payment",
    clauses: [
      "The Customer shall pay the Meal Plan fees either (a) in full before the commencement of the Subscription; or (b) through an approved installment payment plan offered by Cook Connect.",
      "Where an installment payment plan has been approved, the Customer agrees to pay each installment on or before its scheduled due date.",
      "Cook Connect may provide a grace period for overdue installment payments in accordance with its payment policy or as otherwise communicated to the Customer.",
      "If any installment remains unpaid after the applicable grace period, Cook Connect reserves the right to suspend the Customer's Subscription, including the preparation and delivery of meals, until all outstanding amounts have been paid in full.",
      "During any suspension resulting from overdue payment, missed deliveries shall not be replaced, credited, or refunded unless otherwise approved by Cook Connect in writing.",
      "Once all outstanding payments have been received, the Subscription may resume from the next available delivery date, subject to Cook Connect's production schedule and operational availability.",
      "Unless otherwise expressly stated, all prices and fees charged by Cook Connect are inclusive of applicable Value Added Tax (VAT).",
    ],
  },
  {
    title: "Meal Plans",
    clauses: [
      "Meals are prepared from Cook Connect's rotating menu.",
      "Customers may either (a) receive the Chef's recommended weekly meal rotation; or (b) select meals from the weekly menu before the published selection deadline.",
      "If no meal selections are received before the applicable deadline, Cook Connect shall prepare meals based on the Chef's recommended rotation.",
      "Cook Connect reserves the right to substitute meals with alternatives of comparable quality and nutritional value where ingredients become unavailable or operational circumstances require.",
    ],
  },
  {
    title: "Dietary Requests",
    clauses: [
      "Cook Connect will make reasonable efforts to accommodate dietary preferences and ingredient exclusions.",
      "Requests remain subject to ingredient availability, production schedules, food safety requirements, and operational capacity.",
      "Requests requiring significant recipe modifications or premium ingredients may incur additional charges or require enrolment in a customized meal plan.",
    ],
  },
  {
    title: "Delivery",
    clauses: [
      "Delivery shall be made to the address provided by the Customer.",
      "The Customer is responsible for ensuring that the delivery address is accurate, contact information remains current, and access instructions are provided where necessary.",
      "Where the Customer authorizes meals to be left with reception, security personnel, or another designated location, responsibility for the meals transfers to the Customer upon delivery.",
      "Cook Connect shall not be responsible for delays arising from traffic conditions, severe weather, government restrictions, building access limitations, or other events beyond its reasonable control.",
    ],
  },
  {
    title: "Pausing or Rescheduling",
    clauses: [
      "Subject to operational requirements, Customers may request to pause or reschedule deliveries in accordance with the procedures published on the Website.",
      "Any unused subscription days must be utilized within three (3) months from the original subscription commencement date.",
      "Subscription days remaining after this period shall expire unless otherwise approved by Cook Connect.",
    ],
  },
  {
    title: "Food Allergies",
    clauses: [
      "Customers are responsible for informing Cook Connect of all allergies, intolerances, and dietary restrictions before commencing a Meal Plan.",
      "While Cook Connect follows appropriate food preparation procedures, meals are prepared in a kitchen that handles common allergens, including but not limited to dairy, eggs, seafood, soy, gluten, peanuts, and tree nuts.",
      "Cook Connect cannot guarantee that meals are entirely free from allergens.",
    ],
  },
  {
    title: "Customer Responsibilities",
    items: [
      { desc: "Provide complete and accurate information." },
      { desc: "Consume meals within the recommended storage period." },
      { desc: "Store and reheat meals in accordance with the instructions provided." },
      { desc: "Promptly notify Cook Connect of any delivery issues." },
      { desc: "Communicate respectfully with Company personnel." },
    ],
  },
  {
    title: "Refunds and Cancellations",
    clauses: [
      "Requests for cancellation shall be considered only for the unused portion of the Subscription.",
      "Approved refunds shall be calculated after deducting: bank processing charges of 3%, an administrative service fee of 5%, and a delivery charge of AED 10 for each completed delivery day.",
      "Meals already prepared or delivered are non-refundable.",
      "Refunds, where approved, shall be processed using the original payment method where reasonably practicable.",
      "Nothing contained in this Agreement shall exclude or restrict any rights available to consumers under applicable laws of the United Arab Emirates.",
    ],
  },
  {
    title: "Limitation of Liability",
    clauses: [
      "Cook Connect shall not be liable for losses arising from: incorrect information supplied by the Customer; failure by the Customer to receive deliveries; improper storage or handling after delivery; undisclosed allergies or medical conditions; or circumstances beyond Cook Connect's reasonable control.",
      "To the maximum extent permitted by law, Cook Connect's total liability shall not exceed the value of the affected meal(s) or the unused portion of the Subscription giving rise to the claim.",
    ],
  },
  {
    title: "Privacy",
    clauses: [
      "Cook Connect collects and processes Customer information solely for the purpose of administering Meal Plans, preparing meals, arranging deliveries, communicating with Customers, and complying with applicable legal obligations.",
    ],
  },
  {
    title: "Amendments",
    clauses: [
      "Cook Connect may amend this Agreement from time to time.",
      "Any amendments shall apply to future purchases and renewals. Existing subscriptions shall continue to be governed by the version accepted by the Customer unless otherwise required by law.",
    ],
  },
  {
    title: "Governing Law",
    clauses: [
      "This Agreement shall be governed by and construed in accordance with the laws of the United Arab Emirates.",
      "The parties agree to attempt to resolve any dispute amicably before commencing formal legal proceedings.",
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      <main className="mx-auto max-w-3xl px-4 py-24 sm:px-8 lg:py-28">
        <div className="mb-10">
          <h1 className="font-playfair text-3xl font-medium text-neutral-900 sm:text-4xl">Service Agreement</h1>
          <p className="font-nunito mt-3 text-sm text-neutral-500">
            License No. 77454 &nbsp;·&nbsp; TRN: 100385961600003
          </p>
          <p className="font-nunito mt-6 border-l-2 border-brand-900 pl-4 text-sm leading-relaxed text-neutral-600">
            This Meal Plan Service Agreement is entered into between Cook Connect Restaurant LLC and
            the individual purchasing a meal subscription. By purchasing, subscribing to, or renewing
            a meal plan, you acknowledge that you have read, understood, and agreed to be bound by
            this Agreement.
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
          <h3 className="font-playfair text-lg font-medium text-neutral-900">Customer Declaration</h3>
          <ul className="mt-3 space-y-2">
            {[
              "I have read and understood this Meal Plan Service Agreement.",
              "The information provided by me is complete and accurate.",
              "I understand the refund and cancellation policy.",
              "I agree to comply with the terms of this Agreement.",
            ].map((item) => (
              <li key={item} className="font-nunito flex gap-2 text-sm text-neutral-600">
                <span className="text-brand-900">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-nunito mt-8 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Cook Connect Restaurant LLC. All rights reserved.
        </p>
      </main>
    </div>
  )
}