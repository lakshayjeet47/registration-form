const SCHEDULE_API_URL = "https://script.google.com/macros/s/AKfycbwqaWV1iR0qpK-W11VoLrRvW0COBYideifXzkaNinI6Wyfvbi_s527mRKA7wGZ33rzAqw/exec";

const scheduleHint = document.getElementById("scheduleHint");
const scheduleList = document.getElementById("scheduleList");

let loadingTimer = null;

function buildApiUrl(baseUrl, extraParams) {
  const url = new URL(baseUrl);
  Object.keys(extraParams).forEach((key) => {
    url.searchParams.set(key, extraParams[key]);
  });
  return url.toString();
}

function pickField(obj, candidates) {
  if (!obj || typeof obj !== "object") return "";

  function normalizeKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  const keyMap = {};
  Object.keys(obj).forEach((key) => {
    keyMap[normalizeKey(key)] = key;
  });

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const realKey = keyMap[normalized];
    if (realKey && obj[realKey] !== undefined && obj[realKey] !== null) {
      return String(obj[realKey]).trim();
    }
  }

  return "";
}

function looksLikeDate(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(text) || /\d{4}-\d{1,2}-\d{1,2}/.test(text);
}

async function fetchJson(url) {
  const response = await fetch(buildApiUrl(url, {
    view: "schedule",
    t: Date.now().toString()
  }), {
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
    throw new Error("API did not return valid JSON");
  }

  if (!parsed || !parsed.ok || !Array.isArray(parsed.data)) {
    throw new Error((parsed && parsed.error) || "Invalid API payload");
  }

  return parsed.data;
}

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `scheduleCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, 12000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
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
      reject(new Error("Unable to load schedule data script"));
    };

    script.src = buildApiUrl(url, {
      view: "schedule",
      callback: callbackName,
      t: Date.now().toString()
    });

    document.head.appendChild(script);
  });
}

function normalizeSchedule(rawRows) {
  if (!Array.isArray(rawRows)) return [];

  return rawRows
    .map((row) => {
      const matchNo = pickField(row, ["Match No", "Match Number", "match no", "match", "matchNo"]);
      let playerOne = pickField(row, ["Player One", "player one", "playerOne", "P1"]);
      let playerTwo = pickField(row, ["Player Two", "player two", "playerTwo", "P2"]);
      let winner = pickField(row, ["Winner", "winner"]);
      let status = pickField(row, ["Status", "status"]);
      let date = pickField(row, ["Date", "date", "matchDate", "match date"]);

      // Some deployments return shifted schedule fields.
      if (!looksLikeDate(date) && looksLikeDate(status)) {
        const shifted = {
          playerOne,
          playerTwo,
          winner,
          status,
          date
        };

        playerOne = shifted.date || shifted.playerOne;
        playerTwo = shifted.playerOne || shifted.playerTwo;
        winner = shifted.playerTwo || "";
        status = shifted.winner || shifted.status;
        date = shifted.status || shifted.date;
      }

      if (!matchNo && !playerOne && !playerTwo && !winner && !status && !date) {
        return null;
      }

      return {
        matchNo: matchNo || "-",
        playerOne: playerOne || "TBD",
        playerTwo: playerTwo || "TBD",
        winner: winner || "Pending",
        status: status || "Upcoming",
        date: date || "TBD"
      };
    })
    .filter(Boolean);
}

function renderLoading() {
  if (!scheduleList) return;

  stopLoadingAnimation();

  scheduleList.innerHTML = "";
  const item = document.createElement("li");
  item.className = "schedule-item loading-item";
  item.textContent = "Getting match schedule";
  scheduleList.appendChild(item);

  const dots = [".", "..", "..."];
  let index = 0;

  loadingTimer = setInterval(() => {
    const suffix = dots[index];
    index = (index + 1) % dots.length;
    item.textContent = `Getting match schedule${suffix}`;
    if (scheduleHint) scheduleHint.textContent = `Getting match schedule${suffix}`;
  }, 420);
}

function stopLoadingAnimation() {
  if (!loadingTimer) return;
  clearInterval(loadingTimer);
  loadingTimer = null;
}

function renderSchedule(rows) {
  if (!scheduleList) return;

  scheduleList.innerHTML = "";

  if (!rows.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "schedule-item";
    emptyItem.textContent = "No match schedule yet.";
    scheduleList.appendChild(emptyItem);
    if (scheduleHint) scheduleHint.textContent = "No matches scheduled yet";
    return;
  }

  if (scheduleHint) scheduleHint.textContent = `Total Matches: ${rows.length}`;

  rows.forEach((row) => {
    const item = document.createElement("li");
    item.className = "schedule-item";

    item.innerHTML = `
      <div class="schedule-top">
        <span class="badge">Match ${row.matchNo}</span>
        <span class="badge status-badge">${row.status}</span>
      </div>
      <div class="vs-row">${row.playerOne} vs ${row.playerTwo}</div>
      <div class="schedule-meta">
        <div><strong>Date:</strong> ${row.date}</div>
        <div><strong>Winner:</strong> ${row.winner}</div>
      </div>
    `;

    scheduleList.appendChild(item);
  });
}

async function loadSchedule() {
  try {
    renderLoading();

    let rows;
    try {
      rows = await fetchJson(SCHEDULE_API_URL);
    } catch (err) {
      rows = await fetchJsonp(SCHEDULE_API_URL);
    }

    stopLoadingAnimation();
    renderSchedule(normalizeSchedule(rows));
  } catch (error) {
    stopLoadingAnimation();
    renderSchedule([]);
    if (scheduleHint) {
      scheduleHint.textContent = "Unable to load schedule right now";
    }
  }
}

window.addEventListener("load", loadSchedule);
