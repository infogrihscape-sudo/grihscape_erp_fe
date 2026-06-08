import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../context/RouterContext.js';
import {
  Menu, X, ArrowRight, Phone,
  Building2, Paintbrush2, HardHat, Star,
  ArrowUp, Layers, Target, ExternalLink,
  Quote, Sparkles, LayoutGrid, Ruler, FileText,
  MessageCircle,
} from 'lucide-react';

const IMG = {
  hero1:    '/portfolio/bg4.jpg',
  hero2:    '/portfolio/bgpic.jpg',
  hero3:    '/portfolio/bg1.jpg',
  about:    '/portfolio/bg3.jpg',
  arch:     '/portfolio/Architecture.webp',
  interior: '/portfolio/interior.jpeg',
  turnkey:  '/portfolio/turnkey.jpeg',
} as const;

const NAV_LINKS = [
  { label: 'Home',            href: '#home'     },
  { label: 'About',           href: '#about'    },
  { label: 'Services',        href: '#services' },
  { label: 'Projects',        href: '#projects' },
  { label: 'Cost Estimation', href: '#cost'     },
  { label: 'Refer & Earn',    href: '#refer'    },
  { label: 'Contact',         href: '#contact'  },
];

const SERVICES = [
  {
    icon: Building2,
    title: 'Architecture Design',
    desc: 'Architecture & Interior design is the art and science of enhancing the interior and exterior of a space. We design your dream home with a modern yet timeless feel.',
    img: IMG.arch,
  },
  {
    icon: Paintbrush2,
    title: 'Interiors Design',
    desc: 'We are passionate about creating beautiful, comfortable and innovative designs that bring your creative vision to life — stunning interiors crafted by expert designers.',
    img: IMG.interior,
  },
  {
    icon: HardHat,
    title: 'Turnkey Projects',
    desc: 'Complete end-to-end project delivery. We use state-of-the-art technology to manage design, engineering, procurement and construction under one roof.',
    img: IMG.turnkey,
  },
];

const PROCESS = [
  {
    step: '01',
    icon: Target,
    title: 'Analysis',
    desc: 'The architect analyzes the project requirements and constraints, assesses the site conditions, and reviews codes and regulations.',
  },
  {
    step: '02',
    icon: Layers,
    title: 'Concept',
    desc: 'Based on the analysis, the architect develops preliminary design concepts that illustrate the overall form, function, and aesthetics.',
  },
  {
    step: '03',
    icon: Ruler,
    title: 'Schematic',
    desc: 'The architect creates more detailed design drawings that show spatial relationships, floor plans, elevations, and sections.',
  },
  {
    step: '04',
    icon: FileText,
    title: 'Project Offer',
    desc: 'Once the schematic design is approved, the architect prepares a project offer outlining the scope of work, timeline, and cost estimates.',
  },
];

const PROJECTS = [
  { img: '/portfolio/projects/vivek.jpg',     title: 'Vivek Residence',    category: 'Interior'      },
  { img: '/portfolio/projects/naim.jpg',      title: 'Naim Residence',     category: 'Architecture'  },
  { img: '/portfolio/projects/church.jpg',    title: 'Church Project',     category: 'Architecture'  },
  { img: '/portfolio/projects/hemant.jpg',    title: 'Hemant Residence',   category: 'Interior'      },
  { img: '/portfolio/projects/sumit.jpg',     title: 'Sumit Residence',    category: 'Turnkey'       },
  { img: '/portfolio/projects/faridabad.jpg', title: 'Faridabad Project',  category: 'Architecture'  },
  { img: '/portfolio/projects/jkfarm.jpg',    title: 'JK Farmhouse',       category: 'Turnkey'       },
  { img: '/portfolio/projects/hitesh.jpg',    title: 'Hitesh Residence',   category: 'Interior'      },
  { img: '/portfolio/projects/gupta.jpg',     title: 'Gupta Residence',    category: 'Interior'      },
  { img: '/portfolio/projects/ultrex.jpg',    title: 'Ultrex Commercial',  category: 'Architecture'  },
];

