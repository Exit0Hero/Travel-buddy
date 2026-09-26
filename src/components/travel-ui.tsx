"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, Compass, Menu, Minus, ArrowRight, X, LoaderCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"

export type Status = "pass" | "fail" | "pending"

export function useMotionPreference() { return useReducedMotion() }

export function StatusPill({ status, reason }: { status: Status; reason?: string }) {
  if (status === "fail" && !reason) throw new Error("StatusPill fail requires a specific reason")
  const label = status === "pass" ? "Fits your day" : status === "pending" ? "Checking fit" : reason
  return <span className={`status-pill ${status}`}><span className="status-dot">{status === "pass" ? <Check size={11} /> : status === "fail" ? <Minus size={11} /> : <LoaderCircle size={11} />}</span>{label}</span>
}

export function Reveal({ children, className = "", delay = 0, splitWords = false, stagger = false }: { children: ReactNode; className?: string; delay?: number; splitWords?: boolean; stagger?: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (reduce) { setVisible(true); return }; const node = ref.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setVisible(true); observer.disconnect() } }, { threshold: .12 }); observer.observe(node); return () => observer.disconnect() }, [reduce])
  const transition = reduce ? { duration: 0 } : { duration: .9, delay: delay / 1000, ease: [.16, 1, .3, 1] as const }
  if (splitWords && typeof children === "string") return <motion.div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} initial={reduce ? false : { opacity: 0 }} animate={visible ? { opacity: 1 } : { opacity: 0 }} transition={transition}>{children.split(" ").map((word, i) => <motion.span className="reveal-word" key={`${word}-${i}`} initial={reduce ? false : { y: "112%", opacity: 0 }} animate={visible ? { y: 0, opacity: 1 } : { y: "112%", opacity: 0 }} transition={reduce ? { duration: 0 } : { ...transition, delay: (delay + i * 72) / 1000 }}>{word}&nbsp;</motion.span>)}</motion.div>
  return <motion.div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} initial={reduce ? false : { y: "110%", opacity: 0, filter: "blur(3px)" }} animate={visible ? { y: 0, opacity: 1, filter: "blur(0px)" } : { y: "110%", opacity: 0, filter: "blur(3px)" }} transition={transition}>{children}</motion.div>
}

export function CrossFade({ children, itemKey }: { children: ReactNode; itemKey: string }) {
  const reduce = useReducedMotion()
  return <AnimatePresence mode="wait" initial={false}><motion.div key={itemKey} initial={reduce ? false : { opacity: 0, y: 8, scale: .99, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={reduce ? undefined : { opacity: 0, y: -8, scale: .99, filter: "blur(3px)" }} transition={reduce ? { duration: 0 } : { duration: .35, ease: [.16, 1, .3, 1] }}>{children}</motion.div></AnimatePresence>
}

export function GlowCard({ children, className = "", variant = "default" }: { children: ReactNode; className?: string; variant?: "default" | "flame" }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (event: React.PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--gx", `${event.clientX - rect.left}px`); event.currentTarget.style.setProperty("--gy", `${event.clientY - rect.top}px`) }
  return <motion.div ref={ref} data-cursor className={`glow-card ${variant === "flame" ? "glow-flame" : ""} ${className}`} onPointerMove={move} whileHover={{ y: -4 }} transition={{ duration: .35 }}>{children}</motion.div>
}

export function CustomCursor() {
  const reduce = useReducedMotion(); const ring = useRef<HTMLDivElement>(null)
  useEffect(() => { const media = window.matchMedia("(hover: hover)"); if (!media.matches || reduce) return; let frame = 0; let target = { x: -100, y: -100 }; let current = { ...target }; const move = (e: PointerEvent) => { target = { x: e.clientX, y: e.clientY } }; const tick = () => { current.x += (target.x - current.x) * .18; current.y += (target.y - current.y) * .18; ring.current?.style.setProperty("transform", `translate3d(${current.x}px,${current.y}px,0)`); frame = requestAnimationFrame(tick) }; const over = (e: PointerEvent) => { if ((e.target as HTMLElement).closest("[data-cursor]")) ring.current?.classList.add("cursor-hover") }; const out = (e: PointerEvent) => { if (!(e.relatedTarget as HTMLElement | null)?.closest?.("[data-cursor]")) ring.current?.classList.remove("cursor-hover") }; window.addEventListener("pointermove", move); window.addEventListener("pointerover", over); window.addEventListener("pointerout", out); frame = requestAnimationFrame(tick); return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); window.removeEventListener("pointerover", over); window.removeEventListener("pointerout", out) } }, [reduce])
  return <div ref={ring} className="custom-cursor" aria-hidden="true" />
}

export function AmbientBackground() { return <div className="ambient" aria-hidden="true"><div className="ambient-orb orb-a" /><div className="ambient-orb orb-b" /></div> }
export function GrainOverlay() { return <div className="grain" aria-hidden="true" /> }

export function SiteNav({ marketing = false }: { marketing?: boolean }) {
  const [open, setOpen] = useState(false); const [hidden, setHidden] = useState(false); const [stuck, setStuck] = useState(false)
  useEffect(() => { let last = window.scrollY; let frame = 0; const update = () => { const y = window.scrollY; setHidden(y > last && y > window.innerHeight * .8); setStuck(y > 40); last = y; frame = 0 }; const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }; window.addEventListener("scroll", onScroll, { passive: true }); return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame) } }, [])
  return <header className={`site-nav ${hidden ? "nav-hidden" : ""} ${stuck ? "stuck" : ""}`}><Link href="/" className="brand" aria-label="Travel Buddy home"><span className="brand-mark"><Compass size={16} /></span><span>TRAVEL<br /><em>BUDDY</em></span></Link><nav className={open ? "nav-links open" : "nav-links"} aria-label="Primary navigation">{marketing && <><Link href="/#method" onClick={() => setOpen(false)}>THE METHOD</Link><Link href="/#places" onClick={() => setOpen(false)}>PLACES</Link><Link href="/#why" onClick={() => setOpen(false)}>WHY IT FITS</Link></>}<Link href="/discover" className="nav-cta" onClick={() => setOpen(false)}>START A TRIP <ArrowRight size={14} /></Link></nav><button className="menu-button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header>
}

export function AppShell({ children, marketing = false }: { children: ReactNode; marketing?: boolean }) { return <main className={`page-shell ${marketing ? "marketing-shell" : "app-shell"}`}><CustomCursor /><AmbientBackground /><GrainOverlay /><SiteNav marketing={marketing} />{children}</main> }

export function EmptyState({ reason, action }: { reason: string; action: ReactNode }) { return <div className="empty-state"><p className="eyebrow">NOT ENOUGH FIT YET</p><h2>Keep the day<br /><i>honest.</i></h2><p>{reason}</p>{action}</div> }

export function StatusList({ items }: { items: { label: string; value: string; status: Status; reason?: string }[] }) { return <div className="checks">{items.map((item, i) => <Reveal key={item.label} delay={i * 70}><div className="check-row"><span className="check-number">0{i + 1}</span><div className="check-name"><span>{item.label}</span><strong>{item.value}</strong></div><StatusPill status={item.status} reason={item.reason} /></div></Reveal>)}</div> }

export function PageFooter() { return <footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Compass size={16} /></span><span>TRAVEL BUDDY</span></div><p>Less itinerary. More day.</p><span className="footer-code">TB / 2026</span></footer> }

export { Link }
