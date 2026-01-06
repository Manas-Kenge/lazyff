"use client"

import Link from "next/link"
import { useState } from "react"

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.5 4.5V3.5C5.5 2.94772 5.94772 2.5 6.5 2.5H12.5C13.0523 2.5 13.5 2.94772 13.5 3.5V9.5C13.5 10.0523 13.0523 10.5 12.5 10.5H11.5M4.5 5.5H10.5C11.0523 5.5 11.5 5.94772 11.5 6.5V12.5C11.5 13.0523 11.0523 13.5 10.5 13.5H4.5C3.94772 13.5 3.5 13.0523 3.5 12.5V6.5C3.5 5.94772 3.94772 5.5 4.5 5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.5 4.5L6.5 11.5L3 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.5 12L17 12M13 16.5L17.5 12L13 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  )
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.06145 23.1079C5.26816 22.3769 -3.39077 20.6274 1.4173 5.06384C9.6344 6.09939 16.9728 14.0644 9.06145 23.1079Z"
        fill="url(#paint0_linear)"
      />
      <path
        d="M8.91928 23.0939C5.27642 21.2223 0.78371 4.20891 17.0071 0C20.7569 7.19341 19.6212 16.5452 8.91928 23.0939Z"
        fill="url(#paint1_linear)"
      />
      <path
        d="M8.91388 23.0788C8.73534 19.8817 10.1585 9.08525 23.5699 13.1107C23.1812 20.1229 18.984 26.4182 8.91388 23.0788Z"
        fill="url(#paint2_linear)"
      />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1="3.77557"
          y1="5.91571"
          x2="5.23185"
          y2="21.5589"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#18E299" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
        <linearGradient
          id="paint1_linear"
          x1="12.1711"
          y1="-0.718425"
          x2="10.1897"
          y2="22.9832"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#16A34A" />
          <stop offset="1" stopColor="#4ADE80" />
        </linearGradient>
        <linearGradient
          id="paint2_linear"
          x1="23.1327"
          y1="15.353"
          x2="9.33841"
          y2="18.5196"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0D9373" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2H21.5l-7.26 8.29L22.5 22h-6.19l-4.85-6.18L5.89 22H2.63l7.76-8.86L2 2h6.31l4.39 5.64L18.244 2Zm-1.09 17.18h1.8L7.94 4.7H6.02l11.134 14.48Z" />
    </svg>
  )
}

const features = [
  {
    title: "100% Local",
    description:
      "Your files never leave your machine. Process sensitive videos without uploading anywhere.",
  },
  {
    title: "Free Forever",
    description:
      "No subscriptions, no usage limits, no hidden fees. Process as many videos as you want.",
  },
  {
    title: "Zero Ads",
    description:
      "Clean, distraction-free experience. No popups, no banners, no cookie consent dialogs.",
  },
  {
    title: "No File Limits",
    description:
      "Process gigabytes without waiting. No 100MB caps, no queue times, no premium tiers.",
  },
  {
    title: "Lightning Fast",
    description: "Skip the upload and download. Processing starts instantly on your local machine.",
  },
  {
    title: "Private by Default",
    description: "No accounts, no tracking, no data collection. Your media stays yours.",
  },
]