const PACKAGES = [
  { name: 'Basic',   price: '1,720', badge: ''        },
  { name: 'Classic', price: '1,850', badge: 'Popular' },
  { name: 'Premium', price: '2,150', badge: ''        },
  { name: 'Royale',  price: '2,350', badge: 'Best'    },
];

const TESTIMONIALS = [
  {
    name:   'Prahlad Jha',
    review: 'Very experienced team and had done work on time.',
    rating: 5,
  },
  {
    name:   'Amit Gupta',
    review: 'The team of grihscape are wonderful they have very new ideas for your home construction, interior decor and so many things.',
    rating: 5,
  },
  {
    name:   'Vaib M',
    review: 'Team is very efficient in what they do. Their ideas are very creative and they delivered way better than what I hoped for. Special mention to Gaurav for the design of my clinic and I must say the results are just fantastic! Recommended to all.. thanks !',
    rating: 5,
  },
  {
    name:   'Aditya Vashistha',
    review: 'I had my house constructed from this firm and had a great experience. Beautifully detailed works and always following the timeline with no delays. Would totally recommend them as they are very professional in their work and are very budget friendly, kudos to Grihscape. Keep up the good work guys!',
    rating: 5,
  },
];

const scrollTo = (href: string) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const WaBtn: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <a
    href="https://wa.me/917678576257"
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-2 ${className}`}
  >
    <MessageCircle size={14} />
    {label}
  </a>
);

const Stars: React.FC<{ n: number }> = ({ n }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: n }).map((_, i) => (
      <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
    ))}
  </div>
);

export const PortfolioApp: React.FC = () => {
  const { navigate } = useRouter();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const [heroIdx,       setHeroIdx]       = useState(0);
  const [showTop,       setShowTop]       = useState(false);
  const [activeFilter,  setActiveFilter]  = useState('All');

  const filters  = ['All', 'Architecture', 'Interior', 'Turnkey'];
  const filtered = activeFilter === 'All' ? PROJECTS : PROJECTS.filter(p => p.category === activeFilter);
  const heroImages = [IMG.hero1, IMG.hero2, IMG.hero3];
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setHeroIdx(i => (i + 1) % 3), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const fn = () => { setScrolled(window.scrollY > 60); setShowTop(window.scrollY > 500); };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-white font-sans overflow-x-hidden">

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0d0e11]/96 backdrop-blur-md shadow-lg shadow-black/30 border-b border-white/5' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => scrollTo('#home')} className="flex items-center gap-2.5 cursor-pointer border-0 bg-transparent">
            <img src="/logo.jpeg" alt="Grihscape" className="w-9 h-9 rounded-lg object-cover border border-amber-500/30" />
            <span className="text-[17px] font-extrabold tracking-tight">
              Grih<span className="text-amber-400">scape</span>
            </span>
          </button>

          <nav className="hidden xl:flex items-center gap-0.5">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="px-3 py-1.5 text-[12.5px] font-medium text-white/65 hover:text-white hover:bg-white/6 rounded-lg transition-all cursor-pointer border-0 bg-transparent">
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <WaBtn label="WhatsApp Us"
              className="px-3.5 py-2 rounded-lg text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all" />
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-bold text-[#0b0c0e] bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 shadow-lg shadow-amber-900/30 transition-all hover:-translate-y-px cursor-pointer border-0">
              Login <ArrowRight size={13} />
            </button>
          </div>

          <button onClick={() => setMenuOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/8 transition-colors cursor-pointer border-0 bg-transparent">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-[#0d0e11]/98 backdrop-blur-md border-b border-white/8 px-5 pb-5 pt-2">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => { scrollTo(l.href); setMenuOpen(false); }}
                className="w-full text-left px-3 py-3 text-[13px] font-medium text-white/65 hover:text-white cursor-pointer bg-transparent border-0 border-b border-white/5 last:border-b-0">
                {l.label}
              </button>
            ))}
            <div className="flex gap-2 mt-4">
              <WaBtn label="WhatsApp"
                className="flex-1 justify-center py-2.5 rounded-lg text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" />
              <button onClick={() => { navigate('/login'); setMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12.5px] font-bold text-[#0b0c0e] bg-amber-400 cursor-pointer border-0">
                Login <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
        {heroImages.map((img, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === heroIdx ? 'opacity-100' : 'opacity-0'}`}>
            <img src={img} alt="" className="w-full h-full object-cover object-center" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/65 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-transparent" />

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, i) => (
            <button key={i} onClick={() => setHeroIdx(i)}
              className={`h-2 rounded-full transition-all cursor-pointer border-0 ${i === heroIdx ? 'bg-amber-400 w-6' : 'bg-white/35 w-2'}`} />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 pt-24 pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-6">
              <Sparkles size={11} /> Architecture &amp; Interior Design
            </div>
            <h1 className="text-5xl lg:text-[68px] font-black leading-[1.05] tracking-tight mb-5">
              We Construct<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Your Dream</span>{' '}
              Home.
            </h1>
            <p className="text-white/60 text-[15px] leading-relaxed max-w-xl mb-8">
              At Grihscape, we are passionate about creating beautiful, comfortable and innovative
              designs that bring your creative vision to life. Modern yet timeless every time.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => scrollTo('#services')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold text-[#0b0c0e] bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 shadow-xl shadow-amber-900/25 transition-all hover:-translate-y-0.5 cursor-pointer border-0">
                Explore Services <ArrowRight size={14} />
              </button>
              <WaBtn label="Chat on WhatsApp"
                className="px-6 py-3 rounded-xl text-[13px] font-bold text-white bg-white/10 border border-white/15 hover:bg-white/16 transition-all" />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 lg:py-32 max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              <img src={IMG.about} alt="Grihscape design studio" className="w-full h-[480px] object-cover" loading="lazy" />
            </div>
            <div className="absolute -bottom-5 -right-3 lg:-right-6 bg-[#1a1c20] border border-amber-500/20 rounded-2xl px-5 py-4 shadow-2xl">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Our Founders</p>
              <p className="text-[13px] font-semibold text-white">Ar. Gaurav Aggarwal</p>
              <p className="text-[13px] font-semibold text-white mt-0.5">Ar. Dhruv Panwar</p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-5">
              About Grihscape
            </div>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-6">
              Architecture &amp; Design<br /><span className="text-amber-400">Redefined.</span>
            </h2>
            <p className="text-white/60 text-[15px] leading-relaxed mb-5">
              At Grihscape, we are passionate about creating beautiful, comfortable and innovative designs
              that bring your creative vision to life. We use state of art technology and expert designers
              to craft unique and stunning interiors as well as exterior designs that will give your home
              a modern yet timeless feel.
            </p>
            <p className="text-white/55 text-[14.5px] leading-relaxed mb-8">
              Architecture and Interior design is the art and science of enhancing the interior and we
              believe every space tells a story worth telling beautifully.
            </p>
            <WaBtn label="Connect with Us on WhatsApp"
              className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-[#0b0c0e] bg-amber-400 hover:bg-amber-300 transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-900/20" />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 lg:py-32 bg-[#0e0f12]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">
              What We Do
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">Our <span className="text-amber-400">Services</span></h2>
            <p className="text-white/50 text-[15px] max-w-lg mx-auto">
              From single-room makeovers to complete turnkey projects, expertise at every scale.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {SERVICES.map(({ icon: Icon, title, desc, img }) => (
              <div key={title}
                className="group relative rounded-2xl overflow-hidden bg-[#14161a] border border-white/6 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/12">
                <div className="relative h-52 overflow-hidden">
                  <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14161a] to-transparent" />
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <Icon size={20} />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-[17px] font-bold mb-3">{title}</h3>
                  <p className="text-white/50 text-[13px] leading-relaxed mb-5">{desc}</p>
                  <WaBtn label="Enquire Now" className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="py-24 lg:py-32 max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">
            How We Work
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-4">Our <span className="text-amber-400">Process</span></h2>
          <p className="text-white/50 text-[15px] max-w-lg mx-auto">
            A structured, transparent process that keeps you informed at every milestone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROCESS.map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="bg-[#14161a] border border-white/6 rounded-2xl p-6 hover:border-amber-500/20 transition-colors">
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Icon size={22} />
                </div>
                <span className="text-4xl font-black text-white/5 select-none">{step}</span>
              </div>
              <h3 className="text-[16px] font-bold mb-2">{title}</h3>
              <p className="text-white/45 text-[12.5px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects" className="py-24 lg:py-32 bg-[#0e0f12]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">
                Portfolio
              </div>
              <h2 className="text-4xl lg:text-5xl font-black">Our <span className="text-amber-400">Projects</span></h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer border ${
                    activeFilter === f
                      ? 'bg-amber-500 text-[#0b0c0e] border-amber-500'
                      : 'bg-transparent text-white/50 border-white/12 hover:border-white/25 hover:text-white'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(({ img, title, category }) => (
              <div key={title} className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl cursor-pointer">
                <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    {category}
                  </span>
                  <h3 className="text-[15px] font-bold text-white">{title}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <WaBtn label="Request a Custom Project"
              className="px-7 py-3 rounded-xl text-[13px] font-bold text-amber-400 bg-transparent border border-amber-500/30 hover:bg-amber-500/10 transition-all" />
          </div>
        </div>
      </section>

      {/* COST ESTIMATION */}
      <section id="cost" className="py-24 lg:py-32 bg-[#0e0f12]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">
              Pricing NCR Delhi
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              Construction <span className="text-amber-400">Cost Estimation</span>
            </h2>
            <p className="text-white/50 text-[15px] max-w-lg mx-auto">
              Transparent, all-inclusive rates per sq.ft. Contact us for a detailed estimate tailored to your project.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {PACKAGES.map(({ name, price, badge }) => {
              const isPopular = badge === 'Popular';
              return (
                <div key={name}
                  className={`relative rounded-2xl p-7 flex flex-col items-center text-center border transition-all hover:-translate-y-1 duration-300 ${
                    isPopular
                      ? 'bg-gradient-to-b from-amber-500/12 to-[#14161a] border-amber-500/40 shadow-xl shadow-amber-900/15'
                      : 'bg-[#14161a] border-white/8 hover:border-amber-500/20'
                  }`}>
                  {badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isPopular ? 'bg-amber-500 text-[#0b0c0e]' : 'bg-white text-[#0b0c0e]'
                    }`}>
                      {badge}
                    </div>
                  )}
                  <p className="text-[11.5px] font-bold text-white/35 uppercase tracking-widest mb-4">{name}</p>
                  <div className="flex items-start gap-1 mb-1">
                    <span className="text-amber-400 text-[15px] font-bold mt-1">Rs.</span>
                    <span className="text-5xl font-black text-white leading-none">{price}</span>
                  </div>
                  <p className="text-[11.5px] text-white/35 font-medium mb-6">per sq.ft</p>
                  <WaBtn label="Get Quote"
                    className={`w-full justify-center py-2.5 rounded-xl text-[12.5px] font-bold transition-all ${
                      isPopular ? 'text-[#0b0c0e] bg-amber-500 hover:bg-amber-400' : 'text-white bg-white/8 border border-white/8 hover:bg-white/13'
                    }`} />
                </div>
              );
            })}
          </div>

          <p className="text-center text-white/25 text-[11.5px] mt-8">
            * Rates are indicative for the NCR-Delhi region. Final estimate depends on site conditions and specifications.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 lg:py-32 max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">
            Client Stories
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-4">
            What Our <span className="text-amber-400">Clients</span> Say
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map(({ name, review, rating }) => (
            <div key={name} className="bg-[#14161a] border border-white/6 rounded-2xl p-6 flex flex-col gap-4 hover:border-amber-500/20 transition-colors">
              <Quote size={20} className="text-amber-500/45 shrink-0" />
              <p className="text-white/60 text-[13px] leading-relaxed flex-1">"{review}"</p>
              <div className="pt-3 border-t border-white/6">
                <Stars n={rating} />
                <p className="text-[13px] font-bold text-white mt-2">{name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REFER & EARN */}
      <section id="refer" className="py-20 bg-gradient-to-br from-amber-500/8 via-[#0e0f12] to-[#0e0f12] border-y border-amber-500/10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-5">
            Refer &amp; Earn
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-4">
            Love Our Work?<br /><span className="text-amber-400">Share &amp; Earn Rewards.</span>
          </h2>
          <p className="text-white/55 text-[15px] max-w-xl mx-auto mb-8">
            Refer a friend or family member to Grihscape and earn exclusive rewards when they start their project with us.
          </p>
          <WaBtn label="WhatsApp us to Refer"
            className="px-7 py-3 rounded-xl text-[13.5px] font-bold text-[#0b0c0e] bg-amber-400 hover:bg-amber-300 transition-all hover:-translate-y-0.5 shadow-xl shadow-amber-900/20" />
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 lg:py-32 max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-5">
              Get In Touch
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              Start Your <span className="text-amber-400">Project</span><br />Today.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-10">
              Building from scratch or renovating, our team is ready to bring your vision to life.
              Reach us directly on WhatsApp for a quick response.
            </p>

            <a href="https://wa.me/917678576257" target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 group mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Phone size={16} />
              </div>
              <div>
                <p className="text-[10.5px] font-bold text-white/30 uppercase tracking-wider">WhatsApp</p>
                <p className="text-[14px] font-semibold text-white/80 mt-0.5 group-hover:text-amber-400 transition-colors">+91 76785 76257</p>
              </div>
            </a>

            <div>
              <p className="text-[10.5px] font-bold text-white/30 uppercase tracking-wider mb-3">Follow Us</p>
              <div className="flex gap-3">
                {[
                  { href: 'https://www.instagram.com/grihscapestudio/',                            label: 'Instagram' },
                  { href: 'https://www.facebook.com/people/Grihscape/100091648548201/',           label: 'Facebook'  },
                  { href: 'https://www.linkedin.com/company/grihscape/',                          label: 'LinkedIn'  },
                ].map(({ href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-10 h-10 rounded-xl bg-[#16181d] border border-white/8 flex items-center justify-center text-white/45 hover:text-amber-400 hover:border-amber-500/30 transition-all">
                    <ExternalLink size={15} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#14161a] border border-white/8 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle size={32} />
            </div>
            <div>
              <h3 className="text-[20px] font-bold mb-2">Chat With Us</h3>
              <p className="text-white/50 text-[13.5px] leading-relaxed max-w-xs mx-auto">
                The fastest way to reach our team is on WhatsApp. Send us your requirements and we will get back to you shortly.
              </p>
            </div>
            <WaBtn label="Open WhatsApp Chat"
              className="w-full justify-center py-3.5 rounded-xl text-[14px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/25" />
            <p className="text-white/25 text-[12px]">+91 76785 76257</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#080909] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.jpeg" alt="Grihscape" className="w-9 h-9 rounded-lg object-cover border border-amber-500/30" />
                <span className="text-[17px] font-extrabold">Grih<span className="text-amber-400">scape</span></span>
              </div>
              <p className="text-white/40 text-[13px] leading-relaxed">
                Designing spaces that inspire and elevate the human experience.<br />
                <span className="text-amber-500/60 text-[11px] font-semibold">Proudly Crafting India's Skyline.</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Navigation</p>
              <ul className="flex flex-col gap-2.5">
                {NAV_LINKS.map(l => (
                  <li key={l.href}>
                    <button onClick={() => scrollTo(l.href)}
                      className="text-[13px] text-white/45 hover:text-amber-400 transition-colors cursor-pointer bg-transparent border-0 p-0">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Team Access</p>
              <p className="text-white/40 text-[12.5px] leading-relaxed mb-4">
                Grihscape team members can access the internal operations dashboard.
              </p>
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-[#0b0c0e] bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer border-0">
                <LayoutGrid size={13} /> Open Dashboard
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
            <p className="text-[11.5px] text-white/25">2024 Grihscape. All rights reserved.</p>
            <div className="flex gap-3">
              {[
                { href: 'https://instagram.com/grihscape', label: 'Instagram' },
                { href: 'https://facebook.com/grihscape',  label: 'Facebook'  },
                { href: 'https://linkedin.com/grihscape',  label: 'LinkedIn'  },
              ].map(({ href, label }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-amber-400 hover:border-amber-500/30 transition-all">
                  <ExternalLink size={11} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-amber-500 text-[#0b0c0e] flex items-center justify-center shadow-lg shadow-amber-900/40 hover:bg-amber-400 transition-all hover:-translate-y-0.5 cursor-pointer border-0">
          <ArrowUp size={16} />
        </button>
      )}
    </div>
  );
};
