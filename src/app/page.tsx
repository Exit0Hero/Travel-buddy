"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowDownRight, ArrowRight, Check, Compass, Menu, Minus, X } from "lucide-react"

const checks = [
  ["TIME", "2h 40m available", "pass"],
  ["DISTANCE", "Under 18 min away", "pass"],
  ["PACE", "One place, no rushing", "pass"],
  ["CLOSING", "Last entry at 18:00", "fail"],
] as const

const places = [
  { number: "01", title: "Bandra by twilight", meta: "WALK · 2H 40M", copy: "A sea-facing pause, a quiet table, and enough room for the evening to unfold.", tone: "terrace" },
  { number: "02", title: "Old city, slow streets", meta: "METRO · 3H 15M", copy: "Small lanes, warm light, and a route that knows when to stop asking for more.", tone: "street" },
  { number: "03", title: "The green escape", meta: "CAB · 4H 05M", copy: "When the city gets loud, trade the map for shade and let the day breathe.", tone: "green" },
]

function StatusPill({ status, reason }: { status: "pass" | "fail"; reason?: string }) {
  return <span className={`status-pill ${status}`}><span className="status-dot">{status === "pass" ? <Check size={11} /> : <Minus size={11} />}</span>{status === "pass" ? "Fits your day" : reason}</span>
}