const commands = [
  {
    task: "Convert to MP4",
    ffmpeg: "ffmpeg -i input.mov -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4",
    lazyff: "lazyff convert input.mov output.mp4",
  },
  {
    task: "Compress to 25MB",
    ffmpeg:
      "ffmpeg -i input.mp4 -c:v libx264 -b:v 1.5M -maxrate 2M -bufsize 3M -c:a aac output.mp4",
    lazyff: "lazyff compress input.mp4 -s 25MB",
  },
  {
    task: "Trim 30s clip",
    ffmpeg: "ffmpeg -ss 00:01:00 -i input.mp4 -t 30 -c:v libx264 -c:a aac output.mp4",
    lazyff: "lazyff trim input.mp4 -s 1:00 -d 30",
  },
  {
    task: "Create GIF",
    ffmpeg: 'ffmpeg -ss 5 -t 3 -i input.mp4 -vf "fps=15,scale=480:-1" -loop 0 output.gif',
    lazyff: "lazyff gif input.mp4 -s 5 -d 3",
  },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState("curl")
  const [copied, setCopied] = useState(false)

  const installCommands = {
    curl: "curl -fsSL https://raw.githubusercontent.com/Manas-Kenge/lazyff/main/install.sh | bash",
    bun: "bun install -g lazyff",
    npm: "npm install -g lazyff",
    pnpm: "pnpm add -g lazyff",
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommands[activeTab as keyof typeof installCommands])
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="dark min-h-screen bg-background relative">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(22, 163, 74, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(22, 163, 74, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-5xl border-b border-x border-border/100">
            <div className="flex h-16 items-center justify-between px-6">
              <Link href="/" className="flex items-center gap-2.5">
                <Logo />
                <span className="text-xl font-bold tracking-tight text-white">LAZYFF</span>
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/docs"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Docs
                </Link>
                <Link
                  href="https://github.com/Manas-Kenge/lazyff"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubIcon />
                </Link>
                <Link
                  href="https://x.com/manas_kng"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <TwitterIcon />
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="mx-auto w-full max-w-5xl border-x border-border/100">
          <div className="border-b border-border/100 px-6 py-16 md:py-20">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl text-white">
                FFmpeg, without the headache
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Stop Googling ffmpeg commands. Convert, compress, trim, and merge videos with simple
                commands that just work. 100% local, free forever.
              </p>
            </div>
          </div>

          {/* Installation */}
          <div className="border-b border-border/100 px-6 py-10">
            <div className="flex gap-1 border-b border-border/100 mb-4">
              {Object.keys(installCommands).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-emerald-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <button
                onClick={handleCopy}
                className="group flex w-full items-center justify-between font-mono text-sm transition-colors hover:text-emerald-500"
              >
                <span className="text-muted-foreground group-hover:text-emerald-500 break-all text-left">
                  {installCommands[activeTab as keyof typeof installCommands]}
                </span>
                <span className="ml-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-emerald-500">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </span>
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Requires{" "}
              <Link
                href="https://ffmpeg.org/download.html"
                className="text-emerald-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ffmpeg
              </Link>{" "}
              to be installed on your system.
            </p>
          </div>
        </section>

        {/* Demo placeholder */}
        <section className="mx-auto w-full max-w-5xl border-x border-border/100">
          <div className="border-b border-border/100 px-6 py-10">
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 aspect-video flex items-center justify-center overflow-hidden">
              <video className="w-full h-full object-cover" muted loop autoPlay playsInline>
                <source src="/demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </section>

        {/* Why lazyff */}
        <section className="mx-auto w-full max-w-5xl border-x border-border/100">
          <div className="border-b border-border/100 px-6 pt-12 pb-6">
            <h2 className="text-2xl font-bold md:text-3xl text-white">Why lazyff?</h2>
            <p className="mt-3 text-muted-foreground">
              Unlike online converters that want your data, lazyff runs entirely on your machine.
            </p>
          </div>

          <div className="border-b border-border/100 px-6 py-8">
            <ul className="space-y-5 text-left">
              {features.map((feature) => (
                <li key={feature.title} className="flex gap-3 justify-start">
                  <span className="font-mono text-emerald-500">[*]</span>
                  <div className="text-left">
                    <strong className="font-medium text-white">{feature.title}</strong>{" "}
                    <span className="text-muted-foreground">{feature.description}</span>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/docs"
              className="inline-flex items-center gap-1 mt-8 text-sm text-muted-foreground hover:text-emerald-500 transition-colors"
            >
              <span>Read docs</span>
              <ArrowIcon />
            </Link>
          </div>
        </section>

        {/* FFmpeg vs lazyff comparison */}
        <section className="mx-auto w-full max-w-5xl border-x border-border/100">
          <div className="border-b border-border/100 px-6 pt-12 pb-6">
            <h2 className="text-2xl font-bold md:text-3xl text-white">
              Simple commands, powerful results
            </h2>
            <p className="mt-3 text-muted-foreground">
              Forget cryptic flags. Do more with less typing.
            </p>
          </div>

          <div className="border-b border-border/100 px-6 py-8">
            <div className="space-y-4">
              {commands.map((cmd) => (
                <div
                  key={cmd.task}
                  className="rounded-xl border border-border/60 overflow-hidden text-white"
                >
                  <div className="bg-muted/30 px-4 py-2 border-b border-border/100">
                    <span className="text-sm font-medium">{cmd.task}</span>
                  </div>
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                        ffmpeg
                      </div>
                      <code className="text-xs font-mono text-red-400/80 break-all leading-relaxed">
                        {cmd.ffmpeg}
                      </code>
                    </div>
                    <div className="p-4 bg-emerald-500/5">
                      <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                        lazyff
                      </div>
                      <code className="text-sm font-mono text-emerald-500">{cmd.lazyff}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mx-auto w-full max-w-5xl border-x border-border/100">
          <div className="flex flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-semibold">lazyff</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="transition-colors hover:text-foreground">
                Docs
              </Link>
              <Link
                href="https://github.com/Manas-Kenge/lazyff"
                className="transition-colors hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </Link>
              <Link
                href="https://x.com/manas_kng"
                className="transition-colors hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </Link>
              <span>MIT License</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
