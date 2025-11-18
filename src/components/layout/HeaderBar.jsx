import React from "react";

export default function HeaderBar({ subtitle, themeMode = "dark", onToggleTheme }) {
  const buttonLabel = themeMode === "dark" ? "Light mode" : "Dark mode";

  return (
    <div className="header-bar">
      <div>
        <div className="header-title">US Energy & Emissions Monitor</div>
        <div className="header-subtitle">{subtitle}</div>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-pressed={themeMode === "light"}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
