"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import {
  Terminal as TerminalIcon,
  Shield,
  Zap,
  CircleDollarSign,
  Ghost,
  Command,
  Github,
  Twitter,
  Copy,
  Check,
  Monitor,
} from "lucide-react"

// --- Components ---

function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="lazyff logo"
      width={150}
      height={150}
      priority
    />
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-emerald-500/80 ring-1 ring-inset ring-emerald-500/20">
      {children}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-mono font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white group"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 transition-transform group-hover:scale-110" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  )
}

// --- Data ---

const features = [
  {
    title: "100% Local",
    description: "Your files never leave your machine. Process sensitive videos securely.",
    icon: Shield,
  },
  {
    title: "Zero Friction",
    description: "No accounts, no ads, no subscriptions. Just install and run.",
    icon: Ghost,
  },
  {
    title: "Infinite Scale",
    description: "No 100MB caps or queue times. Process gigabytes in seconds.",
    icon: Zap,
  },
  {
    title: "Free Forever",
    description: "Open source and community driven. No hidden premium tiers.",
    icon: CircleDollarSign,
  },
]

const commands = [
  {
    task: "Convert to MP4",
    ffmpeg: "ffmpeg -i in.mov -c:v libx264 -crf 23 -c:a aac -b:a 128k out.mp4",
    lazyff: "lazyff convert in.mov out.mp4",
  },
  {
    task: "Compress to 25MB",
    ffmpeg: "ffmpeg -i in.mp4 -c:v libx264 -b:v 1.5M -maxrate 2M -bufsize 3M out.mp4",
    lazyff: "lazyff compress in.mp4 -s 25MB",
  },
  {
    task: "Trim 30s Clip",
    ffmpeg: "ffmpeg -ss 00:01:00 -i in.mp4 -t 30 -c:v copy out.mp4",
    lazyff: "lazyff trim in.mp4 -s 1:00 -d 30",
  },
  {
    task: "Create GIF",
    ffmpeg: 'ffmpeg -i in.mp4 -vf "fps=15,scale=480:-1" -loop 0 out.gif',
    lazyff: "lazyff gif in.mp4 --scale 480",
  },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState("curl")
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const installCommands = {
    curl: "curl -fsSL https://lazyff.sh/install.sh | bash",
    bun: "bun install -g lazyff",
    npm: "npm install -g lazyff",
    pnpm: "pnpm add -g lazyff",
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30 font-sans">
      {/* --- Background Effects --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[10%] left-[15%] w-[60%] h-[50%] rounded-full opacity-[0.1] blur-[120px]"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "radial-gradient(circle, #059669 0%, transparent 70%)" }}
        />
      </div>

      {/* --- Vertical Framing Gutters --- */}
      <div className="fixed inset-y-0 left-1/2 -translate-x-[calc(50%+445px)] w-[1px] bg-white/20 z-20 hidden xl:block" />
      <div
        className="fixed inset-y-0 left-1/2 -translate-x-[calc(50%+480px)] w-[60px] pointer-events-none z-10 hidden xl:block opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 1px, transparent 1px, transparent 10px)`,
        }}
      />

      <div className="fixed inset-y-0 left-1/2 translate-x-[calc(50%+445px)] w-[1px] bg-white/20 z-20 hidden xl:block" />
      <div
        className="fixed inset-y-0 left-1/2 translate-x-[calc(50%+420px)] w-[60px] pointer-events-none z-10 hidden xl:block opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 1px, transparent 1px, transparent 10px)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* --- Central Framed Stage --- */}
        <div className="w-full max-w-4xl relative flex flex-col items-center px-6">
          {/* Navigation */}
          <nav className="w-full py-8 flex justify-between items-center border-b border-white/5">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/docs"
                className="text-xs font-mono font-medium text-white/40 transition-colors hover:text-white"
              >
                DOCS
              </Link>
              <div className="h-4 w-px bg-white/10" />
              <Link
                href="https://github.com/Manas-Kenge/lazyff"
                target="_blank"
                className="text-white/30 hover:text-white transition-colors"
              >
                <Github size={16} />
              </Link>
              <Link
                href="https://x.com/manas_kng"
                target="_blank"
                className="text-white/30 hover:text-white transition-colors"
              >
                <Twitter size={16} />
              </Link>
            </div>
          </nav>

          {/* Hero Section */}
          <main className="w-full max-w-4xl py-24 flex flex-col items-center text-center">
            <h1 className="mt-8 text-4xl md:text-7xl font-semibold tracking-tight leading-[1.1] text-white/90">
              FFmpeg, without <br /> the <span className="text-emerald-500/80">headache.</span>
            </h1>
            <p className="mt-8 text-base md:text-lg text-white/40 max-w-2xl leading-relaxed font-medium">
              Stop memorizing flags. Convert, compress, and trim media with simple, human-readable
              commands. 100% local, blazing fast.
            </p>

            {/* Install Widget */}
            <div className="mt-14 w-full max-w-xl">
              <div className="flex p-1 gap-1 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                {Object.keys(installCommands).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all ${
                      activeTab === tab
                        ? "bg-white/5 text-white shadow-sm ring-1 ring-white/10"
                        : "text-white/20 hover:text-white/40"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 group relative">
                <div className="absolute -inset-px bg-emerald-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative flex items-center justify-between gap-4 rounded-xl bg-[#080808] border border-white/10 p-4 font-mono text-sm shadow-2xl">
                  <span className="text-emerald-500/60 shrink-0 select-none">$</span>
                  <span className="flex-1 text-left overflow-x-auto whitespace-nowrap scrollbar-hide text-white/70">
                    {installCommands[activeTab as keyof typeof installCommands]}
                  </span>
                  <CopyButton text={installCommands[activeTab as keyof typeof installCommands]} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-center gap-3 text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.2em]">
                <span>DEPENDENCY:</span>
                <Link
                  href="https://ffmpeg.org"
                  className="text-white/40 hover:text-emerald-500/60 transition-colors border-b border-white/10 pb-0.5"
                >
                  FFMPEG
                </Link>
              </div>
            </div>
          </main>

          {/* Demo Section */}
          <section className="w-full max-w-5xl pb-24">
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-2 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative aspect-video rounded-xl border border-white/5 bg-black overflow-hidden flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-white/10 group-hover:text-white/20 transition-colors">
                  <Monitor size={48} strokeWidth={1} />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest">
                    Demo Player Placeholder
                  </span>
                </div>
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                >
                  <source src="/demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </section>

          {/* Comparison Section */}
          <section className="w-full max-w-6xl py-24 border-y border-white/5 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-emerald-500/20 to-transparent" />

            <div className="text-center mb-16">
              <Badge>Comparison</Badge>
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
                Expressive Commands
              </h2>
              <p className="mt-4 text-white/30 font-medium">
                Why memorize flags when you can use plain English?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {commands.map((cmd, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl bg-white/[0.01] border border-white/5 overflow-hidden transition-all hover:bg-white/[0.02] hover:border-white/10"
                >
                  <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-b border-white/5">
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white/20">
                      {cmd.task}
                    </span>
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/5" />
                      <div className="h-1.5 w-1.5 rounded-full bg-white/5" />
                    </div>
                  </div>
                  <div className="p-6 space-y-6 font-mono text-[13px]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-white/10">
                        <Command size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">
                          FFmpeg
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-red-500/[0.01] border border-red-500/5 text-white/30 break-all leading-relaxed italic">
                        {cmd.ffmpeg}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-500/60">
                        <TerminalIcon size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">
                          lazyff
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 text-emerald-500/80 group-hover:border-emerald-500/20 transition-colors">
                        {cmd.lazyff}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Features Section */}
          <section className="w-full max-w-6xl py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12">
              {features.map((feature, i) => (
                <div key={i} className="flex flex-col gap-5 group">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-emerald-500/60 group-hover:border-emerald-500/20 group-hover:bg-emerald-500/5 transition-all duration-500">
                    <feature.icon size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-white/80 font-mono uppercase">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm text-white/30 leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="w-full max-w-5xl py-24 text-center relative overflow-hidden border-t border-white/5">
            <div className="relative">
              <Badge>Get Started</Badge>
              <h2 className="mt-8 text-3xl md:text-5xl font-semibold tracking-tight">
                Ready to <span className="text-emerald-500/80 italic font-mono">simplify?</span>
              </h2>
              <p className="mt-6 text-white/30 font-medium max-w-xl mx-auto text-sm">
                Join developers simplifying their media workflows. <br />
                Open source, free, and local.
              </p>

              <div className="mt-12 flex flex-wrap justify-center gap-5">
                <Link
                  href="/docs"
                  className="px-10 py-3 rounded-lg border border-white text-white font-mono font-bold text-[11px] uppercase tracking-widest transition-all hover:bg-white hover:text-black"
                >
                  Installation
                </Link>
                <Link
                  href="https://github.com/Manas-Kenge/lazyff"
                  target="_blank"
                  className="px-10 py-3 rounded-lg bg-white/[0.03] border border-white/10 font-mono font-bold text-[11px] uppercase tracking-widest transition-all hover:bg-white/10 flex items-center gap-3"
                >
                  <Github size={14} />
                  GitHub
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="w-full py-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex flex-col md:items-start items-center gap-4">
              <div className="flex items-center gap-3">
                <Logo />
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-6">
              <div className="flex gap-10 text-[10px] font-mono font-bold uppercase tracking-widest text-white/20">
                <Link href="/docs" className="hover:text-white transition-colors">
                  DOCS
                </Link>
                <Link
                  href="https://github.com/Manas-Kenge/lazyff"
                  className="hover:text-white transition-colors"
                >
                  GITHUB
                </Link>
                <Link href="https://x.com/manas_kng" className="hover:text-white transition-colors">
                  TWITTER
                </Link>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-mono font-bold text-white/10 uppercase tracking-widest">
                <span>MIT LICENSE</span>
                <div className="h-1 w-1 rounded-full bg-white/5" />
                <span>&copy; 2026 LAZYFF</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
