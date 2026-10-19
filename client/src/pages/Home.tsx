import {
  ArrowRight,
  EyeOff,
  MapPin,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";

const moments = [
  {
    icon: EyeOff,
    title: "Lead with what feels like you",
    copy: "A chosen name, a short introduction, and only the details you want to share.",
  },
  {
    icon: MapPin,
    title: "Stay close to your city",
    copy: "Browse local possibilities without turning your presence into a precise map pin.",
  },
  {
    icon: MessagesSquare,
    title: "Let the conversation unfold",
    copy: "Connect when there is something worth saying — no pressure to rush the moment.",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080d1d] text-white">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-white/8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(209,170,89,.18),transparent_28rem),radial-gradient(circle_at_10%_85%,rgba(47,96,157,.2),transparent_28rem)]" />
          <div className="container relative grid min-h-[660px] items-center gap-10 py-14 lg:grid-cols-[.85fr_1.15fr] lg:py-20">
            <div className="max-w-xl">
              <p className="eyebrow">After dark, on your terms</p>
              <h1 className="mt-5 font-serif text-4xl leading-[1.02] tracking-[-.035em] sm:text-5xl lg:text-6xl">
                A more interesting way to meet{" "}
                <span className="text-[#e1c687]">nearby.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
                v3rya brings adult listings, local energy, and unhurried
                conversation into one refined place.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    isAuthenticated ? setLocation("/post") : startLogin()
                  }
                  className="h-12 rounded-xl bg-[#e1c687] px-6 font-semibold text-[#10172c] hover:bg-[#f0da9f]"
                >
                  {isAuthenticated ? "Create a listing" : "Enter v3rya"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setLocation("/browse")}
                  variant="outline"
                  className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-slate-100 hover:bg-white/10 hover:text-white"
                >
                  Explore listings
                </Button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-2xl lg:justify-self-end">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-[#d8ae59]/10 blur-3xl" />
              <div className="relative grid gap-4 sm:grid-cols-[1.25fr_.75fr]">
                <figure className="relative min-h-[410px] overflow-hidden rounded-[2rem] border border-white/12 shadow-[0_30px_80px_rgba(0,0,0,.32)]">
                  <div
                    role="img"
                    aria-label="Two adults sharing an intimate but non-explicit moment in an elegant evening lounge"
                    data-v3rya-locked-editorial="hero"
                    className="v3rya-editorial-media v3rya-editorial-hero absolute inset-0"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050812]/90 via-[#050812]/28 to-transparent p-7">
                    <p className="text-xs font-medium tracking-[.16em] text-[#e1c687] uppercase">
                      A different kind of evening
                    </p>
                    <p className="mt-2 max-w-sm font-serif text-2xl leading-tight">
                      Start with a glance. Stay for the possibility.
                    </p>
                  </div>
                </figure>
                <figure className="relative min-h-[410px] overflow-hidden rounded-[2rem] border border-white/12 shadow-[0_30px_80px_rgba(0,0,0,.24)]">
                  <div
                    role="img"
                    aria-label="Adult in a sophisticated evening setting"
                    data-v3rya-locked-editorial="portrait"
                    className="v3rya-editorial-media v3rya-editorial-portrait absolute inset-0"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050812]/90 via-transparent to-transparent p-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e1c687]/35 bg-[#050812]/55 text-[#e1c687]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>
                </figure>
              </div>
            </div>
          </div>
        </section>
        <section className="container py-16 sm:py-24">
          <div className="grid items-end gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Make the first move your own</p>
              <h2 className="mt-4 max-w-md font-serif text-3xl leading-tight sm:text-4xl">
                An introduction can be as simple as a good feeling.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {moments.map(({ icon: Icon, title, copy }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/9 bg-white/[.035] p-5"
                >
                  <Icon className="h-5 w-5 text-[#e1c687]" />
                  <h3 className="mt-7 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="border-y border-white/8 bg-[#0c1326]">
          <div className="container grid items-center gap-10 py-14 md:grid-cols-[.85fr_1.15fr] md:py-20">
            <div
              role="img"
              aria-label="Editorial adults-only evening lounge scene"
              data-v3rya-locked-editorial="hero"
              className="v3rya-editorial-media v3rya-editorial-hero h-[280px] overflow-hidden rounded-[1.75rem] border border-white/10 md:h-[360px]"
            />
            <div>
              <p className="eyebrow">The city is full of openings</p>
              <h2 className="mt-4 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">
                What happens next is entirely up to you.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-400">
                Explore local listings, shape a profile that matches your mood,
                or create a small invitation for the right people to find.
              </p>
              <Button
                onClick={() => setLocation("/browse")}
                variant="outline"
                className="mt-7 h-12 rounded-xl border-white/15 bg-transparent px-6 text-white hover:bg-white/5 hover:text-white"
              >
                Browse what is nearby <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="container flex flex-col gap-4 py-9 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-serif text-lg text-slate-300">v3rya</span>
        <span>
          Adult-only community · City-level profiles · Meet your moment
        </span>
      </footer>
    </div>
  );
}
