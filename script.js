// Local form → Google Form flow
// Replace FORM_ID if different. Default taken from your earlier embedded URL.
const FORM_ID = '1FAIpQLSd1ukTs9_kk-qXLkrCWmQXovH2zbTMfcreLjkNZHJ8PaL8G_g';
const FORM_ACTION = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

const form = document.getElementById('regForm');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const modalOk = document.getElementById('modal-ok');
// const status = document.getElementById('status');
const iframe = document.getElementById('submitFrame');
const termsCheckbox = document.getElementById('termsCheckbox');
const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

function syncSubmitButtonState() {
  if (!submitBtn) return;

  // While sending, keep button locked regardless of checkbox state.
  if (form && form._isSubmitting) {
    submitBtn.disabled = true;
    return;
  }

  submitBtn.disabled = !(termsCheckbox && termsCheckbox.checked);
}

// ensure form clears when the page is (re)loaded
window.addEventListener('DOMContentLoaded', () => {
  if (form) form.reset();
  syncSubmitButtonState();
});

if (form) {
  form.action = FORM_ACTION;

  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', syncSubmitButtonState);
  }

  form.addEventListener('reset', () => {
    // Reset updates control state after the event tick.
    setTimeout(syncSubmitButtonState, 0);
  });

  form.addEventListener('submit', (e) => {
    // Check if terms and conditions checkbox is checked
    if (termsCheckbox && !termsCheckbox.checked) {
      e.preventDefault();
      showModal('Please read and agree to the Terms and Conditions to continue.');
      syncSubmitButtonState();
      return;
    }

    // mark submitting so iframe load handler ignores page refreshes
    form._isSubmitting = true;

    // disable submit to prevent duplicates and provide immediate feedback on the button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.origText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
    }

    // start a timeout to detect failures (network or blocked requests)
    form._submitTimeout = setTimeout(() => {
      // show error modal on timeout
      showModal('Submission timed out — please try again.');
      form._isSubmitting = false;
      if (submitBtn) {
        submitBtn.textContent = submitBtn.dataset.origText || 'Submit Registration';
      }
      syncSubmitButtonState();
    }, 10000); // 10s timeout

    // allow the form to post to the hidden iframe — the response will load there
  });
}

// When the hidden iframe loads after form POST, signal success.
if (iframe) {
  iframe.addEventListener('load', () => {
    // only handle if we triggered a submission
    if (!(form && form._isSubmitting)) return;

    // clear the timeout (if any) and show success modal
    if (form && form._submitTimeout) {
      clearTimeout(form._submitTimeout);
      form._submitTimeout = null;
    }

    showModal('Registration submitted successfully.');
    if (form) {
      form.reset();
      form._isSubmitting = false;
    }
    if (submitBtn) {
      submitBtn.textContent = submitBtn.dataset.origText || 'Submit Registration';
    }
    syncSubmitButtonState();

    // Refresh list after submit so latest registrations appear without manual reload.
    setTimeout(() => {
      loadPlayers();
    }, 1500);
  });

  // Some browsers may fire error on iframe load failure; add a conservative timeout handler above.
}

// Notes: You MUST update the input `name` attributes in `index.html` to the real
// Google Form entry IDs like `entry.123456789` for each field (see README).

