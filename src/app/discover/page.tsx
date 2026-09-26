"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, Minus } from "lucide-react"

const results = [
  { title: "Bandra by twilight", place: "Bandra West", duration: "2h 40m", detail: "A sea-facing pause with one beautiful meal and no backtracking.", fit: "Fits your window" },
  { title: "Old city, slow streets", place: "Fort & Kala Ghoda", duration: "3h 15m", detail: "A compact art-and-coffee route that keeps every turn close.", fit: "Fits your window" },
  { title: "The green escape", place: "Powai", duration: "4h 05m", detail: "Shade, stillness, and a late lunch before the city gets loud.", fit: "Fits your window" },
]

export default function DiscoverPage() {
  const [expanded, setExpanded] = useState<number | null>(null)
  return <main className="discover-page"><header className="discover-nav"><Link href="/" className="back-link"><ArrowLeft size={15} /> TRAVEL BUDDY</Link><span className="discover-code">DISCOVERY / 01</span><span className="discover-time">SAT 17 AUG · 14:20</span></header><section className="discover-intro"><p className="eyebrow"><span className="eyebrow-mark" /> YOUR SHORTLIST</p><h1>Places that<br /><i>fit today.</i></h1><p className="discover-copy">Three routes shaped around two hours and forty minutes, close to Bandra West.</p></section><section className="results" aria-label="Travel recommendations">{results.map((result, i) => <article className="result-card" key={result.title}><div className="result-number">0{i + 1}</div><div className="result-main"><div className="result-meta"><span><MapPin size={13} /> {result.place}</span><span><Clock3 size={13} /> {result.duration}</span></div><h2>{result.title}</h2><div className={`result-detail ${expanded === i ? "expanded" : ""}`}><div><p>{result.detail}</p><p className="why-fit"><Check size={14} /> No transit changes · one clear exit</p></div></div><button className="see-why" onClick={() => setExpanded(expanded === i ? null : i)}>{expanded === i ? "HIDE WHY" : "SEE WHY"} <ArrowRight size={14} /></button></div><div className="result-status"><span className="status-dot"><Check size={11} /></span>{result.fit}</div></article>)}</section><Link href="/" className="discover-footer"><Minus size={15} /> RETURN TO THE GATE</Link></main>
}
