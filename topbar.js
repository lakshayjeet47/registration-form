// Update these two values only to change toolbar content on all pages.
const TOPBAR_CONFIG = {
  logoSrc: "logo.png",
  organizerName: "Aavi Sports Club"
};

function ensureTopbarStyles() {
  if (document.getElementById("shared-topbar-style")) return;

  const style = document.createElement("style");
  style.id = "shared-topbar-style";
  style.textContent = `
    .shared-topbar {
      width: 100%;
      background: linear-gradient(135deg, #0f2f56, #2b8bd3);
      color: #ffffff;
      border-bottom: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 4px 14px rgba(15, 47, 86, 0.18);
    }

    .shared-topbar-inner {
      max-width: 1080px;
      margin: 0 auto;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .shared-topbar-logo {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.45);
      background: rgba(255, 255, 255, 0.14);
      flex: 0 0 auto;
    }

    .shared-topbar-title {
      margin: 0;
      font-size: 1.04rem;
      font-weight: 700;
      letter-spacing: 0.2px;
      line-height: 1.25;
    }

    @media (max-width: 600px) {
      .shared-topbar-inner {
        padding: 8px 10px;
        gap: 10px;
      }

      .shared-topbar-logo {
        width: 38px;
        height: 38px;
        border-radius: 8px;
      }

      .shared-topbar-title {
        font-size: 0.95rem;
      }
    }
  `;

  document.head.appendChild(style);
}

function renderSharedTopbar() {
  const mountPoint = document.getElementById("sharedTopbar");
  if (!mountPoint) return;

  ensureTopbarStyles();

  mountPoint.innerHTML = `
    <header class="shared-topbar" role="banner" aria-label="Event toolbar">
      <div class="shared-topbar-inner">
        <img class="shared-topbar-logo" src="${TOPBAR_CONFIG.logoSrc}" alt="Event logo">
        <h1 class="shared-topbar-title">${TOPBAR_CONFIG.organizerName}</h1>
      </div>
    </header>
  `;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderSharedTopbar);
} else {
  renderSharedTopbar();
}
