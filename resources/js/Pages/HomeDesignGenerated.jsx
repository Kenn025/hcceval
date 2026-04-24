import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
const Counter = ({ end, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const timer = setInterval(() => {
            start += Math.ceil(end / 50);
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(start);
            }
          }, 30);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current)
      observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return /* @__PURE__ */ jsxs("span", { ref, children: [
    count.toLocaleString(),
    suffix
  ] });
};
const ThemeToggle = ({ isDark, onToggle }) => /* @__PURE__ */ jsx("div", { className: `toggle-switch ${isDark ? "active" : ""}`, onClick: onToggle, children: /* @__PURE__ */ jsx("div", { className: "toggle-knob", children: isDark ? /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { d: "M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" }) }) : /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z", clipRule: "evenodd" }) }) }) });
const NeuCard = ({ children, className = "", hover = false, active = false }) => {
  const [isPressed, setIsPressed] = useState(false);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `
        ${active ? "neumorphic-inset" : "neumorphic"}
        p-6 transition-all duration-300
        ${hover ? "cursor-pointer hover:scale-[1.02]" : ""}
        ${isPressed ? "neumorphic-inset" : ""}
        ${className}
      `,
      onMouseDown: () => hover && setIsPressed(true),
      onMouseUp: () => setIsPressed(false),
      onMouseLeave: () => setIsPressed(false),
      children
    }
  );
};
const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "var(--accent)" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress / 100 * circumference;
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, className: "transform -rotate-90", children: [
    /* @__PURE__ */ jsx(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        fill: "none",
        stroke: "var(--shadow-dark)",
        strokeWidth,
        opacity: 0.3
      }
    ),
    /* @__PURE__ */ jsx(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        fill: "none",
        stroke: color,
        strokeWidth,
        strokeDasharray: circumference,
        strokeDashoffset: offset,
        strokeLinecap: "round",
        className: "transition-all duration-1000 ease-out"
      }
    )
  ] });
};
function App({ loginUrl = "/login" }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hcceval-theme-mode") === "dark";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const goToLogin = () => {
    router.visit(loginUrl);
  };
  useEffect(() => {
    document.body.className = isDarkMode ? "dark-mode" : "light-mode";
    document.body.style.backgroundColor = "var(--bg-primary)";
    document.body.style.color = "var(--text-primary)";
    if (typeof window !== "undefined") {
      localStorage.setItem("hcceval-theme-mode", isDarkMode ? "dark" : "light");
    }
  }, [isDarkMode]);
  const roles = [
    {
      icon: /* @__PURE__ */ jsx("svg", { className: "w-10 h-10", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" }) }),
      title: "Faculty",
      desc: "Comprehensive evaluation tools for academic professionals",
      features: ["Self-Assessment Portal", "Peer Review Access", "Student Feedback View", "Performance History", "Development Reports"],
      progress: 85
    },
    {
      icon: /* @__PURE__ */ jsx("svg", { className: "w-10 h-10", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" }) }),
      title: "Peer",
      desc: "Collaborative evaluation between colleagues",
      features: ["Anonymous Reviews", "360\xB0 Assessment", "Teaching Observation", "Collaborative Goals", "Best Practices Share"],
      progress: 78
    },
    {
      icon: /* @__PURE__ */ jsx("svg", { className: "w-10 h-10", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" }) }),
      title: "Student",
      desc: "Student-centered faculty evaluation system",
      features: ["Course Feedback", "Anonymous Surveys", "Learning Outcomes", "Suggestion Portal", "Progress Tracking"],
      progress: 92
    },
    {
      icon: /* @__PURE__ */ jsx("svg", { className: "w-10 h-10", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" }) }),
      title: "Administrator",
      desc: "Complete system oversight and management",
      features: ["Analytics Dashboard", "User Management", "Report Generation", "Campus Settings", "System Configuration"],
      progress: 95
    }
  ];
  const features = [
    { icon: "\u{1F4CA}", title: "Real-Time Analytics", desc: "Live performance tracking with interactive charts and comprehensive dashboards." },
    { icon: "\u{1F512}", title: "Secure & Private", desc: "Enterprise-grade encryption ensuring all evaluations remain confidential." },
    { icon: "\u{1F4F1}", title: "Multi-Device", desc: "Responsive design accessible on desktop, tablet, and mobile devices." },
    { icon: "\u{1F3EB}", title: "Multi-Campus", desc: "Seamlessly connect and manage evaluations across multiple campuses." },
    { icon: "\u2699\uFE0F", title: "Customizable", desc: "Tailor evaluation criteria and workflows to your institution needs." },
    { icon: "\u{1F4C4}", title: "Detailed Reports", desc: "Generate comprehensive PDF reports with actionable insights." }
  ];
  const stats = [
    { value: 4, label: "User Roles", icon: "\u{1F465}" },
    { value: 12, label: "Campuses", icon: "\u{1F3EB}" },
    { value: 5e3, label: "Evaluations", icon: "\u{1F4DD}" },
    { value: 98, label: "Satisfaction %", icon: "\u2B50" }
  ];
  const faqs = [
    { q: "How does multi-campus evaluation work?", a: "Our system connects all campuses under one unified platform. Each campus maintains its own criteria while administrators can view aggregated data for comprehensive analysis across all locations." },
    { q: "Are student evaluations truly anonymous?", a: "Yes, we use advanced encryption and anonymization techniques. Student and peer evaluations are completely confidential, ensuring honest and unbiased feedback." },
    { q: "Can we customize evaluation forms?", a: "Absolutely! Administrators can create custom evaluation forms, set specific criteria for different roles, and adjust weighting based on institutional requirements." },
    { q: "What security measures are in place?", a: "We implement enterprise-grade security with SSL encryption, role-based access control, regular security audits, and compliance with data protection regulations." },
    { q: "Is training provided?", a: "Yes, we provide comprehensive training materials, video tutorials, and dedicated support to ensure smooth adoption across all user roles." }
  ];
  const testimonials = [
    { name: "Dr. Maria Santos", role: "Dean of Engineering", text: "This system has revolutionized our evaluation process. The holistic approach provides invaluable insights we never had before.", avatar: "\u{1F469}\u200D\u{1F3EB}" },
    { name: "Prof. Juan Cruz", role: "Faculty Member", text: "The peer evaluation feature has fostered continuous improvement. I can track my growth with actionable feedback.", avatar: "\u{1F468}\u200D\u{1F4BB}" },
    { name: "Ana Reyes", role: "Administrator", text: "Managing evaluations across campuses is now seamless. The analytics dashboard provides real-time insights.", avatar: "\u{1F469}\u200D\u{1F4BC}" }
  ];
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5e3);
    return () => clearInterval(timer);
  }, []);
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen transition-all duration-500", style: { backgroundColor: "var(--bg-primary)" }, children: [
    /* @__PURE__ */ jsx("nav", { className: "fixed top-0 left-0 right-0 z-50 p-4", style: { backgroundColor: "var(--bg-primary)" }, children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs(NeuCard, { className: "flex items-center justify-between !p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 neumorphic-circle flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-xl font-bold", style: { color: "var(--accent)" }, children: "M" }) }),
          /* @__PURE__ */ jsxs("div", { className: "hidden sm:block", children: [
            /* @__PURE__ */ jsx("span", { className: "font-bold text-lg", style: { color: "var(--text-primary)" }, children: "MCH-PEMS" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs", style: { color: "var(--text-secondary)" }, children: "Evaluation System" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "hidden lg:flex items-center gap-2", children: ["home", "features", "roles", "how-it-works", "faq"].map((section) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => scrollTo(section),
            className: "neumorphic-btn px-4 py-2 text-sm font-medium capitalize transition-all duration-300",
            style: { color: "var(--text-secondary)" },
            children: section.replace("-", " ")
          },
          section
        )) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx(ThemeToggle, { isDark: isDarkMode, onToggle: () => setIsDarkMode(!isDarkMode) }),
          /* @__PURE__ */ jsx("button", { onClick: goToLogin, className: "neumorphic-btn px-4 py-2 text-sm font-medium", style: { color: "var(--accent)" }, children: "Sign In" }),
          /* @__PURE__ */ jsx("button", { onClick: goToLogin, className: "hidden sm:block neumorphic-btn px-4 py-2 text-sm font-bold text-white", style: { background: "var(--accent)" }, children: "Get Started" }),
          /* @__PURE__ */ jsx("button", { className: "lg:hidden neumorphic-btn p-2", onClick: () => setMenuOpen(!menuOpen), children: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6", style: { color: "var(--text-primary)" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16" }) }) })
        ] })
      ] }),
      menuOpen && /* @__PURE__ */ jsx("div", { className: "lg:hidden mt-4 neumorphic p-4", children: ["home", "features", "roles", "how-it-works", "faq"].map((section) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => scrollTo(section),
          className: "w-full text-left neumorphic-btn px-4 py-3 mb-2 capitalize font-medium",
          style: { color: "var(--text-primary)" },
          children: section.replace("-", " ")
        },
        section
      )) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "home", className: "pt-32 pb-20 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-2 gap-12 items-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "animate-slide-up", children: [
          /* @__PURE__ */ jsxs("div", { className: "neumorphic-inline px-4 py-2 rounded-full inline-flex items-center gap-2 mb-8 neumorphic-flat", children: [
            /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full animate-pulse", style: { backgroundColor: "#00ff00" } }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", style: { color: "var(--accent)" }, children: "Thesis Project 2025" })
          ] }),
          /* @__PURE__ */ jsxs("h1", { className: "text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight", style: { color: "var(--text-primary)" }, children: [
            "Web-Based",
            /* @__PURE__ */ jsx("br", {}),
            /* @__PURE__ */ jsx("span", { style: { color: "var(--accent)" }, children: "Multicampus" }),
            /* @__PURE__ */ jsx("br", {}),
            "Performance",
            /* @__PURE__ */ jsx("br", {}),
            "Evaluation System"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-lg mb-8 max-w-xl", style: { color: "var(--text-secondary)" }, children: "A comprehensive holistic computerized faculty-peer-student-admin performance evaluation management system connecting all stakeholders." }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 mb-12", children: [
            /* @__PURE__ */ jsxs("button", { onClick: goToLogin, className: "neumorphic-btn px-8 py-4 font-bold text-white flex items-center gap-2", style: { background: "var(--accent)" }, children: [
              /* @__PURE__ */ jsx("span", { children: "Start Evaluating" }),
              /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 7l5 5m0 0l-5 5m5-5H6" }) })
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: () => scrollTo("how-it-works"), className: "neumorphic-btn px-8 py-4 font-bold", style: { color: "var(--text-primary)" }, children: "Learn More" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs("div", { className: "relative animate-float", children: [
          /* @__PURE__ */ jsxs("div", { className: "neumorphic p-8 rounded-3xl", children: [
            /* @__PURE__ */ jsxs("div", { className: "neumorphic-inset p-6 rounded-2xl mb-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mb-4", children: [
                /* @__PURE__ */ jsx("div", { className: "w-16 h-16 neumorphic-circle flex items-center justify-center text-2xl", children: "\u{1F468}\u200D\u{1F3EB}" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h3", { className: "font-bold", style: { color: "var(--text-primary)" }, children: "Dr. Juan Cruz" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: "Faculty Evaluation" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--text-secondary)" }, children: "Teaching Quality" }),
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--accent)" }, children: "92%" })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "progress-bar", children: /* @__PURE__ */ jsx("div", { className: "progress-fill", style: { width: "92%" } }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--text-secondary)" }, children: "Student Engagement" }),
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--accent)" }, children: "88%" })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "progress-bar", children: /* @__PURE__ */ jsx("div", { className: "progress-fill", style: { width: "88%" } }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm mb-1", children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--text-secondary)" }, children: "Research Output" }),
                    /* @__PURE__ */ jsx("span", { style: { color: "var(--accent)" }, children: "95%" })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "progress-bar", children: /* @__PURE__ */ jsx("div", { className: "progress-fill", style: { width: "95%" } }) })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-around", children: [
              /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold", style: { color: "var(--accent)" }, children: "4" }),
                /* @__PURE__ */ jsx("div", { className: "text-xs", style: { color: "var(--text-secondary)" }, children: "Roles" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold", style: { color: "var(--accent)" }, children: "12+" }),
                /* @__PURE__ */ jsx("div", { className: "text-xs", style: { color: "var(--text-secondary)" }, children: "Campuses" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold", style: { color: "var(--accent)" }, children: "98%" }),
                /* @__PURE__ */ jsx("div", { className: "text-xs", style: { color: "var(--text-secondary)" }, children: "Rate" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "absolute -top-4 -right-4 w-12 h-12 neumorphic-circle flex items-center justify-center animate-pulse-glow", children: "\u2B50" }),
          /* @__PURE__ */ jsx("div", { className: "absolute -bottom-4 -left-4 w-10 h-10 neumorphic-circle flex items-center justify-center", children: "\u{1F4CA}" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 mt-20", children: stats.map((stat, i) => /* @__PURE__ */ jsxs("div", { className: "neumorphic p-6 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "text-3xl mb-2", children: stat.icon }),
        /* @__PURE__ */ jsx("div", { className: "text-3xl font-bold mb-1", style: { color: "var(--accent)" }, children: /* @__PURE__ */ jsx(Counter, { end: stat.value }) }),
        /* @__PURE__ */ jsx("div", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: stat.label })
      ] }, i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "features", className: "py-20 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("span", { className: "neumorphic-flat px-4 py-2 inline-block text-sm font-bold mb-4", style: { color: "var(--accent)" }, children: "Features" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold mb-4", style: { color: "var(--text-primary)" }, children: "Powerful Capabilities" }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--text-secondary)" }, children: "Everything you need for comprehensive evaluation management" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8", children: features.map((feature, i) => /* @__PURE__ */ jsxs("div", { className: "neumorphic p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer", children: [
        /* @__PURE__ */ jsx("div", { className: "w-16 h-16 neumorphic-circle flex items-center justify-center text-2xl mb-4", children: feature.icon }),
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold mb-2", style: { color: "var(--text-primary)" }, children: feature.title }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: feature.desc })
      ] }, i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "roles", className: "py-20 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("span", { className: "neumorphic-flat px-4 py-2 inline-block text-sm font-bold mb-4", style: { color: "var(--accent)" }, children: "User Roles" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold mb-4", style: { color: "var(--text-primary)" }, children: "Four Integrated Roles" }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--text-secondary)" }, children: "Click a role to explore its capabilities" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap justify-center gap-4 mb-12", children: roles.map((role, i) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setActiveRole(i),
          className: `px-6 py-3 font-bold transition-all duration-300 ${activeRole === i ? "neumorphic-inset" : "neumorphic-btn"}`,
          style: { color: activeRole === i ? "var(--accent)" : "var(--text-secondary)" },
          children: role.title
        },
        i
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-2 gap-8", children: [
        /* @__PURE__ */ jsxs(NeuCard, { className: "animate-slide-up", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mb-6", children: [
            /* @__PURE__ */ jsx("div", { className: "w-20 h-20 neumorphic-circle flex items-center justify-center", style: { color: "var(--accent)" }, children: roles[activeRole].icon }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "text-2xl font-bold", style: { color: "var(--text-primary)" }, children: roles[activeRole].title }),
              /* @__PURE__ */ jsx("p", { style: { color: "var(--text-secondary)" }, children: roles[activeRole].desc })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "neumorphic-inset p-6 rounded-2xl mb-6", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-bold mb-4", style: { color: "var(--text-primary)" }, children: "Features" }),
            /* @__PURE__ */ jsx("ul", { className: "space-y-3", children: roles[activeRole].features.map((feature, i) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3", style: { color: "var(--text-secondary)" }, children: [
              /* @__PURE__ */ jsx("div", { className: "w-6 h-6 neumorphic-circle flex items-center justify-center text-xs", style: { color: "var(--accent)" }, children: "\u2713" }),
              feature
            ] }, i)) })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "w-full neumorphic-btn py-4 font-bold", style: { color: "var(--accent)" }, children: [
            "Access ",
            roles[activeRole].title,
            " Portal"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(ProgressRing, { progress: roles[activeRole].progress, size: 180, strokeWidth: 12 }),
          /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-4xl font-bold", style: { color: "var(--accent)" }, children: [
              roles[activeRole].progress,
              "%"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: "Completion" })
          ] })
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "how-it-works", className: "py-20 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("span", { className: "neumorphic-flat px-4 py-2 inline-block text-sm font-bold mb-4", style: { color: "var(--accent)" }, children: "Process" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold mb-4", style: { color: "var(--text-primary)" }, children: "How It Works" }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--text-secondary)" }, children: "Simple evaluation process in four steps" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-4 gap-8", children: [
        { step: "01", title: "Register", desc: "Create account and select your role", icon: "\u{1F4DD}" },
        { step: "02", title: "Configure", desc: "Set up evaluation criteria", icon: "\u2699\uFE0F" },
        { step: "03", title: "Evaluate", desc: "Complete evaluations forms", icon: "\u2705" },
        { step: "04", title: "Analyze", desc: "View reports and insights", icon: "\u{1F4CA}" }
      ].map((item, i) => /* @__PURE__ */ jsxs("div", { className: "neumorphic p-6 text-center group hover:scale-[1.02] transition-transform duration-300", children: [
        /* @__PURE__ */ jsx("div", { className: "w-20 h-20 neumorphic-circle mx-auto flex items-center justify-center text-3xl mb-4 group-hover:animate-pulse-glow", children: item.icon }),
        /* @__PURE__ */ jsx("div", { className: "text-4xl font-bold mb-2 opacity-30", style: { color: "var(--accent)" }, children: item.step }),
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold mb-2", style: { color: "var(--text-primary)" }, children: item.title }),
        /* @__PURE__ */ jsx("p", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: item.desc })
      ] }, i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "py-20 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("span", { className: "neumorphic-flat px-4 py-2 inline-block text-sm font-bold mb-4", style: { color: "var(--accent)" }, children: "Testimonials" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold", style: { color: "var(--text-primary)" }, children: "What Users Say" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "neumorphic p-8 md:p-12", children: [
        /* @__PURE__ */ jsx("div", { className: "text-6xl mb-6 opacity-20", style: { color: "var(--accent)" }, children: '"' }),
        /* @__PURE__ */ jsx("p", { className: "text-xl md:text-2xl mb-8 leading-relaxed", style: { color: "var(--text-primary)" }, children: testimonials[currentTestimonial].text }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 neumorphic-circle flex items-center justify-center text-2xl", children: testimonials[currentTestimonial].avatar }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "font-bold text-lg", style: { color: "var(--text-primary)" }, children: testimonials[currentTestimonial].name }),
            /* @__PURE__ */ jsx("div", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: testimonials[currentTestimonial].role })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-center gap-3 mt-8", children: testimonials.map((_, i) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setCurrentTestimonial(i),
            className: `w-3 h-3 rounded-full transition-all duration-300 ${currentTestimonial === i ? "neumorphic-inset scale-125" : "neumorphic-circle"}`,
            style: { background: currentTestimonial === i ? "var(--accent)" : "var(--bg-primary)" }
          },
          i
        )) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "faq", className: "py-20 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("span", { className: "neumorphic-flat px-4 py-2 inline-block text-sm font-bold mb-4", style: { color: "var(--accent)" }, children: "FAQ" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold", style: { color: "var(--text-primary)" }, children: "Frequently Asked Questions" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-4", children: faqs.map((faq, i) => /* @__PURE__ */ jsxs("div", { className: `transition-all duration-300 ${openFaq === i ? "neumorphic-inset" : "neumorphic"}`, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setOpenFaq(openFaq === i ? null : i),
            className: "w-full p-6 flex justify-between items-center text-left",
            children: [
              /* @__PURE__ */ jsx("span", { className: "font-bold pr-4", style: { color: "var(--text-primary)" }, children: faq.q }),
              /* @__PURE__ */ jsx(
                "svg",
                {
                  className: `w-6 h-6 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`,
                  style: { color: "var(--accent)" },
                  fill: "none",
                  stroke: "currentColor",
                  viewBox: "0 0 24 24",
                  children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: `overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-96 pb-6 px-6" : "max-h-0"}`, children: /* @__PURE__ */ jsx("p", { style: { color: "var(--text-secondary)" }, children: faq.a }) })
      ] }, i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "contact", className: "py-20 px-4", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-2 gap-12", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "neumorphic-flat px-4 py-2 inline-block text-sm font-bold mb-4", style: { color: "var(--accent)" }, children: "Contact" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold mb-6", style: { color: "var(--text-primary)" }, children: "Get In Touch" }),
        /* @__PURE__ */ jsx("p", { className: "mb-8", style: { color: "var(--text-secondary)" }, children: "Have questions about MCH-PEMS? We're here to help." }),
        /* @__PURE__ */ jsx("div", { className: "space-y-6", children: [
          { icon: "\u{1F4E7}", label: "Email", value: "mchpems@university.edu" },
          { icon: "\u{1F4CD}", label: "Location", value: "University Campus, Philippines" },
          { icon: "\u{1F4DE}", label: "Phone", value: "+63 912 345 6789" }
        ].map((item, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 neumorphic-flat p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 neumorphic-circle flex items-center justify-center text-xl", children: item.icon }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: item.label }),
            /* @__PURE__ */ jsx("div", { className: "font-bold", style: { color: "var(--text-primary)" }, children: item.value })
          ] })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsx(NeuCard, { children: /* @__PURE__ */ jsxs("form", { className: "space-y-6", onSubmit: (e) => e.preventDefault(), children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Full Name" }),
          /* @__PURE__ */ jsx("input", { type: "text", placeholder: "Enter your name", className: "neumorphic-input w-full" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Email" }),
          /* @__PURE__ */ jsx("input", { type: "email", placeholder: "Enter your email", className: "neumorphic-input w-full" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Message" }),
          /* @__PURE__ */ jsx("textarea", { rows: 4, placeholder: "How can we help?", className: "neumorphic-input w-full resize-none" })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "submit", className: "w-full neumorphic-btn py-4 font-bold text-white", style: { background: "var(--accent)" }, children: "Send Message" })
      ] }) })
    ] }) }) }),
    /* @__PURE__ */ jsx("section", { className: "py-20 px-4", children: /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "neumorphic p-12 text-center animate-pulse-glow", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-4xl font-bold mb-6", style: { color: "var(--text-primary)" }, children: "Ready to Transform Evaluation?" }),
      /* @__PURE__ */ jsx("p", { className: "mb-8 max-w-xl mx-auto", style: { color: "var(--text-secondary)" }, children: "Join institutions already using MCH-PEMS for comprehensive performance evaluation." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center gap-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: goToLogin, className: "neumorphic-btn px-8 py-4 font-bold text-white", style: { background: "var(--accent)" }, children: "Get Started Free" }),
        /* @__PURE__ */ jsx("button", { onClick: () => scrollTo("contact"), className: "neumorphic-btn px-8 py-4 font-bold", style: { color: "var(--text-primary)" }, children: "Contact Us" })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx("footer", { className: "py-12 px-4", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "neumorphic p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-4 gap-8 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-12 h-12 neumorphic-circle flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-xl font-bold", style: { color: "var(--accent)" }, children: "M" }) }),
            /* @__PURE__ */ jsx("span", { className: "text-xl font-bold", style: { color: "var(--text-primary)" }, children: "MCH-PEMS" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mb-4 max-w-md", style: { color: "var(--text-secondary)" }, children: "Multicampus Holistic Computerized Faculty-Peer-Student-Admin Performance Evaluation Management System." }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-3", children: ["M", "T", "G", "L"].map((letter, i) => /* @__PURE__ */ jsx("div", { className: "w-10 h-10 neumorphic-btn flex items-center justify-center font-bold", style: { color: "var(--accent)" }, children: letter }, i)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "font-bold mb-4", style: { color: "var(--text-primary)" }, children: "Quick Links" }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: ["Home", "Features", "Roles", "FAQ", "Contact"].map((link) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", { onClick: () => scrollTo(link.toLowerCase()), className: "hover:underline", style: { color: "var(--text-secondary)" }, children: link }) }, link)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "font-bold mb-4", style: { color: "var(--text-primary)" }, children: "Contact" }),
          /* @__PURE__ */ jsxs("ul", { className: "space-y-2", style: { color: "var(--text-secondary)" }, children: [
            /* @__PURE__ */ jsx("li", { children: "mchpems@university.edu" }),
            /* @__PURE__ */ jsx("li", { children: "+63 912 345 6789" }),
            /* @__PURE__ */ jsx("li", { children: "University Campus" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "border-t pt-6 text-center", style: { borderColor: "var(--shadow-dark)" }, children: /* @__PURE__ */ jsx("p", { className: "text-sm", style: { color: "var(--text-secondary)" }, children: "\xA9 2025 MCH-PEMS. All rights reserved. Thesis Project." }) })
    ] }) }) }),
    loginOpen && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", style: { backgroundColor: "rgba(0,0,0,0.7)" }, onClick: () => setLoginOpen(false), children: /* @__PURE__ */ jsxs("div", { className: "neumorphic p-8 max-w-md w-full", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-6", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-2xl font-bold", style: { color: "var(--text-primary)" }, children: "Sign In" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setLoginOpen(false), className: "neumorphic-btn w-10 h-10 flex items-center justify-center", children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", style: { color: "var(--text-primary)" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "space-y-4", onSubmit: (e) => e.preventDefault(), children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Email" }),
          /* @__PURE__ */ jsx("input", { type: "email", placeholder: "Enter your email", className: "neumorphic-input w-full" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Password" }),
          /* @__PURE__ */ jsx("input", { type: "password", placeholder: "Enter your password", className: "neumorphic-input w-full" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Role" }),
          /* @__PURE__ */ jsxs("select", { className: "neumorphic-input w-full", children: [
            /* @__PURE__ */ jsx("option", { children: "Select your role" }),
            /* @__PURE__ */ jsx("option", { children: "Faculty" }),
            /* @__PURE__ */ jsx("option", { children: "Peer" }),
            /* @__PURE__ */ jsx("option", { children: "Student" }),
            /* @__PURE__ */ jsx("option", { children: "Administrator" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "submit", className: "w-full neumorphic-btn py-4 font-bold text-white", style: { background: "var(--accent)" }, children: "Sign In" }),
        /* @__PURE__ */ jsxs("p", { className: "text-center text-sm", style: { color: "var(--text-secondary)" }, children: [
          "Don't have an account?",
          " ",
          /* @__PURE__ */ jsx("button", { onClick: () => {
            setLoginOpen(false);
            setRegisterOpen(true);
          }, className: "font-bold", style: { color: "var(--accent)" }, children: "Register" })
        ] })
      ] })
    ] }) }),
    registerOpen && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", style: { backgroundColor: "rgba(0,0,0,0.7)" }, onClick: () => setRegisterOpen(false), children: /* @__PURE__ */ jsxs("div", { className: "neumorphic p-8 max-w-md w-full max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-6", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-2xl font-bold", style: { color: "var(--text-primary)" }, children: "Create Account" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setRegisterOpen(false), className: "neumorphic-btn w-10 h-10 flex items-center justify-center", children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", style: { color: "var(--text-primary)" }, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "space-y-4", onSubmit: (e) => e.preventDefault(), children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "First Name" }),
            /* @__PURE__ */ jsx("input", { type: "text", placeholder: "First name", className: "neumorphic-input w-full" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Last Name" }),
            /* @__PURE__ */ jsx("input", { type: "text", placeholder: "Last name", className: "neumorphic-input w-full" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Email" }),
          /* @__PURE__ */ jsx("input", { type: "email", placeholder: "Enter your email", className: "neumorphic-input w-full" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Role" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "neumorphic-input w-full",
              value: selectedRole,
              onChange: (e) => setSelectedRole(e.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select your role" }),
                /* @__PURE__ */ jsx("option", { value: "faculty", children: "Faculty" }),
                /* @__PURE__ */ jsx("option", { value: "peer", children: "Peer Evaluator" }),
                /* @__PURE__ */ jsx("option", { value: "student", children: "Student" }),
                /* @__PURE__ */ jsx("option", { value: "admin", children: "Administrator" })
              ]
            }
          )
        ] }),
        selectedRole && /* @__PURE__ */ jsx("div", { className: "neumorphic-inset p-3", children: /* @__PURE__ */ jsxs("p", { className: "text-sm", style: { color: "var(--accent)" }, children: [
          "\u2713 Selected: ",
          selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1),
          " account"
        ] }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-bold mb-2", style: { color: "var(--text-primary)" }, children: "Password" }),
          /* @__PURE__ */ jsx("input", { type: "password", placeholder: "Create a password", className: "neumorphic-input w-full" })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "submit", className: "w-full neumorphic-btn py-4 font-bold text-white", style: { background: "var(--accent)" }, children: "Create Account" }),
        /* @__PURE__ */ jsxs("p", { className: "text-center text-sm", style: { color: "var(--text-secondary)" }, children: [
          "Already have an account?",
          " ",
          /* @__PURE__ */ jsx("button", { onClick: () => {
            setRegisterOpen(false);
            setLoginOpen(true);
          }, className: "font-bold", style: { color: "var(--accent)" }, children: "Sign In" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(BackToTop, {})
  ] });
}
function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggle = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", toggle);
    return () => window.removeEventListener("scroll", toggle);
  }, []);
  return /* @__PURE__ */ jsx(
    "button",
    {
      onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      className: `fixed bottom-8 right-8 w-12 h-12 neumorphic-btn flex items-center justify-center z-40 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`,
      style: { color: "var(--accent)" },
      children: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 10l7-7m0 0l7 7m-7-7v18" }) })
    }
  );
}
export {
  App as default
};


