import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import "./App.css";

type PageId = "dashboard" | "profile" | "social" | "apps" | "domains";
type HealthState = "checking" | "online" | "offline";
type Severity = "Critical" | "High" | "Medium";
type ThemeMode = "light" | "dark" | "system";
type BrandProfileData = { name: string; industry: string; region: string; description: string };

const currentUser = { name: "Aryan Mehta", initials: "AM", role: "Lead SOC Analyst" };

const initialProfile: BrandProfileData = {
  name: "Acme Financial",
  industry: "Fintech & digital banking",
  region: "North America",
  description: "Digital banking services and customer support. Use this context to help analysts review possible impersonation signals.",
};

const navigation: { id: PageId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "profile", label: "Brand profile", icon: "shield" },
  { id: "social", label: "Social monitor", icon: "users" },
  { id: "apps", label: "App monitor", icon: "apps" },
  { id: "domains", label: "Lookalike domains", icon: "globe" },
];

const findings: {
  name: string;
  channel: string;
  evidence: string;
  severity: Severity;
  age: string;
}[] = [
  {
    name: "Acme Financial Helpdesk",
    channel: "Social profile",
    evidence: "Unverified account using a similar handle",
    severity: "Critical",
    age: "12 min ago",
  },
  {
    name: "acme-secure-login.com",
    channel: "Lookalike domain",
    evidence: "New domain with a sign-in page",
    severity: "High",
    age: "48 min ago",
  },
  {
    name: "Acme Pay — Quick Transfer",
    channel: "Mobile app",
    evidence: "Unverified publisher and copied branding",
    severity: "High",
    age: "2 hrs ago",
  },
];

const socialProfiles = [
  { name: "Acme Financial Helpdesk", handle: "@AcmeFin_Helpdesk", platform: "X", followers: "1,248", similarity: "94%" },
  { name: "Acme Global VIP Support", handle: "@acme_vip_agent", platform: "Instagram", followers: "450", similarity: "87%" },
  { name: "Acme Careers", handle: "@acme-careers-portal", platform: "LinkedIn", followers: "210", similarity: "72%" },
];

const mobileApps = [
  { name: "Acme Pay — Quick Transfer", publisher: "AcmeGlobal Digital Apps LLC", store: "Google Play", risk: "High", packageId: "com.acme.financial.fake" },
  { name: "Acme Financial: Fast Loans", publisher: "QuickFinance Tech Ltd", store: "APK mirror", risk: "Critical", packageId: "com.acmepay.loan.secure" },
  { name: "Acme Safe Banking Boost", publisher: "AppPulse Studio", store: "Third-party store", risk: "Medium", packageId: "com.acme.utility.optimizer" },
];

const domains = [
  { domain: "acme-secure-login.com", vector: "Typosquat", registrar: "NameCheap Inc.", score: 98, status: "Active" },
  { domain: "acme-finance.co", vector: "Homoglyph", registrar: "Porkbun LLC", score: 91, status: "Active" },
  { domain: "secure-acme-login.net", vector: "Combosquat", registrar: "Tucows Domains", score: 84, status: "Observed" },
  { domain: "acmefinancial.help", vector: "Phishing landing page", registrar: "PublicDomainReg", score: 76, status: "Observed" },
];

