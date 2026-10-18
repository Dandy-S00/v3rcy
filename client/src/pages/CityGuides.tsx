import { ArrowRight, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";

const guides = [
  {
    city: "Austin",
    slug: "austin",
    title: "After-hours Austin",
    copy: "A guide to starting with a good plan, a clear profile, and the freedom to choose an evening that feels like your own.",
    moments: [
      "Lead with shared interests, not assumptions.",
      "Keep first plans public and comfortably paced.",
      "Let the conversation carry the next step.",
    ],
  },
  {
    city: "New York",
    slug: "new-york",
    title: "A more deliberate New York",
    copy: "The city moves quickly; thoughtful introductions do not have to. Use a precise city-level profile and make the first message count.",
    moments: [
      "Make the invitation specific and simple.",
      "Choose a time that leaves room to change course.",
      "Keep personal details personal until trust is earned.",
    ],
  },
];

export default function CityGuides() {
  const [, go] = useLocation();
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main>
        <section className="border-b border-white/8 bg-[#0c1326]">
          <div className="container py-16 sm:py-20">
            <p className="eyebrow">Local editorial</p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">
              Guides for making a little more of your city.
            </h1>
            <p className="mt-5 max-w-xl leading-7 text-slate-400">
              Original notes for adult members who prefer clear invitations,
              privacy-minded profiles, and a better pace.
            </p>
          </div>
        </section>
        <section className="container grid gap-5 py-14 md:grid-cols-2">
          {guides.map(guide => (
            <article
              key={guide.slug}
              className="rounded-[1.5rem] border border-white/10 bg-white/[.035] p-7"
            >
              <span className="inline-flex items-center gap-2 text-sm text-[#e1c687]">
                <MapPin className="h-4 w-4" />
                {guide.city}
              </span>
              <h2 className="mt-6 font-serif text-3xl">{guide.title}</h2>
              <p className="mt-4 leading-7 text-slate-400">{guide.copy}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {guide.moments.map(moment => (
                  <li
                    key={moment}
                    className="border-l border-[#e1c687]/45 pl-3"
                  >
                    {moment}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => go(`/browse`)}
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#e1c687]"
              >
                Explore nearby listings <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
