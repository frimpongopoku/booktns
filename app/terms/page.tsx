import type { Metadata } from "next";
import LegalPage, { LegalSectionBlock, LegalList } from "@/components/shared/LegalPage";
import { OPERATING_ENTITY, JURISDICTION, LEGAL_EMAIL, LEGAL_EFFECTIVE_DATE, type LegalSection } from "@/lib/legal";

const SECTIONS: LegalSection[] = [
  { id: "what", title: "What Booktns is" },
  { id: "accounts", title: "Accounts" },
  { id: "vendors", title: "If you're a vendor" },
  { id: "customers", title: "If you're a customer" },
  { id: "appointments", title: "Appointments, deposits, and cancellations" },
  { id: "payments", title: "Payments" },
  { id: "fees", title: "Fees" },
  { id: "domains", title: "Custom domains" },
  { id: "termination", title: "Suspension and termination" },
  { id: "disclaimers", title: "Disclaimers and liability" },
  { id: "changes", title: "Changes to these terms" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Contact us" },
];

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms under which ${OPERATING_ENTITY} provides Booktns to vendors and their customers.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — Booktns",
    description: "The terms under which we provide Booktns to vendors and their customers.",
    url: "/terms",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms govern your use of Booktns, operated by ${OPERATING_ENTITY}, a business registered in ${JURISDICTION}. They apply whether you run a business on Booktns or book an appointment through one. By using Booktns, you agree to them.`}
      sections={SECTIONS}
      otherDocHref="/privacy"
      otherDocLabel="Read our Privacy Policy →"
    >
      <LegalSectionBlock id="what" index={1} title={SECTIONS[0].title}>
        <p>
          Booktns is software that lets a beauty or personal-care business publish a storefront, take appointment
          bookings, and sell products. We provide the tools. The businesses using them are independent and are not
          owned, employed, or supervised by us.
        </p>
        <p>
          <strong>Booktns is not a party to any appointment or sale.</strong> We do not provide beauty services, we
          do not employ or vet the staff who perform them, we do not inspect, store, or ship any product sold
          through a storefront, and we do not own any of it. The agreement is between the customer and the vendor.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="accounts" index={2} title={SECTIONS[1].title}>
        <p>
          Vendors and their staff sign in with Google. There are no passwords on Booktns. A staff member can only
          sign in if the business owner has already added their email address to that business — signing in with
          Google proves who you are, it does not by itself grant access to anyone&apos;s business.
        </p>
        <p>
          You are responsible for what happens under your account, and for keeping your Google account secure. Tell
          us promptly if you believe someone has gained access to a business you run.
        </p>
        <p>
          Customers do not need an account. You book as a guest, and you are responsible for giving accurate
          contact details so the vendor can reach you.
        </p>
        <p>You must be able to enter a binding contract where you live in order to run a business on Booktns.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="vendors" index={3} title={SECTIONS[2].title}>
        <p>You are responsible for your business. That includes:</p>
        <LegalList
          items={[
            "That your services, products, prices, durations, and opening hours are accurate and current.",
            "Honouring the appointments you accept, and fulfilling the orders you receive.",
            "That the payment details you display are correct and belong to you.",
            "Handling your own customer questions, complaints, refunds, and disputes.",
            "Any licence, registration, insurance, or tax obligation that applies to your trade.",
            "Treating your customers' information lawfully — you decide how you use it, so it is yours to look after.",
          ]}
        />
        <p>You must not use Booktns to advertise or sell anything illegal, counterfeit, unsafe, or fraudulent, to impersonate another business, or to mislead customers about what you are offering.</p>
        <p>
          You keep ownership of everything you upload — your photos, videos, descriptions, and branding. You give
          us only the permission needed to host that content and display it on your storefront while you use
          Booktns. You confirm you have the right to use whatever you upload.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="customers" index={4} title={SECTIONS[3].title}>
        <p>
          When you book an appointment or place an order, your agreement is with the vendor, not with Booktns. They
          set the price, provide the service, and are responsible for delivering what they promised.
        </p>
        <p>
          Use your judgement before paying anyone. A storefront on Booktns is not a recommendation or an
          endorsement, and we do not verify the quality of any vendor&apos;s work. If something goes wrong, contact
          the vendor first — but do tell us if you believe a vendor is behaving fraudulently, because that is
          something we act on.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="appointments" index={5} title={SECTIONS[4].title}>
        <p>
          A booking request is not confirmed until the vendor confirms it. Until then, the time you selected is not
          guaranteed. Once confirmed, the vendor may still need to reschedule or cancel, and they will contact you
          if so.
        </p>
        <p>
          Where a vendor requires a deposit, that deposit is paid directly to them and is subject to their own
          cancellation policy, which is shown to you when you book and on your booking confirmation.{" "}
          <strong>Booktns does not hold, refund, or arbitrate deposits.</strong> Whether a deposit is refundable,
          and under what conditions, is between you and the vendor.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="payments" index={6} title={SECTIONS[5].title}>
        <p>
          <strong>Booktns does not process, hold, or refund payments.</strong> Customers pay vendors directly using
          the Mobile Money, bank, or cash details the vendor displays.
        </p>
        <p>
          We are not responsible for a payment sent to the wrong number, a payment a vendor says they did not
          receive, or a refund a vendor declines to make. If we introduce payment processing in future, we will
          update these terms before doing so.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="fees" index={7} title={SECTIONS[6].title}>
        <p>
          Booktns is currently free to use. If we introduce paid plans, we will say so clearly in advance. A vendor
          would pay us directly and we would activate the plan manually — we would not charge you automatically or
          store your card details. Fees paid for an approved plan are non-refundable except where the law requires
          otherwise.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="domains" index={8} title={SECTIONS[7].title}>
        <p>
          A vendor may point their own domain at their Booktns storefront. The domain remains yours: you register
          it, you pay for it, and you are responsible for renewing it and for keeping its DNS records correct. We
          are not responsible for a storefront becoming unreachable because a domain expired or its records were
          changed elsewhere.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="termination" index={9} title={SECTIONS[8].title}>
        <p>
          We may suspend or remove a storefront that breaks these terms — in particular for fraud, scams, illegal
          listings, or impersonation. Where circumstances allow, we will tell you why and give you a chance to put
          it right. Serious or repeated abuse may be removed without notice.
        </p>
        <p>
          You may stop using Booktns at any time, and you may ask us to close your business account and delete its
          data. Some records may be retained where the law requires it, as described in our Privacy Policy.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="disclaimers" index={10} title={SECTIONS[9].title}>
        <p>
          Booktns is provided &ldquo;as is&rdquo;. We do not promise that it will be uninterrupted, error-free, or
          available at any particular time, and we may change or discontinue features.
        </p>
        <p>To the fullest extent the law allows, {OPERATING_ENTITY} is not liable for:</p>
        <LegalList
          items={[
            "Any dispute between a vendor and a customer, including a service not performed as expected or a product not delivered.",
            "Any payment made to a vendor, including money lost to a scam or sent in error.",
            "An appointment that a vendor cancels, misses, or reschedules.",
            "Lost profits, lost business, or other indirect or consequential losses arising from your use of Booktns.",
          ]}
        />
        <p>
          Nothing in these terms limits liability that cannot lawfully be limited.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" index={11} title={SECTIONS[10].title}>
        <p>
          We may update these terms. When we make a material change, we will update the effective date at the top
          of this page. Continuing to use Booktns after that means you accept the updated terms. This version is
          effective {LEGAL_EFFECTIVE_DATE}.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="law" index={12} title={SECTIONS[11].title}>
        <p>
          These terms are governed by the laws of {JURISDICTION}, without regard to conflict-of-law principles. The
          courts of {JURISDICTION} have jurisdiction over any dispute arising from them.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="contact" index={13} title={SECTIONS[12].title}>
        <p>
          Legal questions go to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className="underline" style={{ color: "var(--ac)" }}>{LEGAL_EMAIL}</a>.
          Vendors can also reach us from Settings → Help &amp; Support in the dashboard.
        </p>
        <p>Booktns is operated by {OPERATING_ENTITY}, a business registered in {JURISDICTION}.</p>
      </LegalSectionBlock>
    </LegalPage>
  );
}