function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };

  switch (name) {
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "users":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>;
    case "apps":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h4" /></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "alert":
      return <svg {...common}><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "chevron":
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "sun":
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
    case "moon":
      return <svg {...common}><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></svg>;
    case "monitor":
      return <svg {...common}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const storedTheme = window.localStorage.getItem("drishti-theme");
      return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
    } catch {
      return "system";
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("drishti-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [preferenceWarning, setPreferenceWarning] = useState("");
  const [page, setPage] = useState<PageId>("dashboard");
  const [health, setHealth] = useState<HealthState>("checking");
  const [healthMessage, setHealthMessage] = useState("");
  const [healthAttempt, setHealthAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [assessmentMessage, setAssessmentMessage] = useState("");
  const [brandProfile, setBrandProfile] = useState(initialProfile);
  const [profileDraft, setProfileDraft] = useState(initialProfile);
  const [brandInput, setBrandInput] = useState(initialProfile.name);
  const [profileSaved, setProfileSaved] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [themeMenuIndex, setThemeMenuIndex] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuIndex, setAccountMenuIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pointerTargetRef = useRef<HTMLElement | null>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const themeTriggerRef = useRef<HTMLButtonElement>(null);
  const themeOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "sun" },
    { value: "dark", label: "Dark", icon: "moon" },
    { value: "system", label: "System", icon: "monitor" },
  ];

  useEffect(() => {
    const root = document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      const resolvedTheme = themeMode === "system" ? (systemTheme.matches ? "light" : "dark") : themeMode;
      root.dataset.theme = resolvedTheme;
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", resolvedTheme === "light" ? "#f4f6f9" : "#0d111b");
    };

    applyTheme();
    systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [themeMode]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("http://127.0.0.1:8000/api/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Health check failed (${response.status})`);
        return response.json() as Promise<{ status?: string }>;
      })
      .then((data) => {
        if (data.status !== "ok") throw new Error("The API returned an unexpected health status.");
        setHealth("online");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth("offline");
        setHealthMessage(error instanceof Error ? error.message : "Could not reach the local API.");
      });

    return () => controller.abort();
  }, [healthAttempt]);

  // Smooth in-page navigation for same-document anchors ("#section-id"). Links that do not point at an element that
  // exists on the page (or that another handler already took over, like the brand link that switches views) are left alone.
  useEffect(() => {
    function handleAnchorClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const id = anchor?.getAttribute("href")?.slice(1);
      if (!anchor || !id) return;
      const target = document.getElementById(decodeURIComponent(id));
      if (!target) return;
      event.preventDefault();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      window.history.pushState(null, "", `#${id}`);
    }

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  // When the view changes, bring the new view's heading back into sight with the same motion rules.
  const isFirstPageRender = useRef(true);
  useEffect(() => {
    if (isFirstPageRender.current) {
      isFirstPageRender.current = false;
      return;
    }
    if (window.scrollY === 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [page]);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (accountMenuOpen) {
        setAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
        return;
      }
      setMobileNavOpen(false);
      setAccountMenuOpen(false);
      setNotificationsOpen(false);
      if (themeMenuOpen) {
        setThemeMenuOpen(false);
        themeTriggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [accountMenuOpen, themeMenuOpen]);

  useEffect(() => {
    if (themeMenuOpen) themeOptionRefs.current[themeMenuIndex]?.focus();
  }, [themeMenuOpen, themeMenuIndex]);

  useLayoutEffect(() => {
    if (accountMenuOpen) accountMenuItemRefs.current[accountMenuIndex]?.focus();
  }, [accountMenuOpen, accountMenuIndex]);

  useEffect(() => {
    if (!themeMenuOpen) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !themePickerRef.current?.contains(event.target)) setThemeMenuOpen(false);
    }
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [themeMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    }
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [accountMenuOpen]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredFindings = useMemo(
    () => findings.filter((item) => `${item.name} ${item.channel} ${item.evidence} ${item.severity}`.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch],
  );

  function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = brandInput.trim();
    if (!name) {
      setAssessmentMessage("Enter a brand name to create a demo assessment.");
      return;
    }
    setAssessmentMessage(`Demo assessment prepared for ${name}. No live platforms were scanned.`);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = profileDraft.name.trim();
    if (!name) return;
    const updatedProfile = { ...profileDraft, name };
    setBrandProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    setBrandInput(name);
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 3000);
  }

  function handleCardPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>(".panel, .stat-card");
    if (pointerTargetRef.current !== target) {
      pointerTargetRef.current?.removeAttribute("data-pointer-active");
      pointerTargetRef.current = target;
    }
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    target.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    target.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    target.setAttribute("data-pointer-active", "true");
  }

  function clearCardPointer() {
    pointerTargetRef.current?.removeAttribute("data-pointer-active");
    pointerTargetRef.current = null;
  }

  function changeTheme(mode: ThemeMode, restoreFocus = true) {
    setThemeMode(mode);
    try {
      window.localStorage.setItem("drishti-theme", mode);
      setPreferenceWarning("");
    } catch {
      setPreferenceWarning("Theme preference could not be saved in this browser.");
    }
    setThemeMenuOpen(false);
    if (restoreFocus) themeTriggerRef.current?.focus();
  }

  function openThemeMenu(index = themeOptions.findIndex((option) => option.value === themeMode)) {
    setThemeMenuIndex(index < 0 ? 0 : index);
    setAccountMenuOpen(false);
    setNotificationsOpen(false);
    setThemeMenuOpen(true);
  }

  function handleThemeMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex = themeMenuIndex;
    if (event.key === "ArrowDown") nextIndex = (themeMenuIndex + 1) % themeOptions.length;
    else if (event.key === "ArrowUp") nextIndex = (themeMenuIndex - 1 + themeOptions.length) % themeOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = themeOptions.length - 1;
    else return;
    event.preventDefault();
    setThemeMenuIndex(nextIndex);
  }

  function openAccountMenu(initialFocusIndex = 0) {
    setAccountMenuIndex(initialFocusIndex);
    setThemeMenuOpen(false);
    setNotificationsOpen(false);
    setAccountMenuOpen(true);
  }

  function handleAccountMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setAccountMenuOpen(false);
      accountTriggerRef.current?.focus();
      return;
    }

    const enabledItems = accountMenuItemRefs.current
      .map((item, index) => ({ item, index }))
      .filter((entry): entry is { item: HTMLButtonElement; index: number } => Boolean(entry.item && !entry.item.disabled));
    if (!enabledItems.length) return;

    const currentIndex = enabledItems.findIndex((entry) => entry.index === accountMenuIndex);
    let nextIndex: number;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % enabledItems.length;
    else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = enabledItems.length - 1;
    else return;

    event.preventDefault();
    const nextItem = enabledItems[nextIndex];
    setAccountMenuIndex(nextItem.index);
    nextItem.item.focus();
  }

  function navigateToPage(nextPage: PageId) {
    setPage(nextPage);
    setAccountMenuOpen(false);
  }

  function navigateFromAccountMenu(nextPage: PageId) {
    navigateToPage(nextPage);
    setAssessmentMessage("");
    setMobileNavOpen(false);
  }

  function changeThemeFromAccountMenu(mode: ThemeMode) {
    changeTheme(mode, false);
    setAccountMenuOpen(false);
    accountTriggerRef.current?.focus();
  }

  function toggleSidebar() {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    try {
      window.localStorage.setItem("drishti-sidebar-collapsed", String(nextCollapsed));
      setPreferenceWarning("");
    } catch {
      setPreferenceWarning("Sidebar preference could not be saved in this browser.");
    }
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileNavOpen ? "mobile-nav-open" : ""}`} onPointerMove={handleCardPointerMove} onPointerLeave={clearCardPointer}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <button className={`mobile-nav-backdrop ${mobileNavOpen ? "is-visible" : ""}`} aria-label="Close navigation" tabIndex={mobileNavOpen ? 0 : -1} aria-hidden={!mobileNavOpen} onClick={() => { setMobileNavOpen(false); setAccountMenuOpen(false); }} />
      <aside className={`sidebar ${mobileNavOpen ? "is-mobile-open" : ""}`} aria-label="Primary navigation" id="primary-navigation">
        <div className={`sidebar-brand-row ${sidebarCollapsed ? "is-collapsed" : ""}`}>
          <a className="brand-lockup" href="#dashboard" title="Dashboard" onClick={(event) => { event.preventDefault(); navigateToPage("dashboard"); setMobileNavOpen(false); }}>
          <span className="brand-mark"><Icon name="shield" size={18} /></span>
          <span className="brand-copy"><strong>Drishti DRP</strong><small>BRANDSHIELD SENTINEL</small></span>
          </a>
          <button className="sidebar-collapse-button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar}><Icon name="chevron" size={16} /></button>
        </div>

        <div className="nav-caption">OPERATIONAL SURVEILLANCE</div>
        <nav className="primary-nav">
          {navigation.map((item) => (
            <button
              className={`nav-link ${page === item.id ? "is-active" : ""}`}
              key={item.id}
              onClick={() => { navigateToPage(item.id); setAssessmentMessage(""); setMobileNavOpen(false); }}
              aria-current={page === item.id ? "page" : undefined}
              aria-label={item.label}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "social" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-status">
          <span className="feed-indicator"><span className="live-dot" /> Demo workspace</span>
          <span className="sidebar-note">Monitoring feeds are not connected</span>
        </div>
        <div className="sidebar-user-wrap" ref={accountMenuRef}>
          <button
            className="sidebar-user"
            type="button"
            ref={accountTriggerRef}
            aria-label="Account menu - Aryan Mehta"
            title="Account menu - Aryan Mehta"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            aria-controls="account-menu"
            onClick={() => accountMenuOpen ? setAccountMenuOpen(false) : openAccountMenu()}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                openAccountMenu(event.key === "ArrowDown" ? 0 : 4);
              }
            }}
          >
            <span className="avatar" aria-hidden="true">{currentUser.initials}</span>
            <span><strong>{currentUser.name}</strong><small>{currentUser.role}</small></span>
            <span className="user-menu" aria-hidden="true">···</span>
          </button>
          <div
            className={`theme-menu account-menu ${accountMenuOpen ? "is-open" : ""}`}
            id="account-menu"
            role="menu"
            aria-label="Account menu"
            aria-hidden={!accountMenuOpen}
            inert={!accountMenuOpen}
            onKeyDown={handleAccountMenuKeyDown}
          >
            <div className="account-menu-header">
              <span className="avatar" aria-hidden="true">{currentUser.initials}</span>
              <span><strong>{currentUser.name}</strong><small>{currentUser.role}</small></span>
            </div>
            <button className="theme-option account-menu-item" type="button" role="menuitem" tabIndex={accountMenuOpen && accountMenuIndex === 0 ? 0 : -1} ref={(element) => { accountMenuItemRefs.current[0] = element; }} onFocus={() => setAccountMenuIndex(0)} onClick={() => navigateFromAccountMenu("profile")}>Brand profile</button>
            <div className="account-menu-group" role="group" aria-label="Appearance">
              <span className="account-menu-group-label">Appearance</span>
              {themeOptions.map((option, index) => {
                const itemIndex = index + 1;
                return (
                  <button
                    className={`theme-option account-menu-item ${themeMode === option.value ? "is-selected" : ""}`}
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeMode === option.value}
                    tabIndex={accountMenuOpen && accountMenuIndex === itemIndex ? 0 : -1}
                    ref={(element) => { accountMenuItemRefs.current[itemIndex] = element; }}
                    onFocus={() => setAccountMenuIndex(itemIndex)}
                    onClick={() => changeThemeFromAccountMenu(option.value)}
                  >
                    <Icon name={option.icon} size={15} />
                    <span>{option.label}</span>
                    {themeMode === option.value && <Icon className="theme-option-check" name="check" size={15} />}
                  </button>
                );
              })}
            </div>
            <button className="theme-option account-menu-item" type="button" role="menuitem" tabIndex={accountMenuOpen && accountMenuIndex === 4 ? 0 : -1} ref={(element) => { accountMenuItemRefs.current[4] = element; }} onFocus={() => setAccountMenuIndex(4)} onClick={toggleSidebar}>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</button>
            <button className="theme-option account-menu-item account-menu-signout subtle-button" type="button" role="menuitem" disabled title="Authentication is not connected in this demo" tabIndex={-1}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" aria-label="Open navigation" aria-expanded={mobileNavOpen} aria-controls="primary-navigation" onClick={() => { setAccountMenuOpen(false); setMobileNavOpen((open) => !open); }}><Icon name="menu" size={18} /></button>
          <div className="breadcrumbs"><span>DRP</span><span className="crumb-separator">/</span><strong>Console</strong></div>
          <label className="global-search">
            <Icon name="search" size={16} />
            <span className="sr-only">Search this view</span>
            <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search domains, profiles, apps..." />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <div className="theme-picker" ref={themePickerRef}>
              <button
                className="theme-trigger"
                type="button"
                ref={themeTriggerRef}
                aria-label={`Color theme: ${themeMode}`}
                aria-haspopup="menu"
                aria-expanded={themeMenuOpen}
                aria-controls="theme-menu"
                onClick={() => themeMenuOpen ? setThemeMenuOpen(false) : openThemeMenu()}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    openThemeMenu(event.key === "ArrowDown" ? themeOptions.findIndex((option) => option.value === themeMode) : (themeOptions.findIndex((option) => option.value === themeMode) - 1 + themeOptions.length) % themeOptions.length);
                  }
                }}
              >
                <Icon name={themeOptions.find((option) => option.value === themeMode)?.icon ?? "monitor"} size={16} />
                <span>{themeOptions.find((option) => option.value === themeMode)?.label ?? "System"}</span>
                <Icon className="theme-chevron" name="chevron" size={14} />
              </button>
              <div className={`theme-menu ${themeMenuOpen ? "is-open" : ""}`} id="theme-menu" role="menu" aria-label="Color theme" aria-hidden={!themeMenuOpen} onKeyDown={handleThemeMenuKeyDown}>
                {themeOptions.map((option, index) => (
                  <button
                    className={`theme-option ${themeMode === option.value ? "is-selected" : ""}`}
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeMode === option.value}
                    tabIndex={themeMenuOpen && themeMenuIndex === index ? 0 : -1}
                    ref={(element) => { themeOptionRefs.current[index] = element; }}
                    onFocus={() => setThemeMenuIndex(index)}
                    onClick={() => changeTheme(option.value)}
                  >
                    <Icon name={option.icon} size={15} />
                    <span>{option.label}</span>
                    {themeMode === option.value && <Icon className="theme-option-check" name="check" size={15} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="notification-wrap">
              <button className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setAccountMenuOpen(false); setThemeMenuOpen(false); setNotificationsOpen((open) => !open); }}><Icon name="bell" size={17} /><span className="notification-dot" /></button>
              <div className={`notification-popover ${notificationsOpen ? "is-open" : ""}`} role="status" aria-hidden={!notificationsOpen}><strong>No live notifications</strong><span>Alerts are unavailable in this demo workspace.</span></div>
            </div>
            <span className="topbar-divider" />
            <span className={`api-indicator ${health}`} title={healthMessage || "Local API health"}><span className="live-dot" />API {health === "online" ? "connected" : health === "checking" ? "checking" : "offline"}</span>
          </div>
        </header>

        {preferenceWarning && <div className="preference-warning" role="status">{preferenceWarning}</div>}
        <main className="main-content" id="main-content" data-scroll-target tabIndex={-1}>
          {health === "offline" && (
            <div className="api-alert" role="status">
              <Icon name="alert" size={17} />
              <span><strong>API unavailable.</strong> {healthMessage} The screens below show demo data only.</span>
              <button onClick={() => { setHealth("checking"); setHealthMessage(""); setHealthAttempt((attempt) => attempt + 1); }}>Retry</button>
            </div>
          )}
          <div className="view-transition" key={page}>
            {page === "dashboard" && <Dashboard onNavigate={navigateToPage} searchResults={filteredFindings} onCreateAssessment={createAssessment} brandInput={brandInput} setBrandInput={setBrandInput} assessmentMessage={assessmentMessage} />}
            {page === "profile" && <BrandProfile profile={brandProfile} draft={profileDraft} onDraftChange={setProfileDraft} onSave={saveProfile} saved={profileSaved} />}
            {page === "social" && <SocialMonitor search={normalizedSearch} />}
            {page === "apps" && <AppMonitor search={normalizedSearch} />}
            {page === "domains" && <DomainMonitor search={normalizedSearch} />}
          </div>
          <footer className="page-footer"><span>Drishti DRP</span><span>Evidence-led brand protection · Demo interface</span></footer>
        </main>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
      {action && <div className="heading-actions">{action}</div>}
    </div>
  );
}

function DemoNotice() {
  return <div className="demo-notice"><span className="demo-mark">i</span><span><strong>Sample data</strong> — illustrative only; no live detection or monitoring has been performed.</span></div>;
}

function StatCard({ label, value, note, icon, tone = "default" }: { label: string; value: string; note: string; icon: string; tone?: string }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={17} /></span></div><strong className="stat-value">{value}</strong><p className="stat-note">{note}</p></article>;
}

function Dashboard({ onNavigate, searchResults, onCreateAssessment, brandInput, setBrandInput, assessmentMessage }: { onNavigate: (page: PageId) => void; searchResults: typeof findings; onCreateAssessment: (event: FormEvent<HTMLFormElement>) => void; brandInput: string; setBrandInput: (value: string) => void; assessmentMessage: string }) {
  return (
    <>
      <PageHeading eyebrow="SOC TELEMETRY · OVERVIEW" title="Brand protection" description="A calm, evidence-led view of your monitored brand and priority signals." action={<span className="demo-pill"><span className="live-dot" />Demo workspace</span>} />
      <DemoNotice />
      <section className="stats-grid" id="monitoring-summary" data-scroll-target aria-label="Monitoring summary">
        <StatCard label="Monitored brands" value="1" note="1 profile configured" icon="shield" />
        <StatCard label="Open findings" value="07" note="Across 3 monitoring areas" icon="search" />
        <StatCard label="High priority" value="03" note="Review is recommended" icon="alert" tone="critical" />
      </section>

      <div className="dashboard-grid">
        <section className="panel findings-panel" id="priority-findings" data-scroll-target>
          <div className="section-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Priority findings</h2></div><button className="text-button" onClick={() => onNavigate("social")}>View monitors <Icon name="arrow" size={15} /></button></div>
          <div className="finding-list">
            {searchResults.length ? searchResults.map((item) => (
              <article className="finding-row" key={item.name}>
                <span className={`severity-marker ${item.severity.toLowerCase()}`} />
                <div className="finding-main"><strong>{item.name}</strong><span>{item.channel} · {item.evidence}</span></div>
                <span className={`severity-pill ${item.severity.toLowerCase()}`}>{item.severity}</span>
                <span className="finding-age"><Icon name="clock" size={13} />{item.age}</span>
              </article>
            )) : <div className="empty-state"><Icon name="search" size={20} /><strong>No matching findings</strong><span>Try a different search term.</span></div>}
          </div>
          <div className="list-footnote"><span>Example queue · 3 of 7 sample findings</span><button className="subtle-button" onClick={() => onNavigate("domains")}>Open domain monitor <Icon name="arrow" size={14} /></button></div>
        </section>

        <section className="panel coverage-panel" id="monitoring-areas" data-scroll-target>
          <div className="section-heading"><div><p className="eyebrow">COVERAGE</p><h2>Monitoring areas</h2></div></div>
          <button className="coverage-link" onClick={() => onNavigate("social")}><span className="coverage-icon"><Icon name="users" /></span><span className="coverage-copy"><strong>Social profiles</strong><small>3 sample profiles</small></span><Icon name="arrow" size={16} /></button>
          <button className="coverage-link" onClick={() => onNavigate("apps")}><span className="coverage-icon"><Icon name="apps" /></span><span className="coverage-copy"><strong>Mobile apps</strong><small>3 sample listings</small></span><Icon name="arrow" size={16} /></button>
          <button className="coverage-link" onClick={() => onNavigate("domains")}><span className="coverage-icon"><Icon name="globe" /></span><span className="coverage-copy"><strong>Lookalike domains</strong><small>4 sample domains</small></span><Icon name="arrow" size={16} /></button>
          <div className="coverage-footer"><span className="status-check"><Icon name="check" size={13} /></span>Brand profile configured <button onClick={() => onNavigate("profile")}>Review</button></div>
        </section>
      </div>

      <section className="panel assessment-panel" id="demo-assessment" data-scroll-target>
        <div className="assessment-intro"><span className="assessment-icon"><Icon name="plus" size={20} /></span><div><h2>Explore a demo assessment</h2><p>Preview the workflow with sample data. This does not start a real scan.</p></div></div>
        <form className="assessment-form" onSubmit={onCreateAssessment}><label className="sr-only" htmlFor="assessment-brand">Brand name</label><input id="assessment-brand" value={brandInput} onChange={(event) => setBrandInput(event.target.value)} placeholder="Enter a brand or organization" /><button className="primary-button" type="submit">Prepare demo <Icon name="arrow" size={15} /></button></form>
        {assessmentMessage && <p className="inline-feedback" role="status">{assessmentMessage}</p>}
      </section>
    </>
  );
}

function BrandProfile({ profile, draft, onDraftChange, onSave, saved }: { profile: BrandProfileData; draft: BrandProfileData; onDraftChange: (draft: BrandProfileData) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; saved: boolean }) {
  return (
    <>
      <PageHeading eyebrow="BRAND CONFIGURATION · PROFILE" title="Brand profile" description="Manage the official identifiers used to contextualize potential impersonation signals." action={<span className="demo-pill"><span className="live-dot" />Profile preview</span>} />
      <DemoNotice />
      <form onSubmit={onSave} className="profile-layout">
        <section className="panel profile-panel">
          <div className="section-heading"><div><p className="eyebrow">CORE IDENTITY</p><h2>Brand details</h2></div><span className="quiet-badge">Local preview</span></div>
          <label className="field-label" htmlFor="brand-name">Brand or legal trading name</label>
          <input id="brand-name" className="form-control" value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} required pattern=".*\S.*" title="Enter a brand name with at least one non-space character." />
          <div className="form-two-column"><div><label className="field-label" htmlFor="industry">Industry</label><select id="industry" className="form-control" value={draft.industry} onChange={(event) => onDraftChange({ ...draft, industry: event.target.value })}><option>Fintech &amp; digital banking</option><option>Retail</option><option>Healthcare</option><option>Other</option></select></div><div><label className="field-label" htmlFor="jurisdiction">Primary region</label><select id="jurisdiction" className="form-control" value={draft.region} onChange={(event) => onDraftChange({ ...draft, region: event.target.value })}><option>North America</option><option>Europe</option><option>Asia Pacific</option><option>Global</option></select></div></div>
          <label className="field-label" htmlFor="brand-description">Brand description</label>
          <textarea id="brand-description" className="form-control textarea" value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} rows={4} />
          <div className="field-helper">This description is used as context in the demo only.</div>
          <div className="form-divider" />
          <div className="section-heading subsection-heading"><div><p className="eyebrow">OFFICIAL WEB PRESENCE</p><h2>Verified domains</h2></div><button type="button" className="subtle-button" disabled title="Domain editing is not connected in this demo."><Icon name="plus" size={14} />Add domain</button></div>
          <div className="domain-chip"><Icon name="globe" size={16} /><span><strong>acme.example</strong><small>Primary domain · baseline</small></span><span className="verified-label"><Icon name="check" size={13} />Verified</span></div>
          <div className="domain-chip"><Icon name="globe" size={16} /><span><strong>acmefinance.example</strong><small>Allowed root domain</small></span><span className="verified-label"><Icon name="check" size={13} />Verified</span></div>
        </section>
        <section className="profile-side">
          <div className="panel side-panel">
            <div className="section-heading"><div><p className="eyebrow">SOCIAL FOOTPRINT</p><h2>Official accounts</h2></div><span className="quiet-badge">2 accounts</span></div>
            <p className="panel-description">Accounts excluded from this illustrative impersonation queue.</p>
            <div className="account-row"><span className="account-logo">X</span><span><strong>@AcmeFinancial</strong><small>X · official account</small></span><span className="verified-label">Verified</span></div>
            <div className="account-row"><span className="account-logo">in</span><span><strong>/company/acme-financial</strong><small>LinkedIn · official page</small></span><span className="verified-label">Verified</span></div>
            <button className="subtle-button full-width" type="button" disabled title="Account editing is not connected in this demo."><Icon name="plus" size={14} />Add official account</button>
          </div>
          <div className="panel side-panel">
            <div className="section-heading"><div><p className="eyebrow">VISUAL IDENTITY</p><h2>Brand assets</h2></div></div>
            <div className="asset-preview"><span className="asset-mark"><Icon name="shield" size={24} /></span><div><strong>Primary logo</strong><small>Sample asset · not analyzed</small></div></div>
            <button className="upload-placeholder" type="button" disabled title="Asset uploads are not connected in this demo."><Icon name="plus" size={16} /> Add a logo asset</button>
          </div>
          <div className="save-bar"><span>{saved ? <><Icon name="check" size={15} /> Profile updated locally</> : `Currently viewing ${profile.name}`}</span><button className="primary-button" type="submit">Save profile <Icon name="arrow" size={15} /></button></div>
        </section>
      </form>
    </>
  );
}

function SocialMonitor({ search }: { search: string }) {
  const [platform, setPlatform] = useState("All platforms");
  const [message, setMessage] = useState("");
  const visible = socialProfiles.filter((profile) => `${profile.name} ${profile.handle} ${profile.platform}`.toLowerCase().includes(search) && (platform === "All platforms" || profile.platform === platform));
  return (
    <>
      <PageHeading eyebrow="SOCIAL TELEMETRY · SAMPLE VIEW" title="Social monitor" description="Review illustrative social profiles that may be impersonating your brand." action={<button className="primary-button" onClick={() => setMessage("Demo preview only — no social platform scan was started.")}>Preview scan <Icon name="arrow" size={15} /></button>} />
      <DemoNotice />
      {message && <div className="action-feedback" role="status">{message}</div>}
      <section className="stats-grid compact-stats"><StatCard label="Sample profiles" value="03" note="Illustrative records" icon="users" /><StatCard label="High similarity" value="02" note="Requires analyst review" icon="alert" tone="critical" /><StatCard label="Connected platforms" value="0" note="No live feeds connected" icon="globe" /></section>
      <section className="panel table-panel">
        <div className="section-heading table-heading"><div><p className="eyebrow">PROFILE REVIEW</p><h2>Potential impersonations</h2></div><label className="select-filter"><span className="sr-only">Filter by platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option>All platforms</option><option>X</option><option>Instagram</option><option>LinkedIn</option></select></label></div>
        <div className="table-scroll"><table><thead><tr><th>Profile</th><th>Platform</th><th>Followers</th><th>Similarity</th><th>Review status</th></tr></thead><tbody>{visible.map((profile) => <tr key={profile.handle}><td><strong>{profile.name}</strong><small>{profile.handle}</small></td><td>{profile.platform}</td><td>{profile.followers}</td><td><span className={`similarity ${Number.parseInt(profile.similarity, 10) >= 85 ? "high" : ""}`}>{profile.similarity}</span></td><td><span className="status-badge needs-review">Needs review</span></td></tr>)}</tbody></table></div>
        {!visible.length && <div className="empty-state"><Icon name="search" size={20} /><strong>No profiles found</strong><span>Adjust the platform filter or search term.</span></div>}
        <div className="table-footer"><span>Sample data · {visible.length} of {socialProfiles.length} profiles</span><span>No social platforms are connected</span></div>
      </section>
      <section className="panel note-panel"><Icon name="alert" size={18} /><p><strong>Review before action.</strong> Similarity is an illustrative value, not a verified detection. Confirm identity and evidence before escalating.</p></section>
    </>
  );
}

function AppMonitor({ search }: { search: string }) {
  const [store, setStore] = useState("All sources");
  const [message, setMessage] = useState("");
  const visible = mobileApps.filter((app) => `${app.name} ${app.publisher} ${app.packageId} ${app.store}`.toLowerCase().includes(search) && (store === "All sources" || app.store === store));
  return (
    <>
      <PageHeading eyebrow="MOBILE TELEMETRY · SAMPLE VIEW" title="App monitor" description="Inspect example app listings and publisher details in one focused review queue." action={<button className="secondary-button" onClick={() => setMessage("Demo preview only — no app store scan was started.")}>Scan preview <Icon name="arrow" size={15} /></button>} />
      <DemoNotice />
      {message && <div className="action-feedback" role="status">{message}</div>}
      <section className="stats-grid compact-stats"><StatCard label="Sample listings" value="03" note="Across example sources" icon="apps" /><StatCard label="High priority" value="02" note="Illustrative risk labels" icon="alert" tone="critical" /><StatCard label="Stores monitored" value="0" note="No live feeds connected" icon="globe" /></section>
      <section className="panel table-panel">
        <div className="section-heading table-heading"><div><p className="eyebrow">LISTING REVIEW</p><h2>Potentially misleading apps</h2></div><label className="select-filter"><span className="sr-only">Filter by source</span><select value={store} onChange={(event) => setStore(event.target.value)}><option>All sources</option><option>Google Play</option><option>APK mirror</option><option>Third-party store</option></select></label></div>
        <div className="table-scroll"><table><thead><tr><th>App listing</th><th>Publisher</th><th>Source</th><th>Package ID</th><th>Sample risk</th></tr></thead><tbody>{visible.map((app) => <tr key={app.packageId}><td><strong>{app.name}</strong><small>Unverified listing</small></td><td>{app.publisher}</td><td>{app.store}</td><td><code className="package-id">{app.packageId}</code></td><td><span className={`severity-pill ${app.risk.toLowerCase()}`}>{app.risk}</span></td></tr>)}</tbody></table></div>
        {!visible.length && <div className="empty-state"><Icon name="search" size={20} /><strong>No app listings found</strong><span>Adjust the source filter or search term.</span></div>}
        <div className="table-footer"><span>Sample data · {visible.length} of {mobileApps.length} listings</span><span>Store integrations are not connected</span></div>
      </section>
    </>
  );
}

function DomainMonitor({ search }: { search: string }) {
  const [message, setMessage] = useState("");
  const visible = domains.filter((domain) => `${domain.domain} ${domain.vector} ${domain.registrar}`.toLowerCase().includes(search));
  return (
    <>
      <PageHeading eyebrow="DOMAIN TELEMETRY · SAMPLE VIEW" title="Lookalike domains" description="Review example domain variations and the signals that may warrant investigation." action={<button className="primary-button" onClick={() => setMessage("Demo preview only — no domain discovery was started.")}>Discover preview <Icon name="arrow" size={15} /></button>} />
      <DemoNotice />
      {message && <div className="action-feedback" role="status">{message}</div>}
      <section className="stats-grid compact-stats"><StatCard label="Sample domains" value="04" note="Illustrative records" icon="globe" /><StatCard label="Active examples" value="02" note="Not a live DNS result" icon="alert" tone="critical" /><StatCard label="New this week" value="01" note="Example timeline" icon="clock" /></section>
      <section className="panel table-panel">
        <div className="section-heading table-heading"><div><p className="eyebrow">DOMAIN REVIEW</p><h2>Observed variations</h2></div><span className="quiet-badge">Example dataset</span></div>
        <div className="table-scroll"><table><thead><tr><th>Domain</th><th>Variation type</th><th>Registrar</th><th>Example score</th><th>Sample status</th></tr></thead><tbody>{visible.map((domain) => <tr key={domain.domain}><td><strong className="domain-name">{domain.domain}</strong><small>First seen · today</small></td><td>{domain.vector}</td><td>{domain.registrar}</td><td><span className={`score ${domain.score >= 90 ? "high" : ""}`}>{domain.score}<small>/100</small></span></td><td><span className={`status-badge ${domain.status === "Active" ? "active-status" : ""}`}>{domain.status}</span></td></tr>)}</tbody></table></div>
        {!visible.length && <div className="empty-state"><Icon name="search" size={20} /><strong>No domains found</strong><span>Try another domain, registrar, or variation type.</span></div>}
        <div className="table-footer"><span>Sample data · {visible.length} of {domains.length} domains</span><span>DNS and registration checks are not running</span></div>
      </section>
      <section className="panel note-panel"><Icon name="alert" size={18} /><p><strong>Risk scores are examples.</strong> No DNS, registrar, or web-content checks have been performed for these domains.</p></section>
    </>
  );
}

export default App;
