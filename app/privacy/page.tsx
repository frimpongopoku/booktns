import type { Metadata } from "next";
import LegalPage, { LegalSectionBlock, LegalList } from "@/components/shared/LegalPage";
import {
  OPERATING_ENTITY,
  JURISDICTION,
  DATA_PROTECTION_ACT,
  PRIVACY_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  type LegalSection,
} from "@/lib/legal";

const SECTIONS: LegalSection[] = [
  { id: "responsibility", title: "Who this covers, and who is responsible for what" },
  { id: "collect", title: "Information we collect" },
  { id: "use", title: "How we use it" },
  { id: "notifications", title: "Booking notifications" },
  { id: "payments", title: "Payments" },
  { id: "billing", title: "Plan billing" },
  { id: "sharing", title: "Who we share information with" },
  { id: "cookies", title: "Cookies, analytics, and your choices" },
  { id: "retention", title: "How long we keep information" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your rights" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
];

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${OPERATING_ENTITY} collects, uses, and protects information on Booktns — for both vendors and the customers who book with them.`,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — Booktns",
    description: "How we handle vendor and customer information on Booktns.",
    url: "/privacy",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`Booktns is operated by ${OPERATING_ENTITY}, a business registered in ${JURISDICTION}. This policy explains what information we collect when you use Booktns, why we collect it, and what we do with it. It applies both to vendors who run a business on Booktns and to customers who book an appointment or place an order through a vendor's storefront.`}
      sections={SECTIONS}
      otherDocHref="/terms"
      otherDocLabel="Read our Terms of Service →"
    >
      <LegalSectionBlock id="responsibility" index={1} title={SECTIONS[0].title}>
        <p>
          Two different parties handle information on Booktns, and it matters which one you are dealing with.
        </p>
        <p>
          {OPERATING_ENTITY} is responsible for the Booktns platform itself — vendor accounts, the software, and
          the systems the service runs on. Each vendor is separately responsible for the information belonging to
          their own business: their services, their prices, their staff, and the details of the customers who book
          with them.
        </p>
        <p>
          If you booked an appointment or bought a product from a vendor on Booktns, that vendor decides how they
          use your details to serve you. We provide the software they use to do it. If you want your details
          removed from a particular vendor&apos;s records, contact that vendor directly — and if they don&apos;t
          respond, contact us and we will help.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="collect" index={2} title={SECTIONS[1].title}>
        <p><strong>From vendors and their staff.</strong> When you create a business on Booktns or are added to one:</p>
        <LegalList
          items={[
            "Your name and email address, from the Google account you sign in with. We do not receive or store your Google password.",
            "Your business details — name, description, location, contact phone and WhatsApp number, opening hours, and any logo, cover photo, or other images you upload.",
            "Your services, products, prices, and staff list.",
            "The payment details you choose to display to customers, such as a Mobile Money number or bank account, so customers know where to pay you.",
            "Optionally, your own name and contact details as the business owner, if you choose to add them.",
          ]}
        />
        <p><strong>From customers.</strong> When you book an appointment or place an order, the vendor asks for:</p>
        <LegalList
          items={[
            "Your name, phone number, and (for bookings) your email address, so the vendor can confirm and contact you.",
            "The services or products you selected, the time you chose, and any notes you added.",
          ]}
        />
        <p>
          Customers do not create accounts on Booktns and do not set a password. You only ever provide these
          details as part of making a specific booking or order.
        </p>
        <p><strong>Automatically.</strong> Like most websites, our servers record technical information when you visit — your IP address, browser type, the pages you requested, and the time. If something goes wrong, our error-tracking tool records diagnostic details about the failure so we can fix it.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="use" index={3} title={SECTIONS[2].title}>
        <p>We use the information above to:</p>
        <LegalList
          items={[
            "Create and run vendor accounts, and check that whoever signs in is on that business's staff list.",
            "Show a vendor's storefront, services, and products to customers.",
            "Take bookings and orders, check whether a requested time is actually available, and prevent the same slot being double-booked.",
            "Send booking and order confirmations, and generate the PDF confirmation a customer can download.",
            "Let vendors manage their own bookings, orders, and staff.",
            "Keep the service secure, investigate abuse or fraud, and diagnose faults.",
            "Measure how Booktns is used in aggregate, so we know what to improve — see section 8.",
            "Comply with the law, and respond to lawful requests.",
          ]}
        />
        <p>
          We do not sell your information. We do not share it with advertisers, and we do not use it to build
          advertising profiles.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="notifications" index={4} title={SECTIONS[3].title}>
        <p>
          When you make a booking, we send confirmation and status updates to the email address and phone number
          you provided — by email, and by SMS where the vendor has it enabled. Vendors and their management staff
          receive a notification when a new booking or order comes in.
        </p>
        <p>
          These are transactional messages about a booking you actually made, not marketing. Booktns does not send
          promotional email or SMS, and does not add you to a mailing list.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="payments" index={5} title={SECTIONS[4].title}>
        <p>
          Booktns does not currently process payments. When you pay a vendor, you pay them directly — by Mobile
          Money, bank transfer, or in person — using the details they display on their storefront.
        </p>
        <p>
          That means we never see, receive, or store your card number, your Mobile Money PIN, or any other payment
          credential. A deposit reference code shown on a booking is only a label to help the vendor match your
          payment to your appointment; it carries no financial information and is not a payment instrument.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="billing" index={6} title={SECTIONS[5].title}>
        <p>
          Booktns is currently free for vendors. If we introduce paid plans, a vendor would pay us directly and we
          would confirm the plan manually. We would not store card details or charge a vendor automatically, and we
          would update this policy before doing so.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="sharing" index={7} title={SECTIONS[6].title}>
        <p>
          We use a small number of outside services to run Booktns. Each one receives only what it needs to do its
          job:
        </p>
        <LegalList
          items={[
            <><strong>Google (Firebase Authentication)</strong> — verifies vendor and staff sign-in. Receives the email address of the account signing in.</>,
            <><strong>Resend</strong> — delivers transactional email, such as booking confirmations. Receives the recipient&apos;s email address and the contents of that message.</>,
            <><strong>Africa&apos;s Talking</strong> — delivers SMS notifications. Receives the recipient&apos;s phone number and the text of that message.</>,
            <><strong>Cloudflare R2</strong> — stores uploaded images and generated PDF confirmations.</>,
            <><strong>Sentry</strong> — records technical error reports so we can find and fix faults.</>,
            <><strong>PostHog</strong> — measures how the service is used: which pages are visited, and whether people who start a booking finish it. Receives page addresses and the usage events described in section 8. It does <strong>not</strong> receive customer names, phone numbers, email addresses, or booking notes.</>,
            <>Our <strong>hosting and database providers</strong>, which run the servers the service operates on.</>,
          ]}
        />
        <p>
          We may also disclose information where the law requires it, or where it is necessary to protect the
          rights and safety of our users or of {OPERATING_ENTITY}. If our business is ever sold or transferred,
          information may transfer with it, and we would tell you first.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="cookies" index={8} title={SECTIONS[7].title}>
        <p>
          <strong>Signing in.</strong> When a vendor or staff member signs in, we set a secure, HTTP-only session
          cookie so you stay signed in as you move between pages. It cannot be read by JavaScript and is not used
          to track you across other websites.
        </p>
        <p>
          <strong>Usage analytics.</strong> We use PostHog to understand how Booktns is used — for example, how
          many people visited a storefront, and how many of those who started a booking completed it. This sets a
          cookie that recognises the same browser across visits, so a person who returns twice is not counted as
          two people.
        </p>
        <p>What we record is the shape of what happened, not who did it:</p>
        <LegalList
          items={[
            "Pages visited, and the address of the page you arrived from.",
            "General technical details such as browser, device type, and approximate location derived from your IP address.",
            "Actions like starting or completing a booking, along with non-identifying details such as which vendor, how many services, and the total value.",
          ]}
        />
        <p>
          <strong>We do not send your name, phone number, email address, or booking notes to our analytics
          provider.</strong> Everyone is counted as an anonymous visitor — no profile is built about you
          personally, whether you are a customer or a vendor. Analytics run on public storefront pages only; the
          vendor dashboard is excluded entirely, so nothing a vendor does while signed in is measured this way.
        </p>
        <p>
          We do not use advertising cookies, we do not run third-party advertising pixels, and we do not sell or
          share analytics data with advertisers.
        </p>
        <p>
          <strong>Opting out.</strong> If your browser sends a &ldquo;Do Not Track&rdquo; signal, we honour it and
          collect no analytics from you at all. You can also block analytics with a browser content blocker, or
          clear these cookies through your browser settings, and Booktns will continue to work normally.
        </p>
        <p>
          Separately, your browser stores two things locally on your own device: your light-or-dark theme
          preference, and the contents of a shop cart before you place an order. These stay on your device.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="retention" index={9} title={SECTIONS[8].title}>
        <p>
          We keep a vendor&apos;s information for as long as their business is active on Booktns, and for a
          reasonable period afterwards to meet legal, accounting, and dispute-resolution obligations.
        </p>
        <p>
          Bookings and orders are kept as part of a vendor&apos;s business records. Cancelled bookings and removed
          services or products are marked inactive rather than erased immediately, so a vendor keeps an accurate
          history of what was actually agreed and charged.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="security" index={10} title={SECTIONS[9].title}>
        <p>
          Traffic to Booktns is encrypted in transit. Sign-in sessions use signed, HTTP-only cookies, and every
          request for a vendor&apos;s data is checked server-side against the signed-in staff member&apos;s account
          and role, so one vendor cannot read another&apos;s information.
        </p>
        <p>
          No system is perfectly secure, and we cannot guarantee absolute protection. If we become aware of a
          breach affecting your information, we will act promptly and notify those affected where the law requires.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="rights" index={11} title={SECTIONS[10].title}>
        <p>Under {DATA_PROTECTION_ACT}, you may:</p>
        <LegalList
          items={[
            "Ask what information we hold about you.",
            "Ask us to correct information that is wrong or out of date.",
            "Ask us to delete information, where we are not required to keep it.",
            "Object to a particular use of your information.",
          ]}
        />
        <p>
          Write to us at <a href={`mailto:${PRIVACY_EMAIL}`} className="underline" style={{ color: "var(--ac)" }}>{PRIVACY_EMAIL}</a>{" "}
          and we will respond. Remember the split in section 1: for details a specific vendor holds about you as
          their customer, that vendor is the right first stop.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="children" index={12} title={SECTIONS[11].title}>
        <p>
          Booktns is not directed at children. Vendor accounts are for people aged 18 or over. We do not knowingly
          collect information from a child, and if we learn that we have, we will delete it.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" index={13} title={SECTIONS[12].title}>
        <p>
          We may update this policy as Booktns changes. When we make a material change, we will update the
          effective date at the top of this page. This version is effective {LEGAL_EFFECTIVE_DATE}.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="contact" index={14} title={SECTIONS[13].title}>
        <p>
          Questions about this policy, or about information we hold, go to{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="underline" style={{ color: "var(--ac)" }}>{PRIVACY_EMAIL}</a>.
        </p>
        <p>
          Booktns is operated by {OPERATING_ENTITY}, a business registered in {JURISDICTION}.
        </p>
      </LegalSectionBlock>
    </LegalPage>
  );
}
