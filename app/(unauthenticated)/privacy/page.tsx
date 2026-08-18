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
    title: "Introduction",
    clauses: [
      "This Privacy Policy explains how Cook Connect Restaurant LLC (\"Cook Connect\", \"we\", \"us\") collects, uses, and protects your personal information when you use our Website, place an inquiry, or subscribe to a Meal Plan.",
      "By using our Website or submitting an inquiry, you acknowledge and agree to the practices described in this Policy.",
    ],
  },
  {
    title: "Information We Collect",
    clauses: [
      "Contact details, including your full name, email address, and mobile number, which you provide when placing an order or submitting an inquiry.",
      "Delivery location, including the address you provide and the coordinates selected through our location picker, so we can determine delivery availability and arrange delivery.",
      "Order details, including the meal items selected, quantities, notes, and payment-related information provided through our payment partners.",
      "Technical information such as your IP address, browser type, and device information, collected automatically when you visit the Website.",
    ],
  },
  {
    title: "How We Use Your Information",
    clauses: [
      "To process your inquiry and place your order with our team.",
      "To confirm delivery availability, calculate delivery fees, and arrange delivery to your specified location.",
      "To contact you regarding your order, delivery updates, and any questions related to your inquiry.",
      "To administer Meal Plans, prepare meals in accordance with your dietary preferences and restrictions, and manage payments.",
      "To comply with applicable legal obligations and to improve our Website, services, and customer experience.",
    ],
  },
  {
    title: "Legal Basis for Processing",
    clauses: [
      "We process your personal information where it is necessary to perform the contract between you and Cook Connect (such as processing your order and arranging delivery).",
      "We also process your information where we have a legitimate interest, such as improving our services and maintaining the security of our systems, and where required to comply with legal obligations.",
    ],
  },
  {
    title: "Sharing of Information",
    clauses: [
      "We do not sell your personal information to third parties.",
      "We may share your information with service providers who assist us in operating the Website and delivering our services, such as delivery partners, payment processors, and hosting providers, only to the extent necessary to provide those services.",
      "We may disclose your information where required by law, regulation, or legal process, or to protect the rights, property, or safety of Cook Connect, our customers, or others.",
    ],
  },
  {
    title: "Data Security",
    clauses: [
      "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
      "While we take reasonable precautions, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Data Retention",
    clauses: [
      "We retain your personal information only for as long as necessary to fulfill the purposes described in this Policy, comply with legal obligations, and resolve any disputes.",
    ],
  },
  {
    title: "Your Rights",
    clauses: [
      "You have the right to request access to, correction of, or deletion of the personal information we hold about you.",
      "You may also object to or request restrictions on certain processing activities where applicable under law.",
      "To exercise any of these rights, please contact us using the details provided in the \"Contact Us\" section below.",
    ],
  },
  {
    title: "Children's Privacy",
    clauses: [
      "Our Website and services are not directed to children under the age of 18, and we do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "Changes to This Policy",
    clauses: [
      "We may update this Privacy Policy from time to time. Any changes will be posted on this page, and the revised Policy will apply to information collected after the date of the change.",
    ],
  },
  {
    title: "Contact Us",
    clauses: [
      "If you have any questions or concerns about this Privacy Policy or how we handle your personal information, please contact us at the details published on our Website.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      <main className="mx-auto max-w-3xl px-4 py-24 sm:px-8 lg:py-28">
        <div className="mb-10">
          <h1 className="font-playfair text-3xl font-medium text-neutral-900 sm:text-4xl">Privacy Policy</h1>
          <p className="font-nunito mt-3 text-sm text-neutral-500">
            Cook Connect Restaurant LLC &nbsp;·&nbsp; License No. 77454 &nbsp;·&nbsp; TRN: 100385961600003
          </p>
          <p className="font-nunito mt-6 border-l-2 border-brand-900 pl-4 text-sm leading-relaxed text-neutral-600">
            This Privacy Policy explains how Cook Connect collects and uses your personal information when you
            place an order, submit an inquiry, or use our Website. By using our Website, you agree to the
            collection and use of your information as described in this Policy.
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={section.title}>
              <h2 className="font-playfair mb-4 border-b border-neutral-100 pb-2 text-xl font-medium text-neutral-900">
                {roman(i + 1)}. {section.title}
              </h2>
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
            </section>
          ))}
        </div>

        <p className="font-nunito mt-8 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Cook Connect Restaurant LLC. All rights reserved.
        </p>
      </main>
    </div>
  )
}
