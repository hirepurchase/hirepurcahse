import type { Metadata } from "next";
import Link from "next/link";

/**
 * Public privacy policy for the hire purchase service and the AIDOO TECH
 * customer app. Linked from app store listings (Palm Store), so it must load
 * without signing in and read well on a phone.
 */

export const metadata: Metadata = {
  title: "Privacy Policy · Aidoo Tech Solutions",
  description: "How Aidoo Tech Solutions collects, uses and protects personal information in its hire purchase service and the AIDOO TECH app.",
};

const UPDATED = "16 November 2026";
const SUPPORT_PHONES = ["0303981216", "0303983472", "0303984318"];

const SECTIONS = [
  { id: "who", title: "Who we are" },
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "device", title: "Phone locking on hire purchase devices" },
  { id: "share", title: "Who we share it with" },
  { id: "store", title: "Where it is stored and how long we keep it" },
  { id: "security", title: "How we protect it" },
  { id: "rights", title: "Your rights" },
  { id: "app", title: "The AIDOO TECH app" },
  { id: "children", title: "Age" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="operations-panel scroll-mt-6 p-5 sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-slate-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-5 sm:px-8">
          <img src="/logo-mark-white.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          <Link href="/" className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">Aidoo Tech Solutions</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">Hire Purchase</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>
        <p className="mt-6 text-base leading-7 text-slate-700">
          This policy explains what personal information Aidoo Tech Solutions collects when you buy a phone or other
          item from us on hire purchase, how we use it, who we share it with, and the choices you have. It covers our
          hire purchase service, the customer website and the AIDOO TECH mobile app.
        </p>

        <nav aria-label="Contents" className="operations-panel mt-8 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contents</p>
          <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-slate-700 decoration-blue-700 hover:underline">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          <Section id="who" title="1. Who we are">
            <p>
              Aidoo Tech Solutions (&ldquo;we&rdquo;, &ldquo;us&rdquo;) sells phones and other goods in Ghana on hire
              purchase, through our own staff and a network of sales agents. We are responsible for the personal
              information described in this policy.
            </p>
          </Section>

          <Section id="collect" title="2. What we collect">
            <p>When you take out a hire purchase contract, our agent records:</p>
            <List
              items={[
                "your name, phone number, email address (if you give one), home address and date of birth;",
                "your national ID number and a passport-style photo;",
                "your signature on the contract;",
                "the name and phone number of your guarantor;",
                "the item you bought, its serial number or IMEI, the price, the deposit and your payment plan.",
              ]}
            />
            <p>While your contract runs, we also keep:</p>
            <List
              items={[
                "the payments you make: amount, date, the mobile money network and number used, and the transaction reference;",
                "the instalments due, any late charges, and any temporary unlock you pay for;",
                "notes from calls our customer service team makes to you, and messages we send you;",
                "for phones we can lock: the phone's lock status, when it last connected, and the version of the locking software on it (see section 4).",
              ]}
            />
            <p>
              We may check that the name registered to a mobile money number matches the name you gave us. We never
              ask for or receive your mobile money PIN.
            </p>
          </Section>

          <Section id="use" title="3. How we use it">
            <List
              items={[
                "to set up and run your contract, take your payments and keep an accurate record of what you owe;",
                "to confirm who you are and reduce fraud;",
                "to send you payment confirmations, reminders and notices by SMS, email, in the app or on your phone's lock screen;",
                "to contact you, or if we cannot reach you your guarantor, about missed payments;",
                "to lock and unlock a financed phone as described in section 4;",
                "to keep the accounting and business records the law requires, and to resolve disputes.",
              ]}
            />
            <p>
              We use your information because we need it to carry out the contract you signed with us, to meet our
              legal obligations, and for our legitimate interest in recovering goods and payments. We do not sell your
              information and we do not use it for advertising.
            </p>
          </Section>

          <Section id="device" title="4. Phone locking on hire purchase devices">
            <p>
              Phones sold on hire purchase are enrolled with a device management service before you receive them:
              Samsung Knox Guard for Samsung phones, and PayTrigger, run by Transsion, for Tecno, Infinix and itel
              phones. You agree to this when you sign your contract.
            </p>
            <List
              items={[
                "If a payment is overdue, the phone may be locked until you pay.",
                "The lock screen shows how much is due, the due date and how to contact us or your agent.",
                "Some phones lock on their own once a payment is overdue, even without an internet connection.",
                "When the phone has been fully paid for, the lock is removed for good.",
              ]}
            />
            <p>
              To do this, the service holds your phone&apos;s IMEI, its lock status and when it last connected. It does
              not give us access to your messages, photos, contacts, calls or location.
            </p>
          </Section>

          <Section id="share" title="5. Who we share it with">
            <p>We share only what each party needs:</p>
            <List
              items={[
                "the sales agent and cluster leader responsible for your contract, and our staff who need it for their work;",
                <>
                  <strong className="font-semibold text-slate-900">Hubtel</strong>, to process mobile money payments
                  and to check mobile money registered names;
                </>,
                <>
                  <strong className="font-semibold text-slate-900">Samsung (Knox Guard)</strong> and{" "}
                  <strong className="font-semibold text-slate-900">Transsion (PayTrigger)</strong>, to lock and unlock
                  financed phones;
                </>,
                "our SMS and email providers, to send you messages;",
                "the companies that host our systems: Supabase (database and file storage), DigitalOcean (servers) and Vercel (website);",
                "the police, courts or regulators, when the law requires it.",
              ]}
            />
          </Section>

          <Section id="store" title="6. Where it is stored and how long we keep it">
            <p>
              Your information is stored by the hosting companies named above. Some of them keep data outside Ghana,
              including in the European Union and the United States. We choose providers that protect data to a
              recognised standard.
            </p>
            <p>
              We keep your information while your contract is open. After it ends, we keep it for as long as we need
              to for accounting, tax and legal purposes and to deal with any dispute, and then delete or anonymise it.
            </p>
          </Section>

          <Section id="security" title="7. How we protect it">
            <p>
              Access to customer records is limited to staff and agents who need it, each with their own account and
              permissions. Passwords are never stored in readable form, connections to our systems are encrypted, and important
              changes are recorded in an audit trail. In the app, your sign-in is kept in your phone&apos;s secure
              storage.
            </p>
          </Section>

          <Section id="rights" title="8. Your rights">
            <p>Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you can ask us to:</p>
            <List
              items={[
                "tell you what information we hold about you and give you a copy;",
                "correct information that is wrong or out of date;",
                "delete information we no longer need. We may have to keep some records while a contract is open or the law requires it;",
                "stop using your information for a purpose you object to, where the law allows.",
              ]}
            />
            <p>
              To make a request, contact us using the details in section 12. We may need to confirm your identity
              first. If you are not satisfied with our answer, you can complain to the Data Protection Commission of
              Ghana.
            </p>
          </Section>

          <Section id="app" title="9. The AIDOO TECH app">
            <p>
              The app lets you see your contracts, make payments and view your payment history. It uses the internet
              to reach our servers. The app has no advertising and no third-party tracking, and it does not read your
              contacts, messages, photos or location.
            </p>
            <p>
              To close your app account or ask for your data to be deleted, contact us using the details in section
              12.
            </p>
          </Section>

          <Section id="children" title="10. Age">
            <p>
              Our hire purchase service is for adults. Customers must be at least 20 years old, and we do not knowingly
              collect information about children.
            </p>
          </Section>

          <Section id="changes" title="11. Changes to this policy">
            <p>
              We may update this policy. The date at the top shows when it last changed. If a change significantly
              affects how we use your information, we will tell you by SMS or in the app.
            </p>
          </Section>

          <Section id="contact" title="12. Contact us">
            <p>For questions about this policy or your information, call Aidoo Tech Solutions on:</p>
            <p className="flex flex-wrap gap-x-5 gap-y-1">
              {SUPPORT_PHONES.map((n) => (
                <a key={n} href={`tel:${n}`} className="font-semibold text-blue-800 hover:underline">
                  {n}
                </a>
              ))}
            </p>
            <p>You can also speak to the agent who handles your contract.</p>
          </Section>
        </div>

        <p className="mt-14 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-400">
          hirepurchase.aidootechsolutions.com/privacy · &copy; {new Date().getFullYear()} Aidoo Tech Solutions
        </p>
      </main>
    </div>
  );
}
