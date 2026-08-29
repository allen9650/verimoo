"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Code2,
  Compass,
  Headphones,
  BrainCircuit,
  Globe,
  Smartphone,
  Cloud,
  CheckCircle2,
  Quote,
  Target,
  Rocket,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Eye,
  MessageSquare,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { Badge, Card } from "@/components/ui";

export function LinkedinIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.44a1.63 1.63 0 0 0-1.63 1.63c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z" />
    </svg>
  );
}

export function GithubIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const SERVICES = [
  {
    icon: Code2,
    color: "blue",
    title: "Software Solutions",
    description:
      "Custom software development and business applications designed around specific organizational requirements using an iterative Agile development approach.",
  },
  {
    icon: Compass,
    color: "indigo",
    title: "IT Consultancy",
    description:
      "Technology consulting, system planning, digital transformation, IT strategy, and solution architecture to help organizations make effective technology decisions.",
  },
  {
    icon: Headphones,
    color: "purple",
    title: "Technical Support",
    description:
      "Reliable technical assistance, troubleshooting, system maintenance, infrastructure support, and continuous IT support.",
  },
  {
    icon: BrainCircuit,
    color: "purple",
    title: "AI Solutions",
    description:
      "Artificial intelligence, automation, intelligent systems, data-driven applications, machine learning solutions, and AI integration.",
  },
  {
    icon: Globe,
    color: "blue",
    title: "Web Solutions",
    description:
      "Professional websites, web applications, e-commerce platforms, portals, dashboards, and custom web-based systems.",
  },
  {
    icon: Smartphone,
    color: "indigo",
    title: "Mobile App Solutions",
    description:
      "Development of modern Android and iOS applications with a focus on usability, performance, scalability, and continuous improvement.",
  },
  {
    icon: Cloud,
    color: "blue",
    title: "Cloud Services",
    description:
      "Cloud deployment, migration, infrastructure, hosting, backups, scalability, security, and cloud-based applications.",
  },
];

const AGILE_CYCLE = [
  { step: "01", name: "Discover", desc: "Understand requirements & scope" },
  { step: "02", name: "Plan", desc: "Sprint backlog & roadmap" },
  { step: "03", name: "Design", desc: "Architecture & user experience" },
  { step: "04", name: "Develop", desc: "Iterative clean-code building" },
  { step: "05", name: "Test", desc: "Automated & quality testing" },
  { step: "06", name: "Review", desc: "Stakeholder demo & feedback" },
  { step: "07", name: "Improve", desc: "Refinement & enhancement" },
  { step: "08", name: "Deploy", desc: "Continuous release & launch" },
  { step: "09", name: "Support", desc: "Ongoing maintenance & growth" },
];

const AGILE_PILLARS = [
  {
    icon: MessageSquare,
    title: "Client Collaboration",
    desc: "Working closely with clients and stakeholders throughout the project lifecycle.",
  },
  {
    icon: Repeat,
    title: "Iterative Development",
    desc: "Building and improving solutions through manageable development cycles.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Feedback",
    desc: "Regularly reviewing progress and incorporating user feedback.",
  },
  {
    icon: TrendingUp,
    title: "Adaptability",
    desc: "Responding effectively to changing requirements and emerging challenges.",
  },
  {
    icon: CheckCircle2,
    title: "Continuous Improvement",
    desc: "Reviewing our processes and solutions to improve quality and efficiency.",
  },
  {
    icon: Rocket,
    title: "Frequent Delivery",
    desc: "Delivering usable features progressively rather than waiting until completion.",
  },
  {
    icon: Eye,
    title: "Transparency",
    desc: "Maintaining clear communication about project progress, priorities, and deliverables.",
  },
];

