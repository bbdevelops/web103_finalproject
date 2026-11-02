import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon } from "./Icon.jsx";

export function Layout() {
  const [user, setUser] = useState(null);
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-shell">
          <Link to="/" className="brand" aria-label="SkillForge home">
            <span className="brand-mark">
              <Icon name="bolt" size={24} />
            </span>
            Skill<span>Forge</span>
            <span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              <Icon name="branch" size={16} /> Skill trees
            </NavLink>
            <NavLink to="/dashboard">
              <Icon name="clock" size={16} /> Dashboard
            </NavLink>
          </nav>
          <div className="account">
            <span className="demo-label">DEMO WORKSPACE</span>
            <span className="avatar" aria-hidden="true">
              {user ? "AC" : "SF"}
            </span>
            <span className="account-name">
              {user?.display_name ?? "Explorer"}
            </span>
          </div>
        </div>
      </header>
      <main id="main" className="main-shell" tabIndex={-1}>
        <Outlet context={{ user, setUser }} />
      </main>
      <footer className="site-footer">
        <span>Small quests. Real progress.</span>
        <span>
          SKILLFORGE <span className="footer-spark">✦</span> BUILT FOR
          DEVELOPERS
        </span>
      </footer>
    </>
  );
}
