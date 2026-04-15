import { Link } from 'react-router-dom';
import { BRAND_NAME, BRAND_PROMISE, BRAND_TAGLINE } from '../constants/brand.js';

const featureCards = [
  {
    title: 'Verified hospital lane',
    text: 'Hospital verification, request ownership, and audit history stay visible from the first request to final outcome.',
  },
  {
    title: 'Reactive donor matching',
    text: 'Urgent cases do not just wait for timers. New eligible donors can wake pending requests back up automatically.',
  },
  {
    title: 'Location-aware response',
    text: 'Google Maps-assisted location picking feeds the same geo-matching engine already used by the backend.',
  },
];

const flowSteps = [
  'Patient or hospital creates an emergency request with exact location.',
  'BIO SYNC scores compatible donors by urgency, distance, and reliability.',
  'Shortlisted donors receive live notifications and respond from their dashboard.',
  'Hospitals track the accepted donor and confirm the final medical outcome.',
];

export default function Landing() {
  return (
    <>
      <div className="page-shell py-12 space-y-8">
        <section className="card px-6 py-8 md:px-10 md:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <div className="brand-pill">{BRAND_NAME} emergency network</div>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-bold leading-tight text-blood-dark md:text-6xl">
                  Smarter coordination for urgent blood and organ response.
                </h1>
                <p className="max-w-2xl text-lg text-medical-gray">{BRAND_PROMISE}</p>
                <p className="max-w-2xl text-sm uppercase tracking-[0.28em] text-blood-red/75">
                  {BRAND_TAGLINE}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary text-base px-7 py-3">Start with Google</Link>
                <Link to="/login" className="btn-secondary text-base px-7 py-3">Open workspace</Link>
                <a href="#how" className="btn-secondary text-base px-7 py-3">See flow</a>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="interactive-card">
                  <p className="font-display text-3xl font-bold text-blood-dark">4 roles</p>
                  <p className="mt-2 text-sm text-medical-gray">Donor, patient, hospital, and admin work from one system.</p>
                </div>
                <div className="interactive-card">
                  <p className="font-display text-3xl font-bold text-blood-dark">Live</p>
                  <p className="mt-2 text-sm text-medical-gray">Matching, notifications, and escalation keep requests moving.</p>
                </div>
                <div className="interactive-card">
                  <p className="font-display text-3xl font-bold text-blood-dark">Geo</p>
                  <p className="mt-2 text-sm text-medical-gray">Distance-aware scoring plus Google Maps-assisted location picking.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {featureCards.map((card, index) => (
                <div
                  key={card.title}
                  className="interactive-card"
                  style={{ animation: `fade-up 520ms ease-out ${index * 90}ms both` }}
                >
                  <p className="font-display text-xl font-semibold text-blood-dark">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-medical-gray">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card">
            <div className="brand-pill mb-4">How it works</div>
            <h2 className="font-display text-3xl font-bold text-blood-dark">BIO SYNC flow</h2>
            <div className="mt-6 space-y-4">
              {flowSteps.map((step, index) => (
                <div key={step} className="interactive-card flex items-start gap-4">
                  <div className="brand-mark h-10 w-10 min-w-[2.5rem] rounded-xl text-[0.7rem]">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-medical-gray">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="brand-pill mb-4">Role lanes</div>
            <div className="space-y-4">
              <div className="interactive-card">
                <p className="font-display text-xl font-semibold text-blood-dark">Donors</p>
                <p className="mt-2 text-sm text-medical-gray">Maintain profile, location, organ preferences, and response readiness.</p>
              </div>
              <div className="interactive-card">
                <p className="font-display text-xl font-semibold text-blood-dark">Patients</p>
                <p className="mt-2 text-sm text-medical-gray">Create blood requests, pin the location, and track request progress live.</p>
              </div>
              <div className="interactive-card">
                <p className="font-display text-xl font-semibold text-blood-dark">Hospitals</p>
                <p className="mt-2 text-sm text-medical-gray">Verify operations, create organ requests, review donor matches, and confirm outcomes.</p>
              </div>
              <div className="interactive-card">
                <p className="font-display text-xl font-semibold text-blood-dark">Admin</p>
                <p className="mt-2 text-sm text-medical-gray">Approve hospitals, monitor fraud flags, and keep the trust layer strong.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="hidden max-w-4xl mx-auto px-4 py-16 text-center" aria-hidden="true">
      <h1 className="text-4xl md:text-5xl font-bold text-blood-dark mb-4">
        One Donation, <span className="text-blood-red">Three Lives</span>
      </h1>
      <p className="text-xl text-medical-gray mb-8 max-w-2xl mx-auto">
        Connect donors, patients, and hospitals through a secure platform. 
        Register as a donor, request help as a patient, or join as a verified hospital. Admin access is created separately from the CLI.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link to="/register" className="btn-primary text-lg px-8 py-3">Register</Link>
        <Link to="/login" className="btn-secondary text-lg px-8 py-3">Login</Link>
        <a href="#how" className="btn-secondary text-lg px-8 py-3">How it works</a>
      </div>
      <section id="legacy-how" className="mt-24 text-left max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-blood-dark mb-6">How it works</h2>
        <ul className="space-y-4 text-medical-gray">
          <li><strong className="text-blood-red">Donors</strong> — Complete your profile, set availability, and respond to matching requests.</li>
          <li><strong className="text-blood-red">Patients</strong> — Create a request (blood or organ), choose a hospital, and track status.</li>
          <li><strong className="text-blood-red">Hospitals</strong> — Register, get verified by admin, then create requests and confirm donations.</li>
          <li><strong className="text-blood-red">Smart matching</strong> — Our system finds the best donors by urgency, distance, and reliability.</li>
        </ul>
      </section>
      </div>
    </>
  );
}