export function WhoWeAreSection() {
  return (
    <section id="about" className="relative py-16 sm:py-24 border-t border-[#E2E8F0] dark:border-[#27272a] bg-white/50 dark:bg-black/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-16">
        {/* Creator Quote Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-6 sm:p-8 dark:border-[#27272a] dark:bg-[#0e0e12]"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white shadow-md">
                <Quote size={22} className="rotate-180" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color="purple" dot>
                    Engineering & Design Lead
                  </Badge>
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
                    Created by Ahsan
                  </span>
                </div>
                <p className="mt-2 text-sm sm:text-base font-medium text-[#111827] dark:text-[#F8FAFC] leading-relaxed italic">
                  &ldquo;Building next-generation digital trust, certificate verification systems, and scalable Agile technology solutions.&rdquo;
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#2563EB] dark:text-[#3B82F6]">
                    — Ahsan & My Team
                  </span>
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    · Software Engineer & Technology Team
                  </span>
                </div>
              </div>
            </div>

            {/* Social Profile Links */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-center justify-start md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-indigo-100 dark:border-[#27272a]">
              <a
                href="https://www.linkedin.com/in/ahsan-raza8hbb/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs font-semibold !py-2 !px-3.5 flex items-center gap-2 shadow-xs"
              >
                <LinkedinIcon size={15} />
                <span>LinkedIn Profile</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>

              <a
                href="https://github.com/allen9650/verimoo"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-xs font-semibold !py-2 !px-3.5 flex items-center gap-2 shadow-xs"
              >
                <GithubIcon size={15} />
                <span>GitHub Repo</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-[#2563EB] dark:border-blue-900/50 dark:bg-[#18181c] dark:text-[#3B82F6]">
            <Sparkles size={13} />
            <span>Who We Are</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Ahsan & My Team
          </h2>

          <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            <strong>Ahsan & My Team</strong> operate with an <strong>Agile-based technology mindset</strong> providing innovative, reliable, secure, and scalable digital services to businesses and organizations.
          </p>

          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            We help businesses transform ideas into practical technology solutions through an <strong>iterative, collaborative, and customer-focused approach</strong>. By applying Agile principles, we continuously communicate with clients, deliver solutions in manageable increments, gather feedback, and adapt to changing business and technology requirements.
          </p>
        </div>

        {/* Services Grid */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E2E8F0] pb-3 dark:border-[#27272a]">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                Our Services
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                End-to-end expertise spanning modern software engineering and digital transformation.
              </p>
            </div>
            <Badge color="blue">7 Core Disciplines</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <Card
                  key={srv.title}
                  hover
                  className={`p-5 transition-all flex flex-col justify-between ${
                    idx === SERVICES.length - 1 ? "md:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <div>
                    <div
                      className={`h-10 w-10 flex items-center justify-center rounded-xl mb-3.5 shadow-xs ${
                        srv.color === "purple"
                          ? "bg-purple-100 text-[#7C3AED] dark:bg-purple-950/60 dark:text-[#8B5CF6]"
                          : srv.color === "indigo"
                          ? "bg-indigo-100 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-indigo-400"
                          : "bg-blue-100 text-[#2563EB] dark:bg-blue-950/60 dark:text-[#3B82F6]"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <h4 className="font-bold text-sm sm:text-base text-[#111827] dark:text-[#F8FAFC]">
                      {srv.title}
                    </h4>
                    <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Agile Project Cycle */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-slate-50/80 p-6 sm:p-8 dark:border-[#27272a] dark:bg-[#0e0e12] space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge color="indigo">Continuous Refinement</Badge>
            <h3 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              Our Agile Project Cycle
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              This cycle allows us to continuously refine solutions based on real-world requirements and feedback.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {AGILE_CYCLE.map((cycle, idx) => (
              <div
                key={cycle.name}
                className="relative rounded-xl border border-[#E2E8F0] bg-white p-3 text-center dark:border-[#27272a] dark:bg-black/60 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#2563EB] dark:text-[#3B82F6] block">
                    {cycle.step}
                  </span>
                  <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] block mt-0.5">
                    {cycle.name}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-tight">
                  {cycle.desc}
                </p>
                {idx < AGILE_CYCLE.length - 1 && (
                  <ArrowRight
                    size={12}
                    className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[#4F46E5] dark:text-indigo-400"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Agile Approach Pillars */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge color="purple">Core Operating Principles</Badge>
            <h3 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
              Our Agile Mindset
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              We follow an Agile mindset to ensure that technology projects remain flexible, transparent, and aligned with business and user needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {AGILE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 dark:border-[#27272a] dark:bg-[#0e0e12] shadow-xs flex items-start gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
                      {pillar.title}
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vision & Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vision Card */}
          <Card className="p-6 sm:p-7 border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/40 via-white to-transparent dark:from-blue-950/20 dark:via-[#0e0e12] dark:to-transparent">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#2563EB] dark:bg-blue-950/70 dark:text-[#3B82F6] shadow-xs">
                <Target size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#3B82F6]">
                  Strategic Direction
                </span>
                <h3 className="text-lg font-extrabold text-[#111827] dark:text-[#F8FAFC]">
                  Our Vision
                </h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              To become a trusted <strong>Agile technology partner</strong> that helps businesses and organizations transform their ideas into secure, innovative, and scalable digital solutions.
            </p>
          </Card>

          {/* Mission Card */}
          <Card className="p-6 sm:p-7 border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/40 via-white to-transparent dark:from-purple-950/20 dark:via-[#0e0e12] dark:to-transparent">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#7C3AED] dark:bg-purple-950/70 dark:text-[#8B5CF6] shadow-xs">
                <Rocket size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] dark:text-[#8B5CF6]">
                  Our Commitment
                </span>
                <h3 className="text-lg font-extrabold text-[#111827] dark:text-[#F8FAFC]">
                  Our Mission
                </h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              To deliver high-quality technology solutions through <strong>Agile, customer-focused, and continuously improving processes</strong>, combining innovation, reliability, security, and practical business value while providing continuous support throughout the technology lifecycle.
            </p>
          </Card>
        </div>

        {/* What We Do Banner */}
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] p-6 sm:p-10 text-center text-white shadow-xl">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-xs inline-block">
              What We Do
            </span>

            <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight filter drop-shadow-xs">
              Consult. Build. Integrate. Test. Improve. Support. Innovate.
            </h3>

            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl mx-auto">
              From an initial idea to a complete digital platform, <strong>Ahsan & My Team</strong> provide the technology expertise needed to <strong>design, develop, deploy, and continuously improve</strong> modern IT solutions.
            </p>

            <div className="pt-2 border-t border-white/20 mt-4">
              <p className="text-xs sm:text-sm font-semibold italic text-white/95">
                &ldquo;We believe successful technology is not simply delivered once — it evolves with the business.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