function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const ring = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const media = window.matchMedia("(hover: hover)")
    setEnabled(media.matches)
    if (!media.matches) return
    let frame = 0
    let target = { x: -100, y: -100 }
    let current = { ...target }
    const move = (event: PointerEvent) => { target = { x: event.clientX, y: event.clientY } }
    const tick = () => { current.x += (target.x - current.x) * .18; current.y += (target.y - current.y) * .18; if (ring.current) ring.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`; frame = requestAnimationFrame(tick) }
    const over = (event: PointerEvent) => { if ((event.target as HTMLElement).closest("[data-cursor]")) ring.current?.classList.add("cursor-hover") }
    const out = (event: PointerEvent) => { if (!(event.relatedTarget as HTMLElement | null)?.closest?.("[data-cursor]")) ring.current?.classList.remove("cursor-hover") }
    window.addEventListener("pointermove", move); window.addEventListener("pointerover", over); window.addEventListener("pointerout", out); frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); window.removeEventListener("pointerover", over); window.removeEventListener("pointerout", out) }
  }, [])
  return enabled ? <div ref={ring} className="custom-cursor" aria-hidden="true" /> : null
}

function SiteNav() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [stuck, setStuck] = useState(false)
  useEffect(() => { let last = window.scrollY; let frame = 0; const update = () => { const y = window.scrollY; setHidden(y > last && y > window.innerHeight * .8); setStuck(y > 40); last = y; frame = 0 }; const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }; window.addEventListener("scroll", onScroll, { passive: true }); return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame) } }, [])
  return <header className={`site-nav ${hidden ? "nav-hidden" : ""} ${stuck ? "stuck" : ""}`}>
    <Link href="#top" className="brand" aria-label="Travel Buddy home"><span className="brand-mark"><Compass size={16} /></span><span>TRAVEL<br /><em>BUDDY</em></span></Link>
    <nav className={open ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
      <Link href="#method" onClick={() => setOpen(false)}>THE METHOD</Link>
      <Link href="#places" onClick={() => setOpen(false)}>PLACES</Link>
      <Link href="#why" onClick={() => setOpen(false)}>WHY IT FITS</Link>
      <Link href="/discover" className="nav-cta" onClick={() => setOpen(false)}>START A TRIP <ArrowRight size={14} /></Link>
    </nav>
    <button className="menu-button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </header>
}

function Reveal({ children, className = "", delay = 0, splitWords = false }: { children: React.ReactNode; className?: string; delay?: number; splitWords?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { const node = ref.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setVisible(true); observer.disconnect() } }, { threshold: .12 }); observer.observe(node); return () => observer.disconnect() }, [])
  const content = splitWords && typeof children === "string" ? children.split(" ").map((word, index) => <span className="reveal-word" style={{ "--word-delay": `${index * 72}ms` } as React.CSSProperties} key={`${word}-${index}`}>{word}&nbsp;</span>) : children
  return <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--delay": `${delay}ms` } as React.CSSProperties}><div className="reveal-inner">{content}</div></div>
}

export default function Home() {
  return <main id="top" className="page-shell">
    <CustomCursor />
    <SiteNav />
    <div className="grain" aria-hidden="true" />
    <section className="hero chapter" aria-labelledby="hero-title">
      <div className="hero-visual" aria-hidden="true"><div className="sun"></div><div className="route-line route-a"></div><div className="route-line route-b"></div><div className="pin pin-one"></div><div className="pin pin-two"></div></div>
      <div className="hero-copy">
        <Reveal><p className="eyebrow"><span className="eyebrow-mark" /> CHAPTER 00 — THE RIGHT PACE</p></Reveal>
        <Reveal delay={80}><h1 id="hero-title">THE BEST<br /><span>TRIP IS THE</span><br />ONE THAT FITS.</h1></Reveal>
        <Reveal delay={160}><p className="hero-intro">Travel Buddy reads the shape of your day — time, energy, distance, and all — then finds somewhere worth going.</p></Reveal>
        <Reveal delay={220}><Link href="/discover" data-cursor className="circle-cta">FIND<br />YOUR<br />FIT <ArrowDownRight size={17} /></Link></Reveal>
      </div>
      <div className="hero-footer"><span>SCROLL TO EXPLORE</span><span className="line" /><span>19° 03&apos; N / 72° 50&apos; E</span></div>
      <div className="chapter-index"><span className="active">00</span><span>01</span><span>02</span><span>03</span></div>
    </section>

    {/* SCROLL-PIN ANCHOR: chapter-1 */}
    <section id="method" className="method chapter" aria-labelledby="method-title">
      <div className="section-aside"><span>01</span><span>THE METHOD</span></div>
      <div className="method-content"><Reveal><p className="eyebrow">A SMALLER WAY TO PLAN</p></Reveal><Reveal delay={70}><h2 id="method-title">Make room<br /><i>for the day.</i></h2></Reveal><Reveal delay={130}><p className="section-copy">Not a list of everything you could do. A clear answer to the only question that matters: what makes sense right now?</p></Reveal>
        <div className="signal-grid">{[["01", "Tell us your window", "The hours you really have."], ["02", "Set your edges", "Budget, group, accessibility."], ["03", "Go somewhere good", "A plan built around you."]].map(([num, title, copy], i) => <Reveal key={num} delay={180 + i * 60}><div className="signal"><span>{num}</span><div><h3>{title}</h3><p>{copy}</p></div></div></Reveal>)}</div>
      </div>
    </section>

    {/* SCROLL-PIN ANCHOR: chapter-2 */}
    <section id="why" className="gate chapter" aria-labelledby="gate-title"><div className="section-aside"><span>02</span><span>THE GATE</span></div><div className="gate-content"><div className="gate-heading"><Reveal><p className="eyebrow">BEFORE THE RECOMMENDATION</p></Reveal><Reveal delay={70}><h2 id="gate-title">If it doesn&apos;t fit,<br /><i>we say so.</i></h2></Reveal></div><div className="checks"><p className="checks-label">A PLAN FOR TODAY · SATURDAY 17 AUG</p>{checks.map(([label, value, status], i) => <Reveal key={label} delay={100 + i * 70}><div className="check-row"><span className="check-number">0{i + 1}</span><div className="check-name"><span>{label}</span><strong>{value}</strong></div><StatusPill status={status} reason={status === "fail" ? "arrives 40 min after last entry" : undefined} /></div></Reveal>)}</div></div></section>

    {/* SCROLL-PIN ANCHOR: chapter-3 */}
    <section className="rejected chapter" aria-labelledby="rejected-title"><div className="rejected-art"><div className="art-label">NOT THIS TIME</div><div className="art-circle"></div><div className="art-path"></div></div><div className="rejected-content"><p className="eyebrow">03 — WHY NOT THAT</p><h2 id="rejected-title">The honest<br /><i>no.</i></h2><div className="rejection-card"><div className="rejection-top"><span>RECOMMENDATION 04</span><span>REJECTED</span></div><h3>Kanheri Caves</h3><p>Beautiful, but the last return bus leaves before your dinner reservation. We&apos;d rather protect the part of the day you&apos;re looking forward to.</p><div className="rejection-reason"><span className="status-dot fail"><Minus size={11} /></span><span>Returns 35 minutes too late</span></div></div></div></section>

    {/* SCROLL-PIN ANCHOR: chapter-4 */}
    <section id="places" className="feed chapter" aria-labelledby="feed-title"><div className="section-aside"><span>04</span><span>THE FEED</span></div><div className="feed-content"><div className="feed-heading"><p className="eyebrow">A FEW PLACES THAT FIT</p><h2 id="feed-title">Start somewhere<br /><i>close to you.</i></h2><Link href="/discover" className="text-link">OPEN DISCOVERY <ArrowRight size={15} /></Link></div><div className="place-grid">{places.map((place, i) => <Reveal key={place.number} delay={i * 100}><article data-cursor className="place-card"><div className={`place-image ${place.tone}`}><span>{place.number}</span><div className="image-orb" /></div><div className="place-body"><div className="place-meta"><span>{place.meta}</span><StatusPill status="pass" /></div><h3>{place.title}</h3><p>{place.copy}</p><Link href="/discover" aria-label={`Explore ${place.title}`} className="card-arrow"><ArrowUpRightIcon /></Link></div></article></Reveal>)}</div></div></section>

    <footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Compass size={16} /></span><span>TRAVEL BUDDY</span></div><p>Less itinerary. More day.</p><Link href="/discover" className="footer-link">BUILD A PLAN <ArrowRight size={14} /></Link><span className="footer-code">TB / 2026</span></footer>
  </main>
}

function ArrowUpRightIcon() { return <ArrowRight size={16} /> }
