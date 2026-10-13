import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppIdentity } from "./components/AppIdentity";
import { Icon } from "./components/Icon";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { AppContextProvider } from "./context/AppContextProvider";
import { useApiHealth } from "./hooks/useApiHealth";
import { AuthScreen, AppMonitor, BrandProfile, Dashboard, DomainMonitor, SocialMonitor } from "./pages/Pages";
import { NotFoundPage } from "./pages/NotFoundPage";
import { createDetectionProfile, forgetActiveProfile, getActiveProfileId, loadDetectionProfile, storeActiveProfileId } from "./services/api";
import { authenticate, getCurrentUser, isUnauthorized, revokeSession } from "./services/auth";
import { getApiErrorMessage, isNotFound } from "./services/http";
import type { AuthFormValues, AuthMode, AuthUser, BrandProfileData, PageId, ProfileExtras, ThemeMode } from "./types";
import { findings, initialProfile, initialProfileExtras, navigation } from "./utils/demoData";
import { fromDetectionProfile, toDetectionProfile } from "./utils/profile";
import { pageFromPath, routeByPage } from "./utils/routes";
import "./App.css";

function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem("brandshield-session");
    } catch {
      return null;
    }
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authScreenOpen, setAuthScreenOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
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
  const [healthAttempt, setHealthAttempt] = useState(0);
  const { health, message: healthMessage, retry: retryApiHealth } = useApiHealth(healthAttempt);
  const [search, setSearch] = useState("");
  const [assessmentMessage, setAssessmentMessage] = useState("");
  const [brandProfile, setBrandProfile] = useState(initialProfile);
  const [profileDraft, setProfileDraft] = useState(initialProfile);
  const [profileExtras, setProfileExtras] = useState<ProfileExtras>(initialProfileExtras);
  const [profileApiMessage, setProfileApiMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(() => getActiveProfileId() !== null);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [detectionProfileId, setDetectionProfileId] = useState<string | null>(() => getActiveProfileId());
  const [brandInput, setBrandInput] = useState(initialProfile.name);
  const [profileSaved, setProfileSaved] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [themeMenuIndex, setThemeMenuIndex] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuIndex, setAccountMenuIndex] = useState(0);
  const location = useLocation();
  const routerNavigate = useNavigate();
  const page = pageFromPath(location.pathname);
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

    if (!authToken) {
      return () => controller.abort();
    }

    getCurrentUser(authToken, controller.signal)
      .then((user) => {
        setAuthUser(user);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAuthToken(null);
        setAuthUser(null);
        setAuthMessage(getApiErrorMessage(error, "Could not verify your login."));
        try {
          window.sessionStorage.removeItem("brandshield-session");
        } catch {
          setAuthMessage("Could not clear the expired session from this browser. Please sign in again.");
        }
      });

    return () => controller.abort();
  }, [authToken]);

  useEffect(() => {
    if (!detectionProfileId) {
      return;
    }
    const controller = new AbortController();
    loadDetectionProfile(detectionProfileId, controller.signal)
      .then((profile) => {
        if (controller.signal.aborted) return;
        const mapped = fromDetectionProfile(profile);
        setBrandProfile(mapped.brand);
        setProfileDraft(mapped.brand);
        setBrandInput(mapped.brand.name);
        setProfileExtras(mapped.extras);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isNotFound(error)) {
          setProfileApiMessage("The saved brand profile was not found. Create and save a profile to continue.");
          setProfileLoadError(false);
          forgetActiveProfile();
          setDetectionProfileId(null);
          return;
        }
        setProfileApiMessage(getApiErrorMessage(error, "Could not load the saved detection profile."));
        setProfileLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfileLoading(false);
      });

    return () => controller.abort();
  }, [detectionProfileId, profileLoadAttempt]);

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
  }, [location.pathname]);

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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = profileDraft.name.trim();
    if (!name) return;
    const updatedProfile = { ...profileDraft, name };
    setProfileSaving(true);
    setProfileApiMessage("");
    try {
      const saved = await createDetectionProfile(toDetectionProfile(updatedProfile, profileExtras));
      const savedProfile = {
        name: saved.brand_name,
        industry: saved.industry,
        region: saved.region,
        description: saved.description,
      };
      setBrandProfile(savedProfile);
      setProfileDraft(savedProfile);
      setBrandInput(saved.brand_name);
      const mapped = fromDetectionProfile(saved);
      const idPersisted = storeActiveProfileId(saved.id);
      setDetectionProfileId(saved.id);
      setProfileExtras(mapped.extras);
      setProfileSaved(true);
      setProfileApiMessage(idPersisted
        ? "Brand profile saved. Detection runs will use this profile."
        : `Profile created, but browser storage is unavailable. It will work until refresh; save this profile ID: ${saved.id}`);
      setProfileLoadError(false);
      window.setTimeout(() => setProfileSaved(false), 3000);
    } catch (error: unknown) {
      setProfileApiMessage(getApiErrorMessage(error, "Could not create brand profile. Check the API connection and try again."));
    } finally {
      setProfileSaving(false);
    }
  }

  function updateProfileExtras(extras: ProfileExtras) {
    setProfileExtras(extras);
    setProfileSaved(false);
    setProfileApiMessage("Unsaved changes. Select Save profile to persist them to the backend.");
  }

  function updateProfileDraft(draft: BrandProfileData) {
    setProfileDraft(draft);
    setProfileSaved(false);
    setProfileApiMessage("Unsaved changes. Select Save profile to persist them to the backend.");
  }

  async function submitAuthentication(mode: AuthMode, values: AuthFormValues) {
    setAuthSubmitting(true);
    setAuthMessage("");
    try {
      const session = await authenticate(mode, values);
      try {
        window.sessionStorage.setItem("brandshield-session", session.access_token);
      } catch {
        throw new Error("This browser could not store the sign-in session. Enable session storage and try again.");
      }
      setAuthToken(session.access_token);
      setAuthUser(session.user);
      setAuthScreenOpen(false);
      routerNavigate("/");
    } catch (error: unknown) {
      setAuthMessage(getApiErrorMessage(error, "Could not sign in."));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function signOut() {
    setAccountMenuOpen(false);
    let signOutMessage = "";
    if (authToken) {
      try {
        await revokeSession(authToken);
      } catch (error: unknown) {
        if (!isUnauthorized(error)) {
          signOutMessage = getApiErrorMessage(error, "The server could not be reached. This browser session has still been cleared.");
        }
      }
    }
    try {
      window.sessionStorage.removeItem("brandshield-session");
    } catch {
      signOutMessage = "The session could not be cleared from browser storage. Close this browser tab to end it.";
    }
    setAuthToken(null);
    setAuthUser(null);
    setAuthScreenOpen(false);
    setAuthMode("login");
    setAuthMessage(signOutMessage);
    routerNavigate("/");
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
    routerNavigate(routeByPage[nextPage]);
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

  const currentUser = authUser
    ? {
        name: authUser.display_name,
        initials: authUser.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
        role: authUser.email,
      }
    : { name: "Guest", initials: "GU", role: "Sign in to save your profile" };

  if (authScreenOpen) {
    return (
      <AuthScreen
        mode={authMode}
        message={authMessage}
        submitting={authSubmitting}
        onModeChange={(mode) => { setAuthMode(mode); setAuthMessage(""); }}
        onSubmit={submitAuthentication}
        onClose={() => {
          setAuthScreenOpen(false);
          setAuthMessage("");
          routerNavigate("/");
        }}
      />
    );
  }

  return (
    <AppContextProvider value={currentUser}>
    <Layout className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileNavOpen ? "mobile-nav-open" : ""}`} onPointerMove={handleCardPointerMove} onPointerLeave={clearCardPointer}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <button className={`mobile-nav-backdrop ${mobileNavOpen ? "is-visible" : ""}`} aria-label="Close navigation" tabIndex={mobileNavOpen ? 0 : -1} aria-hidden={!mobileNavOpen} onClick={() => { setMobileNavOpen(false); setAccountMenuOpen(false); }} />
      <Sidebar className={`sidebar ${mobileNavOpen ? "is-mobile-open" : ""}`} aria-label="Primary navigation" id="primary-navigation">
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
            aria-label={`Account menu - ${currentUser.name}`}
            title={`Account menu - ${currentUser.name}`}
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
            <AppIdentity />
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
              <AppIdentity />
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
            {authUser
              ? <button className="theme-option account-menu-item account-menu-signout subtle-button" type="button" role="menuitem" tabIndex={accountMenuOpen && accountMenuIndex === 5 ? 0 : -1} ref={(element) => { accountMenuItemRefs.current[5] = element; }} onFocus={() => setAccountMenuIndex(5)} onClick={() => void signOut()}>Sign out</button>
              : <button className="theme-option account-menu-item account-menu-login" type="button" role="menuitem" tabIndex={accountMenuOpen && accountMenuIndex === 5 ? 0 : -1} ref={(element) => { accountMenuItemRefs.current[5] = element; }} onFocus={() => setAccountMenuIndex(5)} onClick={() => { setAccountMenuOpen(false); setAuthMode("login"); setAuthMessage(""); setAuthScreenOpen(true); }}>Sign in / Log in</button>}
          </div>
        </div>
      </Sidebar>

      <div className="workspace">
        <Topbar className="topbar">
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
        </Topbar>

        {preferenceWarning && <div className="preference-warning" role="status">{preferenceWarning}</div>}
        <main className="main-content" id="main-content" data-scroll-target tabIndex={-1}>
          {health === "offline" && (
            <div className="api-alert" role="status">
              <Icon name="alert" size={17} />
              <span><strong>API unavailable.</strong> {healthMessage} The screens below show demo data only.</span>
              <button onClick={() => { retryApiHealth(); setHealthAttempt((attempt) => attempt + 1); }}>Retry</button>
            </div>
          )}
          <div className="view-transition" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Dashboard onNavigate={navigateToPage} searchResults={filteredFindings} onCreateAssessment={createAssessment} brandInput={brandInput} setBrandInput={setBrandInput} assessmentMessage={assessmentMessage} profileId={detectionProfileId} />} />
              <Route path="/profile" element={<BrandProfile profile={brandProfile} draft={profileDraft} onDraftChange={updateProfileDraft} onSave={saveProfile} saved={profileSaved} extras={profileExtras} onExtrasChange={updateProfileExtras} apiMessage={profileApiMessage} loading={profileLoading} saving={profileSaving} loadError={profileLoadError} onRetryLoad={() => { setProfileLoading(true); setProfileLoadError(false); setProfileLoadAttempt((attempt) => attempt + 1); }} />} />
              <Route path="/social" element={<SocialMonitor search={normalizedSearch} profileId={detectionProfileId} />} />
              <Route path="/apps" element={<AppMonitor search={normalizedSearch} profileId={detectionProfileId} />} />
              <Route path="/domains" element={<DomainMonitor search={normalizedSearch} profileId={detectionProfileId} />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <footer className="page-footer"><span>Drishti DRP</span><span>Evidence-led brand protection · Demo interface</span></footer>
        </main>
      </div>
    </Layout>
    </AppContextProvider>
  );
}

export default App;