// Modal helpers
function showModal(message) {
  if (!modal) return;
  if (modalMessage) modalMessage.textContent = message;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

function hideModal() {
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

if (modalOk) {
  modalOk.addEventListener('click', () => {
    hideModal();
  });
}
// ===============================
// Registered Players List from Google Sheet
// ===============================

const maleList = document.getElementById("maleList");
const femaleList = document.getElementById("femaleList");
const playersHint = document.getElementById("playersHint");
const openBoysBtn = document.getElementById("openBoys");
const openGirlsBtn = document.getElementById("openGirls");
const listModal = document.getElementById("listModal");
const listModalTitle = document.getElementById("listModalTitle");
const listModalInfo = document.getElementById("listModalInfo");
const modalList = document.getElementById("modalList");
const modalBack = document.getElementById("modalBack");
const modalClose = document.getElementById("modalClose");
const listScrollTimers = new WeakMap();
const latestPlayersState = { boys: [], girls: [] };
let playersLoadingTimer = null;

// Web App URL to fetch players from Google Sheet
const PLAYERS_API_URL = "https://script.google.com/macros/s/AKfycbwMnyedOrUw1oZ2dGeonsdC5vbinEa0cy2F4nTuwZptzRwYK4hK6z0EWjk0kEoC_hm-AQ/exec";

function buildApiUrl(baseUrl, extraParams) {
  const url = new URL(baseUrl);
  Object.keys(extraParams).forEach((key) => {
    url.searchParams.set(key, extraParams[key]);
  });
  return url.toString();
}

async function fetchPlayersJson(url) {
  const response = await fetch(buildApiUrl(url, { t: Date.now().toString() }), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const raw = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error("API did not return valid JSON. Check Apps Script deployment access.");
  }

  if (!parsed || !parsed.ok || !Array.isArray(parsed.data)) {
    const message = (parsed && parsed.error) ? parsed.error : "Invalid API payload";
    throw new Error(message);
  }

  return parsed.data;
}

function fetchPlayersJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `playersCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, 12000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = (payload) => {
      cleanup();
      if (!payload || !payload.ok || !Array.isArray(payload.data)) {
        reject(new Error((payload && payload.error) || "Invalid JSONP payload"));
        return;
      }
      resolve(payload.data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to load player data script"));
    };

    script.src = buildApiUrl(url, {
      callback: callbackName,
      t: Date.now().toString()
    });
    document.head.appendChild(script);
  });
}

function pickField(obj, candidates) {
  if (!obj || typeof obj !== "object") return "";

  const keyMap = {};
  Object.keys(obj).forEach((k) => {
    keyMap[k.trim().toLowerCase()] = k;
  });

  for (const candidate of candidates) {
    const key = keyMap[candidate.trim().toLowerCase()];
    if (key && obj[key] !== undefined && obj[key] !== null) {
      return String(obj[key]).trim();
    }
  }

  return "";
}

function normalizeGender(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "male" || raw === "m" || raw === "boy" || raw === "boys") return "male";
  if (raw === "female" || raw === "f" || raw === "girl" || raw === "girls") return "female";
  return "other";
}

function sanitizePlayers(rawPlayers) {
  if (!Array.isArray(rawPlayers)) return [];

  return rawPlayers
    .map((player) => {
      const name = pickField(player, ["PLAYER NAME", "Player Name", "player name", "name"]);
      const normalizedGender = normalizeGender(
        pickField(player, ["GENDER", "Gender", "gender", "sex"])
      );

      if (!name || (normalizedGender !== "male" && normalizedGender !== "female")) {
        return null;
      }

      // Keep only public-safe fields for UI.
      return {
        "PLAYER NAME": name,
        "GENDER": normalizedGender
      };
    })
    .filter(Boolean);
}

function startAutoScroll(listEl) {
  if (!listEl) return;

  const existingTimer = listScrollTimers.get(listEl);
  if (existingTimer) {
    clearInterval(existingTimer);
    listScrollTimers.delete(listEl);
  }

  listEl.scrollTop = 0;

  if (listEl.scrollHeight <= listEl.clientHeight + 4) {
    return;
  }

  if (!listEl.dataset.hoverPauseBound) {
    listEl.dataset.hoverPauseBound = "1";
    listEl.addEventListener("mouseenter", () => {
      listEl.dataset.paused = "1";
    });
    listEl.addEventListener("mouseleave", () => {
      listEl.dataset.paused = "0";
    });
  }

  const timer = setInterval(() => {
    if (listEl.dataset.paused === "1") return;
    const nearBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 1;
    listEl.scrollTop = nearBottom ? 0 : listEl.scrollTop + 1;
  }, 65);

  listScrollTimers.set(listEl, timer);
}

function openMobileList(type) {
  if (!listModal || !modalList || !listModalTitle) return;

  const isBoys = type === "boys";
  const names = isBoys ? latestPlayersState.boys : latestPlayersState.girls;
  listModalTitle.textContent = isBoys ? "Boys Players" : "Girls Players";
  if (listModalInfo) {
    listModalInfo.textContent = isBoys
      ? `These boys are registered for now. Total: ${names.length}`
      : `These girls are registered for now. Total: ${names.length}`;
  }
  modalList.innerHTML = "";

  if (!names.length) {
    const li = document.createElement("li");
    li.textContent = "No registrations yet";
    li.style.color = "#999";
    modalList.appendChild(li);
  } else {
    names.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      modalList.appendChild(li);
    });
  }

  listModal.classList.add("show");
  listModal.setAttribute("aria-hidden", "false");
}

function closeMobileList() {
  if (!listModal) return;
  listModal.classList.remove("show");
  listModal.setAttribute("aria-hidden", "true");
}

function displayPlayers(playersList) {
  if (!maleList || !femaleList) return;

  // Clear existing lists
  maleList.innerHTML = "";
  femaleList.innerHTML = "";

  // Filter players by gender
  const boys = playersList.filter(p => {
    const gender = pickField(p, ["gender", "GENDER", "Gender"]);
    return normalizeGender(gender) === "male";
  });
  const girls = playersList.filter(p => {
    const gender = pickField(p, ["gender", "GENDER", "Gender"]);
    return normalizeGender(gender) === "female";
  });

  // Show count
  if (playersHint) {
    playersHint.textContent = `Total: ${playersList.length} | Boys: ${boys.length} | Girls: ${girls.length}`;
  }

  latestPlayersState.boys = boys
    .map((player) => pickField(player, ["PLAYER NAME", "Player Name", "player name"]))
    .filter(Boolean);
  latestPlayersState.girls = girls
    .map((player) => pickField(player, ["PLAYER NAME", "Player Name", "player name"]))
    .filter(Boolean);

  // Display boys
  if (boys.length > 0) {
    boys.forEach(player => {
      const name = pickField(player, ["PLAYER NAME", "Player Name", "player name"]) || "Unknown";
      const li = document.createElement("li");
      li.textContent = name;
      maleList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No registrations yet";
    li.style.color = "#999";
    maleList.appendChild(li);
  }

  // Display girls
  if (girls.length > 0) {
    girls.forEach(player => {
      const name = pickField(player, ["PLAYER NAME", "Player Name", "player name"]) || "Unknown";
      const li = document.createElement("li");
      li.textContent = name;
      femaleList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No registrations yet";
    li.style.color = "#999";
    femaleList.appendChild(li);
  }

  // Create a slow continuous scroll effect for transparency board style display.
  startAutoScroll(maleList);
  startAutoScroll(femaleList);
}

function stopPlayersLoadingAnimation() {
  if (!playersLoadingTimer) return;
  clearInterval(playersLoadingTimer);
  playersLoadingTimer = null;
}

function showPlayersLoadingState() {
  if (!maleList || !femaleList) return;

  stopPlayersLoadingAnimation();
  latestPlayersState.boys = [];
  latestPlayersState.girls = [];
  maleList.innerHTML = "";
  femaleList.innerHTML = "";

  const maleLoadingItem = document.createElement("li");
  maleLoadingItem.className = "loading-item";
  maleLoadingItem.textContent = "Getting data";

  const femaleLoadingItem = document.createElement("li");
  femaleLoadingItem.className = "loading-item";
  femaleLoadingItem.textContent = "Getting data";

  maleList.appendChild(maleLoadingItem);
  femaleList.appendChild(femaleLoadingItem);

  const dots = [".", "..", "..."];
  let index = 0;
  playersLoadingTimer = setInterval(() => {
    const suffix = dots[index];
    index = (index + 1) % dots.length;
    maleLoadingItem.textContent = `Getting data${suffix}`;
    femaleLoadingItem.textContent = `Getting data${suffix}`;
    if (playersHint) playersHint.textContent = `Getting data${suffix}`;
  }, 420);
}

function showNoRegistrationsState() {
  stopPlayersLoadingAnimation();
  displayPlayers([]);
  if (playersHint) {
    playersHint.textContent = "No registration yet";
  }
}

async function loadPlayers() {
  try {
    showPlayersLoadingState();

    let players = [];
    try {
      players = await fetchPlayersJson(PLAYERS_API_URL);
    } catch (jsonErr) {
      // Fallback for Apps Script deployments that do not allow direct cross-origin fetch.
      players = await fetchPlayersJsonp(PLAYERS_API_URL);
    }

    stopPlayersLoadingAnimation();
    const safePlayers = sanitizePlayers(players);
    if (!safePlayers.length) {
      showNoRegistrationsState();
      return;
    }

    displayPlayers(safePlayers);
  } catch (error) {
    showNoRegistrationsState();
  }
}

// Load players on page open
window.addEventListener('load', () => {
  loadPlayers();
});

if (openBoysBtn) {
  openBoysBtn.addEventListener("click", () => openMobileList("boys"));
}

if (openGirlsBtn) {
  openGirlsBtn.addEventListener("click", () => openMobileList("girls"));
}

if (modalBack) {
  modalBack.addEventListener("click", closeMobileList);
}

if (modalClose) {
  modalClose.addEventListener("click", closeMobileList);
}

if (listModal) {
  listModal.addEventListener("click", (event) => {
    if (event.target === listModal) {
      closeMobileList();
    }
  });
}
