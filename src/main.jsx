import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { createRoot } from "react-dom/client";

import { supabase } from "./lib/supabase";

/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_GAME_NAME = "TambolaLive";

const GAME_KEY = "tambolalive_host_game";

const PLAYER_BOOKING_PREFIX =
  "tambolalive_player_booking_";

const THEMES = [
  "Classic",
  "Royal",
  "Party",
  "Bollywood",
  "Neon",
  "Elegant"
];

const DEFAULT_PRIZES = [
  "First Five",
  "Four Corners",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House"
].map((name) => ({
  name,
  amount: ""
}));

/* =========================================================
   BASIC HELPERS
========================================================= */

function normalizePrizeKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getPrizePattern(name) {
  const key = normalizePrizeKey(name);

  if (
    key === "first five" ||
    key === "early five" ||
    key === "early 5" ||
    key === "first 5"
  ) {
    return "first_five";
  }

  if (key === "four corners" || key === "4 corners") {
    return "four_corners";
  }

  if (key === "top line" || key === "top row") {
    return "top_line";
  }

  if (key === "middle line" || key === "middle row") {
    return "middle_line";
  }

  if (key === "bottom line" || key === "bottom row") {
    return "bottom_line";
  }

  if (
    key === "full house" ||
    key === "full ticket" ||
    key === "house"
  ) {
    return "full_house";
  }

  return null;
}

function getOccupiedCells(grid) {
  const cells = [];

  if (!Array.isArray(grid)) {
    return cells;
  }

  grid.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) return;

    row.forEach((value, columnIndex) => {
      const number = Number(value);
      if (Number.isInteger(number) && number >= 1 && number <= 90) {
        cells.push({
          number,
          row: rowIndex,
          column: columnIndex
        });
      }
    });
  });

  return cells;
}

function getWinningNumbersForPattern(grid, pattern, calledSet) {
  const occupied = getOccupiedCells(grid);

  if (!occupied.length) {
    return [];
  }

  const isCalled = (number) => calledSet.has(number);

  if (pattern === "first_five") {
    const called = occupied.filter((cell) => isCalled(cell.number));
    return called.length >= 5
      ? called.slice(0, 5).map((cell) => cell.number)
      : [];
  }

  if (pattern === "full_house") {
    return occupied.every((cell) => isCalled(cell.number))
      ? occupied.map((cell) => cell.number)
      : [];
  }

  if (
    pattern === "top_line" ||
    pattern === "middle_line" ||
    pattern === "bottom_line"
  ) {
    const rowIndex =
      pattern === "top_line"
        ? 0
        : pattern === "middle_line"
        ? 1
        : 2;

    const rowCells = occupied.filter((cell) => cell.row === rowIndex);

    return rowCells.length && rowCells.every((cell) => isCalled(cell.number))
      ? rowCells.map((cell) => cell.number)
      : [];
  }

  if (pattern === "four_corners") {
    const top = occupied
      .filter((cell) => cell.row === 0)
      .sort((a, b) => a.column - b.column);
    const bottom = occupied
      .filter((cell) => cell.row === 2)
      .sort((a, b) => a.column - b.column);

    if (top.length < 2 || bottom.length < 2) {
      return [];
    }

    const corners = [
      top[0],
      top[top.length - 1],
      bottom[0],
      bottom[bottom.length - 1]
    ];

    return corners.every((cell) => isCalled(cell.number))
      ? corners.map((cell) => cell.number)
      : [];
  }

  return [];
}

function findPrizeWinners(prize, acceptedBookings, calledNumbers, winningNumber, gameCode) {
  const pattern = getPrizePattern(prize?.name);
  if (!pattern || prize?.locked) {
    return [];
  }

  const calledSet = new Set(
    Array.isArray(calledNumbers)
      ? calledNumbers.map(Number)
      : []
  );

  const winners = [];

  acceptedBookings.forEach((booking) => {
    const ticketNumbers = Array.isArray(booking.ticket_numbers)
      ? booking.ticket_numbers
      : [];

    ticketNumbers.forEach((ticketValue) => {
      const ticketNumber = Number(ticketValue);
      if (!Number.isInteger(ticketNumber) || ticketNumber < 1 || ticketNumber > 100) {
        return;
      }

      const grid = makeTicket(gameCode, ticketNumber);

      const winningNumbers = getWinningNumbersForPattern(
        grid,
        pattern,
        calledSet
      );

      if (!winningNumbers.length) {
        return;
      }

      winners.push({
        bookingId: booking.id,
        playerName: booking.player_name || "Player",
        ticketNumber,
        winningNumber,
        winningNumbers,
        wonAt: new Date().toISOString()
      });
    });
  });

  const unique = [];
  const seen = new Set();

  winners.forEach((winner) => {
    const key = `${winner.bookingId}:${winner.ticketNumber}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(winner);
  });

  return unique;
}

function calculateWinnerShares(amount, winnerCount) {
  const total = Number(amount) || 0;
  const count = Math.max(1, Number(winnerCount) || 1);

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents % count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return cents / 100;
  });
}

function formatPrizeAmount(amount) {
  const value = Number(amount) || 0;
  return `INR ${value.toFixed(2)}`;
}

function getPrizeVoiceName(name) {
  const pattern = getPrizePattern(name);

  if (pattern === "first_five") return "Early Five";
  if (pattern === "four_corners") return "Four Corners";
  if (pattern === "top_line") return "Top Line";
  if (pattern === "middle_line") return "Middle Line";
  if (pattern === "bottom_line") return "Bottom Line";
  if (pattern === "full_house") return "Full House";

  return String(name || "Prize");
}

function speakWinnerAnnouncement(events) {
  try {
    if (!("speechSynthesis" in window) || !events?.length) return;

    window.speechSynthesis.cancel();

    const parts = events.map((event) => {
      const voicePrizeName = getPrizeVoiceName(event.prizeName);
      const names = event.winners.map((winner) => winner.playerName);
      let winnersText = names[0] || "a player";

      if (names.length === 2) {
        winnersText = `${names[0]} and ${names[1]}`;
      } else if (names.length > 2) {
        winnersText = `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
      }

      if (event.winners.length > 1) {
        return `${voicePrizeName} won by ${winnersText}. Prize of ${formatPrizeAmount(
          event.prizeAmount
        )} split equally among ${event.winners.length} winners.`;
      }

      return `${voicePrizeName} won by ${winnersText}`;
    });

    const utterance = new SpeechSynthesisUtterance(parts.join(". "));
    utterance.rate = 0.82;
    utterance.pitch = 1.04;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Could not announce winner:", err);
  }
}

function generateGameCode() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return code;
}

function saveHostGame(game) {
  try {
    if (game) {
      localStorage.setItem(
        GAME_KEY,
        JSON.stringify(game)
      );
    } else {
      localStorage.removeItem(
        GAME_KEY
      );
    }
  } catch (error) {
    console.error(
      "Could not save host game:",
      error
    );
  }
}

function getSavedHostGame() {
  try {
    const saved =
      localStorage.getItem(
        GAME_KEY
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error(
      "Could not restore host game:",
      error
    );

    return null;
  }
}

function getGameFromUrl() {
  try {
    return new URLSearchParams(
      window.location.search
    ).get("game");
  } catch {
    return null;
  }
}

function getPlayerIdentityKey(gameId) {
  return `tambolalive_player_identity_${gameId}`;
}

function createPlayerKey() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn("Could not create UUID:", error);
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreatePlayerKey(gameId) {
  try {
    const keyName = getPlayerIdentityKey(gameId);
    const existing = localStorage.getItem(keyName);

    if (existing) {
      return existing;
    }

    const created = createPlayerKey();
    localStorage.setItem(keyName, created);
    return created;
  } catch (error) {
    console.error("Could not restore/create player key:", error);
    return createPlayerKey();
  }
}

function getPlayerNameKey(gameId) {
  return `tambolalive_player_name_${gameId}`;
}

function savePlayerName(gameId, name) {
  try {
    localStorage.setItem(
      getPlayerNameKey(gameId),
      name
    );
  } catch (error) {
    console.error("Could not save player name:", error);
  }
}

function getSavedPlayerName(gameId) {
  try {
    return localStorage.getItem(
      getPlayerNameKey(gameId)
    ) || "";
  } catch (error) {
    console.error("Could not restore player name:", error);
    return "";
  }
}

function getPlayerBookingKey(gameId) {
  return `${PLAYER_BOOKING_PREFIX}${gameId}`;
}

function savePlayerBooking(
  gameId,
  booking
) {
  try {
    localStorage.setItem(
      getPlayerBookingKey(gameId),
      JSON.stringify(booking)
    );
  } catch (error) {
    console.error(
      "Could not save player booking:",
      error
    );
  }
}

function getPlayerBooking(gameId) {
  try {
    const saved =
      localStorage.getItem(
        getPlayerBookingKey(gameId)
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error(
      "Could not restore player booking:",
      error
    );

    return null;
  }
}

/* =========================================================
   SEEDED RANDOM
========================================================= */

function seededRandom(seed) {
  let x = seed >>> 0;

  return () => {
    x += 0x6d2b79f5;

    let t = x;

    t = Math.imul(
      t ^ (t >>> 15),
      t | 1
    );

    t ^= t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61
      );

    return (
      (t ^ (t >>> 14)) >>> 0
    ) / 4294967296;
  };
}

function seedFromText(text) {
  let hash = 2166136261;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {
    hash ^= text.charCodeAt(i);

    hash = Math.imul(
      hash,
      16777619
    );
  }

  return hash >>> 0;
}

function shuffle(array, random) {
  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      random() * (i + 1)
    );

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

/* =========================================================
   TAMBOLA TICKET GENERATOR
========================================================= */

function makeTicket(
  gameCode,
  ticketNumber
) {
  const random =
    seededRandom(
      seedFromText(
        `${gameCode}-${ticketNumber}`
      )
    );

  const ranges = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90]
  ];

  let pattern = null;

  for (
    let attempt = 0;
    attempt < 500;
    attempt++
  ) {
    const row1 =
      shuffle(
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
        random
      ).slice(0, 5);

    const row2 =
      shuffle(
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
        random
      ).slice(0, 5);

    const row3 =
      shuffle(
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
        random
      ).slice(0, 5);

    const cells = [
      ...row1.map((c) => [0, c]),
      ...row2.map((c) => [1, c]),
      ...row3.map((c) => [2, c])
    ];

    const counts =
      Array(9).fill(0);

    cells.forEach(
      ([, c]) => {
        counts[c]++;
      }
    );

    if (
      counts.every(
        (count) => count >= 1
      )
    ) {
      pattern = cells;
      break;
    }
  }

  if (!pattern) {
    pattern = [
      [0, 0],
      [0, 1],
      [0, 3],
      [0, 5],
      [0, 7],

      [1, 1],
      [1, 2],
      [1, 4],
      [1, 6],
      [1, 8],

      [2, 0],
      [2, 2],
      [2, 4],
      [2, 6],
      [2, 8]
    ];
  }

  const grid =
    Array.from(
      { length: 3 },
      () => Array(9).fill(null)
    );

  for (
    let column = 0;
    column < 9;
    column++
  ) {
    const rows =
      pattern
        .filter(
          ([, c]) =>
            c === column
        )
        .map(
          ([r]) => r
        )
        .sort(
          (a, b) => a - b
        );

    if (!rows.length) {
      continue;
    }

    const [min, max] =
      ranges[column];

    const numbers = [];

    for (
      let n = min;
      n <= max;
      n++
    ) {
      numbers.push(n);
    }

    const selectedNumbers =
      shuffle(
        numbers,
        random
      )
        .slice(
          0,
          rows.length
        )
        .sort(
          (a, b) => a - b
        );

    rows.forEach(
      (row, index) => {
        grid[row][column] =
          selectedNumbers[index];
      }
    );
  }

  return grid;
}

/* =========================================================
   REAL GAME POSTER GENERATOR
========================================================= */

function roundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {
  const r =
    Math.min(
      radius,
      width / 2,
      height / 2
    );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y
  );

  ctx.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    r
  );

  ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    r
  );

  ctx.arcTo(
    x,
    y + height,
    x,
    y,
    r
  );

  ctx.arcTo(
    x,
    y,
    x + width,
    y,
    r
  );

  ctx.closePath();
}

function posterTheme(theme) {
  switch (theme) {
    case "Royal":
      return {
        background: "#24113f",
        accent: "#f5c542",
        secondary: "#8b5cf6",
        text: "#ffffff"
      };

    case "Party":
      return {
        background: "#7c1d5c",
        accent: "#facc15",
        secondary: "#22d3ee",
        text: "#ffffff"
      };

    case "Bollywood":
      return {
        background: "#7f1d1d",
        accent: "#fbbf24",
        secondary: "#fb7185",
        text: "#ffffff"
      };

    case "Neon":
      return {
        background: "#07111f",
        accent: "#22d3ee",
        secondary: "#a78bfa",
        text: "#ffffff"
      };

    case "Elegant":
      return {
        background: "#172033",
        accent: "#d4af37",
        secondary: "#94a3b8",
        text: "#ffffff"
      };

    default:
      return {
        background: "#172554",
        accent: "#fbbf24",
        secondary: "#60a5fa",
        text: "#ffffff"
      };
  }
}

function drawPosterText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  font
) {
  ctx.font = font;

  if (
    ctx.measureText(text).width <=
    maxWidth
  ) {
    ctx.fillText(
      text,
      x,
      y
    );

    return;
  }

  let current = "";

  for (const char of text) {
    const next =
      current + char;

    if (
      ctx.measureText(next)
        .width > maxWidth
    ) {
      break;
    }

    current = next;
  }

  ctx.fillText(
    current,
    x,
    y
  );
}

async function createGamePoster(
  game,
  inviteUrl
) {
  const width = 1080;
  const height = 1350;

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Could not create poster canvas."
    );
  }

  const colors =
    posterTheme(
      game.theme
    );

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      width,
      height
    );

  gradient.addColorStop(
    0,
    colors.background
  );

  gradient.addColorStop(
    1,
    "#020617"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  ctx.globalAlpha =
    0.15;

  ctx.fillStyle =
    colors.accent;

  ctx.beginPath();

  ctx.arc(
    90,
    110,
    180,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle =
    colors.secondary;

  ctx.beginPath();

  ctx.arc(
    1010,
    260,
    240,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.globalAlpha =
    1;

  const cardX = 55;
  const cardY = 55;
  const cardW =
    width - 110;
  const cardH =
    height - 110;

  roundedRect(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    35
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.08)";

  ctx.fill();

  ctx.strokeStyle =
    "rgba(255,255,255,0.18)";

  ctx.lineWidth = 3;

  ctx.stroke();

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    colors.accent;

  ctx.font =
    "bold 38px Arial";

  ctx.fillText(
    "TAMBOLA LIVE",
    width / 2,
    135
  );

  ctx.fillStyle =
    colors.text;

  drawPosterText(
    ctx,
    String(
      game.game_name ||
      DEFAULT_GAME_NAME
    ),
    width / 2,
    220,
    900,
    "bold 64px Arial"
  );

  ctx.fillStyle =
    colors.secondary;

  ctx.font =
    "bold 30px Arial";

  ctx.fillText(
    "YOU ARE INVITED TO PLAY!",
    width / 2,
    275
  );

  roundedRect(
    ctx,
    140,
    330,
    800,
    145,
    25
  );

  ctx.fillStyle =
    "rgba(0,0,0,0.3)";

  ctx.fill();

  ctx.fillStyle =
    colors.text;

  ctx.font =
    "bold 27px Arial";

  ctx.fillText(
    "GAME CODE",
    width / 2,
    370
  );

  ctx.fillStyle =
    colors.accent;

  ctx.font =
    "bold 72px Arial";

  ctx.fillText(
    String(
      game.game_code ||
      ""
    ),
    width / 2,
    445
  );

  const detailY =
    535;

  const details = [
    [
      "DATE",
      game.game_date ||
        "-"
    ],
    [
      "TIME",
      game.game_time ||
        "-"
    ],
    [
      "TICKET PRICE",
      `INR ${
        game.ticket_price ||
        0
      }`
    ],
    [
      "TICKETS",
      `${
        game.ticket_limit ||
        0
      } available`
    ]
  ];

  details.forEach(
    (item, index) => {
      const x =
        index % 2 === 0
          ? 130
          : 560;

      const y =
        detailY +
        Math.floor(
          index / 2
        ) *
          150;

      roundedRect(
        ctx,
        x,
        y,
        390,
        110,
        18
      );

      ctx.fillStyle =
        "rgba(255,255,255,0.10)";

      ctx.fill();

      ctx.textAlign =
        "left";

      ctx.fillStyle =
        colors.secondary;

      ctx.font =
        "bold 21px Arial";

      ctx.fillText(
        item[0],
        x + 22,
        y + 35
      );

      ctx.fillStyle =
        colors.text;

      drawPosterText(
        ctx,
        String(item[1]),
        x + 22,
        y + 77,
        345,
        "bold 29px Arial"
      );
    }
  );

  const prizes =
    Array.isArray(
      game.selected_prizes
    )
      ? game.selected_prizes
      : [];

  const prizeY =
    860;

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    colors.accent;

  ctx.font =
    "bold 31px Arial";

  ctx.fillText(
    "PRIZES",
    width / 2,
    prizeY
  );

  if (prizes.length) {
    const displayPrizes =
      prizes.slice(
        0,
        5
      );

    displayPrizes.forEach(
      (
        prize,
        index
      ) => {
        const y =
          prizeY +
          55 +
          index *
            52;

        ctx.fillStyle =
          colors.text;

        ctx.font =
          "bold 24px Arial";

        ctx.fillText(
          `${
            prize.name ||
            "Prize"
          } - INR ${
            prize.amount ||
            0
          }`,
          width / 2,
          y
        );
      }
    );
  } else {
    ctx.fillStyle =
      colors.text;

    ctx.font =
      "23px Arial";

    ctx.fillText(
      "Exciting prizes await!",
      width / 2,
      prizeY + 55
    );
  }

  const joinY =
    1130;

  roundedRect(
    ctx,
    125,
    joinY,
    830,
    125,
    24
  );

  ctx.fillStyle =
    colors.accent;

  ctx.fill();

  ctx.fillStyle =
    "#111827";

  ctx.font =
    "bold 32px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    "JOIN THE GAME",
    width / 2,
    joinY + 48
  );

  ctx.font =
    "bold 23px Arial";

  drawPosterText(
    ctx,
    inviteUrl,
    width / 2,
    joinY + 87,
    770,
    "bold 23px Arial"
  );

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    "rgba(255,255,255,0.75)";

  ctx.font =
    "18px Arial";

  ctx.fillText(
    "Open the link or scan/share this poster to join",
    width / 2,
    1280
  );

  const blob =
    await new Promise(
      (resolve) =>
        canvas.toBlob(
          resolve,
          "image/png"
        )
    );

  if (!blob) {
    throw new Error(
      "Could not create PNG poster."
    );
  }

  return new File(
    [blob],
    `${
      String(
        game.game_name ||
        "TambolaLive"
      )
        .replace(
          /[^a-z0-9]/gi,
          "_"
        )
    }-poster.png`,
    {
      type: "image/png"
    }
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 20,
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif"
};

const cardStyle = {
  background: "#fff",
  border:
    "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  marginBottom: 18,
  boxShadow:
    "0 3px 10px rgba(0,0,0,.05)"
};

const inputStyle = {
  width: "100%",
  padding: 13,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  boxSizing: "border-box",
  fontSize: 16
};

const primaryButton = {
  padding:
    "13px 18px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer"
};

const secondaryButton = {
  padding:
    "11px 16px",
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  background: "#fff",
  color: "#111827",
  fontWeight: "bold",
  cursor: "pointer"
};

/* =========================================================
   CREATE GAME PAGE
========================================================= */

function CreateGamePage({
  onCreated
}) {
  const [
    gameName,
    setGameName
  ] = useState(
    DEFAULT_GAME_NAME
  );

  const [
    gameDate,
    setGameDate
  ] = useState("");

  const [
    gameTime,
    setGameTime
  ] = useState("");

  const [
    ticketLimit,
    setTicketLimit
  ] = useState(100);

  const [
    ticketPrice,
    setTicketPrice
  ] = useState(20);

  const [
    theme,
    setTheme
  ] = useState(
    "Classic"
  );

  const [
    prizes,
    setPrizes
  ] = useState(
    DEFAULT_PRIZES
  );

  const [
    customPrize,
    setCustomPrize
  ] = useState("");

  const [
    creating,
    setCreating
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  function updatePrize(
    index,
    amount
  ) {
    setPrizes(
      (current) =>
        current.map(
          (p, i) =>
            i === index
              ? {
                  ...p,
                  amount
                }
              : p
        )
    );
  }

  function addPrize() {
    const name =
      customPrize.trim();

    if (!name) {
      return;
    }

    setPrizes(
      (current) => [
        ...current,
        {
          name,
          amount: ""
        }
      ]
    );

    setCustomPrize("");
  }

  function removePrize(
    index
  ) {
    setPrizes(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );
  }

  async function createGame(
    e
  ) {
    e.preventDefault();

    if (creating) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      let code =
        generateGameCode();

      while (true) {
        const {
          data,
          error
        } =
          await supabase
            .from(
              "games"
            )
            .select(
              "id"
            )
            .eq(
              "game_code",
              code
            )
            .limit(1);

        if (error) {
          throw error;
        }

        if (
          !data?.length
        ) {
          break;
        }

        code =
          generateGameCode();
      }

      const selectedPrizes =
        prizes
          .filter(
            (p) =>
              p.amount !== ""
          )
          .map(
            (p) => ({
              name:
                p.name,
              amount:
                Number(
                  p.amount
                )
            })
          );

      const newGame = {
        host_name:
          "Host",

        game_name:
          gameName.trim() ||
          DEFAULT_GAME_NAME,

        status:
          "upcoming",

        ticket_limit:
          Math.min(
            100,
            Math.max(
              1,
              Number(
                ticketLimit
              ) || 100
            )
          ),

        ticket_price:
          Number(
            ticketPrice
          ) || 0,

        call_interval_seconds:
          5,

        game_date:
          gameDate ||
          null,

        game_time:
          gameTime ||
          null,

        theme,

        game_code:
          code,

        invite_enabled:
          true,

        selected_prizes:
          selectedPrizes,

        called_numbers:
          []
      };

      const {
        data,
        error
      } =
        await supabase
          .from(
            "games"
          )
          .insert(
            newGame
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      saveHostGame(
        data
      );

      onCreated(
        data
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        err?.message ||
        "Could not create game."
      );
    } finally {
      setCreating(
        false
      );
    }
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 760,
          margin:
            "0 auto"
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            marginBottom:
              25
          }}
        >
          <h1>
            TAMBOLA LIVE
          </h1>

          <p
            style={{
              color:
                "#64748b"
            }}
          >
            Host Create Game
          </p>
        </div>

        <form
          onSubmit={
            createGame
          }
        >
          <section
            style={
              cardStyle
            }
          >
            <h2>
              Create New Game
            </h2>

            <b>
              Game Name
            </b>

            <input
              value={
                gameName
              }
              onChange={(e) =>
                setGameName(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                marginTop: 7
              }}
            />

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(210px,1fr))",
                gap: 14,
                marginTop:
                  16
              }}
            >
              <div>
                <b>
                  Date
                </b>

                <input
                  type="date"
                  required
                  value={
                    gameDate
                  }
                  onChange={(e) =>
                    setGameDate(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>
                  Time
                </b>

                <input
                  type="time"
                  required
                  value={
                    gameTime
                  }
                  onChange={(e) =>
                    setGameTime(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>
                  Ticket Limit
                </b>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={
                    ticketLimit
                  }
                  onChange={(e) =>
                    setTicketLimit(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>
                  Ticket Price
                </b>

                <input
                  type="number"
                  min="0"
                  value={
                    ticketPrice
                  }
                  onChange={(e) =>
                    setTicketPrice(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop:
                  16
              }}
            >
              <b>
                Game Theme
              </b>

              <select
                value={
                  theme
                }
                onChange={(e) =>
                  setTheme(
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  marginTop: 7
                }}
              >
                {THEMES.map(
                  (t) => (
                    <option
                      key={t}
                      value={t}
                    >
                      {t}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          <section
            style={
              cardStyle
            }
          >
            <h2>
              Prizes
            </h2>

            {prizes.map(
              (
                p,
                index
              ) => (
                <div
                  key={`${p.name}-${index}`}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 130px auto",
                    gap: 8,
                    alignItems:
                      "center",
                    marginBottom:
                      10
                  }}
                >
                  <b>
                    {
                      p.name
                    }
                  </b>

                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={
                      p.amount
                    }
                    onChange={(e) =>
                      updatePrize(
                        index,
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removePrize(
                        index
                      )
                    }
                    style={
                      secondaryButton
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            )}

            <div
              style={{
                display:
                  "flex",
                gap: 8,
                marginTop:
                  15
              }}
            >
              <input
                placeholder="Customize prize"
                value={
                  customPrize
                }
                onChange={(e) =>
                  setCustomPrize(
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />

              <button
                type="button"
                onClick={
                  addPrize
                }
                style={
                  secondaryButton
                }
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <section
              style={{
                ...cardStyle,
                background:
                  "#fef2f2",
                border:
                  "1px solid #ef4444",
                color:
                  "#b91c1c"
              }}
            >
              <b>
                Could not create
                game
              </b>

              <p>
                {
                  error
                }
              </p>
            </section>
          )}

          <button
            type="submit"
            disabled={
              creating
            }
            style={{
              ...primaryButton,
              width:
                "100%",
              opacity:
                creating
                  ? 0.6
                  : 1
            }}
          >
            {creating
              ? "Creating Game..."
              : "CREATE GAME"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   TICKET GRID
========================================================= */

function TicketGridComponent({
  ticket,
  selected,
  onSelect,
  calledNumbers = []
}) {
  return (
    <div
      onClick={
        onSelect
      }
      style={{
        border:
          selected
            ? "4px solid #2563eb"
            : "2px solid #111827",
        borderRadius:
          14,
        padding: 12,
        background:
          selected
            ? "#eff6ff"
            : "#fff",
        cursor:
          "pointer",
        boxShadow:
          selected
            ? "0 0 0 3px rgba(37,99,235,.12)"
            : "none"
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            10
        }}
      >
        <b
          style={{
            fontSize: 21
          }}
        >
          Ticket #
          {
            ticket.number
          }
        </b>

        <span
          style={{
            padding:
              "6px 10px",
            borderRadius:
              8,
            background:
              selected
                ? "#2563eb"
                : "#f1f5f9",
            color:
              selected
                ? "#fff"
                : "#475569",
            fontWeight:
              "bold",
            fontSize: 13
          }}
        >
          {selected
            ? "SELECTED"
            : "AVAILABLE"}
        </span>
      </div>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(9,minmax(28px,1fr))",
          border:
            "2px solid #111827",
          overflow:
            "hidden",
          borderRadius:
            8
        }}
      >
        {ticket.grid.flatMap(
          (
            row,
            r
          ) =>
            row.map(
              (
                value,
                c
              ) => {
                const called =
                  value &&
                  calledNumbers.includes(
                    value
                  );

                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      minHeight:
                        48,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRight:
                        c ===
                        8
                          ? "none"
                          : "1px solid #94a3b8",
                      borderBottom:
                        r ===
                        2
                          ? "none"
                          : "1px solid #94a3b8",
                      fontWeight:
                        value
                          ? "bold"
                          : "normal",
                      fontSize:
                        17,
                      background:
                        called
                          ? "#fde68a"
                          : value
                          ? "#fff"
                          : "#f8fafc",
                      color:
                        called
                          ? "#92400e"
                          : "#111827"
                    }}
                  >
                    {
                      value ||
                      ""
                    }
                  </div>
                );
              }
            )
        )}
      </div>

      <div
        style={{
          marginTop:
            9,
          textAlign:
            "center",
          color:
            selected
              ? "#1d4ed8"
              : "#64748b",
          fontWeight:
            "bold"
        }}
      >
        {selected
          ? "[OK] Tap to unselect"
          : "Tap to select"}
      </div>
    </div>
  );
}

/* Keep ticket DOM stable while live game state updates. This prevents mobile scroll blinking/repainting. */
const TicketGrid = React.memo(TicketGridComponent);

/* =========================================================
   PLAYER BOOKING PAGE
========================================================= */

function PlayerBookingPage({
  game
}) {
  const limit =
    Math.min(
      100,
      Math.max(
        1,
        Number(
          game.ticket_limit
        ) || 100
      )
    );

  const [
    selected,
    setSelected
  ] = useState([]);

  const [
    playerName,
    setPlayerName
  ] = useState(
    () => getSavedPlayerName(game.id)
  );

  const [
    booking,
    setBooking
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  const [
    messageType,
    setMessageType
  ] = useState("info");

  useEffect(() => {
    const savedName = getSavedPlayerName(game.id);
    if (savedName && !playerName) {
      setPlayerName(savedName);
    }
  }, [game.id]);

  const [
    unavailableTickets,
    setUnavailableTickets
  ] = useState([]);

  const [
    loadingUnavailable,
    setLoadingUnavailable
  ] = useState(true);

  async function loadUnavailableTickets() {
    try {
      const {
        data,
        error
      } =
        await supabase
          .from(
            "ticket_bookings"
          )
          .select(
            "ticket_numbers,status"
          )
          .eq(
            "game_id",
            game.id
          )
          .in(
            "status",
            [
              "pending",
              "accepted"
            ]
          );

      if (error) {
        throw error;
      }

      const numbers =
        [];

      (
        data || []
      ).forEach(
        (booking) => {
          const ticketNumbers =
            Array.isArray(
              booking.ticket_numbers
            )
              ? booking.ticket_numbers
              : [];

          ticketNumbers.forEach(
            (number) => {
              const n =
                Number(
                  number
                );

              if (
                Number.isInteger(
                  n
                ) &&
                n >= 1 &&
                n <= limit
              ) {
                numbers.push(
                  n
                );
              }
            }
          );
        }
      );

      setUnavailableTickets(
        [
          ...new Set(
            numbers
          )
        ].sort(
          (a, b) =>
            a - b
        )
      );
    } catch (err) {
      console.error(
        "Could not load unavailable tickets:",
        err
      );
    } finally {
      setLoadingUnavailable(
        false
      );
    }
  }

  useEffect(
    () => {
      loadUnavailableTickets();

      const channel =
        supabase
          .channel(
            `player-bookings-${game.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema:
                "public",
              table:
                "ticket_bookings",
              filter:
                `game_id=eq.${game.id}`
            },
            () => {
              loadUnavailableTickets();
            }
          )
          .subscribe();

      const interval =
        setInterval(
          loadUnavailableTickets,
          5000
        );

      return () => {
        clearInterval(
          interval
        );

        supabase.removeChannel(
          channel
        );
      };
    },
    [
      game.id,
      limit
    ]
  );

  const tickets =
    useMemo(
      () =>
        Array.from(
          {
            length:
              limit
          },
          (
            _,
            i
          ) => ({
            number:
              i + 1,
            grid:
              makeTicket(
                game.game_code,
                i + 1
              )
          })
        ),
      [
        game.game_code,
        limit
      ]
    );

  function toggleTicket(
    number
  ) {
    if (
      unavailableTickets.includes(
        number
      )
    ) {
      return;
    }

    setSelected(
      (current) => {
        if (
          current.includes(
            number
          )
        ) {
          return current.filter(
            (n) =>
              n !==
              number
          );
        }

        return [
          ...current,
          number
        ].sort(
          (a, b) =>
            a - b
        );
      }
    );

    setMessage("");
  }

  function clearSelection() {
    setSelected([]);
  }

  async function bookTickets() {
    const name =
      playerName.trim();

    if (!name) {
      setMessageType(
        "error"
      );

      setMessage(
        "Please enter your name."
      );

      return;
    }

    if (
      !selected.length
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "Please select at least one ticket."
      );

      return;
    }

    await loadUnavailableTickets();

    const conflictingTickets =
      selected.filter(
        (number) =>
          unavailableTickets.includes(
            number
          )
      );

    if (
      conflictingTickets.length
    ) {
      setSelected(
        (current) =>
          current.filter(
            (number) =>
              !conflictingTickets.includes(
                number
              )
          )
      );

      setMessageType(
        "error"
      );

      setMessage(
        `Ticket${
          conflictingTickets.length ===
          1
            ? ""
            : "s"
        } ${conflictingTickets
          .map(
            (n) =>
              `#${n}`
          )
          .join(
            ", "
          )} ${
          conflictingTickets.length ===
          1
            ? "is"
            : "are"
        } no longer available. Please select another ticket.`
      );

      return;
    }

    setBooking(
      true
    );

    setMessage("");

    const sortedTickets =
      [
        ...selected
      ].sort(
        (a, b) =>
          a - b
      );

    try {
      const playerKey = getOrCreatePlayerKey(game.id);

      savePlayerName(
        game.id,
        name
      );

      // Reuse the same database player record for every booking
      // made by this player on this device for this game.
      let player = null;

      const {
        data: existingPlayer,
        error: existingPlayerError
      } = await supabase
        .from("players")
        .select("id, player_name, player_key")
        .eq("game_id", game.id)
        .eq("player_key", playerKey)
        .maybeSingle();

      if (existingPlayerError) {
        throw existingPlayerError;
      }

      player = existingPlayer;

      if (!player) {
        const {
          data: createdPlayer,
          error: createPlayerError
        } = await supabase
          .from("players")
          .insert({
            game_id: game.id,
            player_name: name,
            player_key: playerKey,
            status: "pending"
          })
          .select("id, player_name, player_key")
          .single();

        if (createPlayerError) {
          // Another request/device tab may have created it between
          // the SELECT and INSERT. Try to read it once more.
          const {
            data: retryPlayer,
            error: retryPlayerError
          } = await supabase
            .from("players")
            .select("id, player_name, player_key")
            .eq("game_id", game.id)
            .eq("player_key", playerKey)
            .maybeSingle();

          if (retryPlayerError || !retryPlayer) {
            throw createPlayerError;
          }

          player = retryPlayer;
        } else {
          player = createdPlayer;
        }
      }

      if (!player?.id) {
        throw new Error("Could not create or find your player record.");
      }

      // Keep the display name current without changing the player's identity.
      if (player.player_name !== name) {
        const { error: nameUpdateError } = await supabase
          .from("players")
          .update({ player_name: name })
          .eq("id", player.id);

        if (nameUpdateError) {
          throw nameUpdateError;
        }
      }

      const bookingData = {
        game_id: game.id,
        player_id: player.id,
        player_name: name,
        ticket_numbers: sortedTickets,
        status: "pending"
      };

      const {
        data,
        error
      } = await supabase
        .from("ticket_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      savePlayerBooking(
        game.id,
        {
          bookingId: data?.id || null,
          playerId: player.id,
          playerKey,
          playerName: name,
          ticketNumbers: sortedTickets
        }
      );

      setMessageType(
        "success"
      );

      setMessage(
        `Booking submitted successfully for ${sortedTickets
          .map(
            (n) =>
              `#${n}`
          )
          .join(
            ", "
          )}. Waiting for host approval.`
      );

      setSelected([]);

      await loadUnavailableTickets();
    } catch (err) {
      console.error(
        err
      );

      setMessageType(
        "error"
      );

      setMessage(
        err?.message ||
        "Could not submit booking."
      );
    } finally {
      setBooking(
        false
      );
    }
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth:
            950,
          margin:
            "0 auto"
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            marginBottom:
              20
          }}
        >
          <h1>
            {
              game.game_name
            }
          </h1>

          <p
            style={{
              color:
                "#64748b",
              fontSize:
                17
            }}
          >
            Player Ticket Booking
          </p>

          <div
            style={{
              display:
                "inline-block",
              marginTop:
                8,
              padding:
                "7px 14px",
              borderRadius:
                20,
              background:
                "#fef3c7",
              color:
                "#92400e",
              fontWeight:
                "bold"
            }}
          >
            GAME NOT STARTED
          </div>
        </div>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Game Details
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12
            }}
          >
            <InfoBox
              title="Game Code"
              value={
                game.game_code
              }
            />

            <InfoBox
              title="Date"
              value={
                game.game_date ||
                "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time ||
                "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`INR ${
                game.ticket_price ||
                0
              }`}
            />
          </div>
        </section>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Select Ticket Numbers
          </h2>

          <p
            style={{
              color:
                "#64748b"
            }}
          >
            Pending and approved
            tickets are unavailable.
          </p>

          {loadingUnavailable && (
            <p
              style={{
                color:
                  "#64748b"
              }}
            >
              Checking ticket
              availability...
            </p>
          )}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(5,minmax(0,1fr))",
              gap: 10
            }}
          >
            {tickets.map(
              (
                ticket
              ) => {
                const active =
                  selected.includes(
                    ticket.number
                  );

                const unavailable =
                  unavailableTickets.includes(
                    ticket.number
                  );

                return (
                  <button
                    key={
                      ticket.number
                    }
                    type="button"
                    disabled={
                      unavailable
                    }
                    onClick={() =>
                      toggleTicket(
                        ticket.number
                      )
                    }
                    style={{
                      minHeight:
                        65,
                      border:
                        active
                          ? "3px solid #2563eb"
                          : unavailable
                          ? "2px solid #94a3b8"
                          : "1px solid #cbd5e1",
                      borderRadius:
                        11,
                      background:
                        active
                          ? "#2563eb"
                          : unavailable
                          ? "#e2e8f0"
                          : "#fff",
                      color:
                        active
                          ? "#fff"
                          : unavailable
                          ? "#64748b"
                          : "#111827",
                      fontWeight:
                        "bold",
                      fontSize:
                        17,
                      cursor:
                        unavailable
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        unavailable
                          ? 0.75
                          : 1
                    }}
                  >
                    <div>
                      #
                      {
                        ticket.number
                      }
                    </div>

                    {unavailable && (
                      <div
                        style={{
                          fontSize:
                            10,
                          marginTop:
                            3
                        }}
                      >
                        BOOKED
                      </div>
                    )}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              marginTop:
                18,
              padding:
                15,
              borderRadius:
                11,
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0"
            }}
          >
            <b>
              Selected Tickets:
            </b>{" "}
            {selected.length
              ? selected
                  .map(
                    (n) =>
                      `#${n}`
                  )
                  .join(
                    ", "
                  )
              : "None"}

            <div
              style={{
                marginTop:
                  8,
                color:
                  "#2563eb",
                fontWeight:
                  "bold"
              }}
            >
              {
                selected.length
              } ticket
              {
                selected.length ===
                1
                  ? ""
                  : "s"
              } selected
            </div>

            {selected.length >
              0 && (
              <button
                type="button"
                onClick={
                  clearSelection
                }
                style={{
                  ...secondaryButton,
                  marginTop:
                    10
                }}
              >
                Clear Selection
              </button>
            )}
          </div>
        </section>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            All 3x9 Tambola Tickets
          </h2>

          <div
            style={{
              display:
                "grid",
              gap: 18
            }}
          >
            {tickets.map(
              (
                ticket
              ) => {
                const unavailable =
                  unavailableTickets.includes(
                    ticket.number
                  );

                return (
                  <div
                    key={
                      ticket.number
                    }
                    style={{
                      position:
                        "relative",
                      opacity:
                        unavailable
                          ? 0.65
                          : 1
                    }}
                  >
                    <TicketGrid
                      ticket={
                        ticket
                      }
                      selected={selected.includes(
                        ticket.number
                      )}
                      onSelect={() => {
                        if (
                          !unavailable
                        ) {
                          toggleTicket(
                            ticket.number
                          );
                        }
                      }}
                    />

                    {unavailable && (
                      <div
                        style={{
                          position:
                            "absolute",
                          top: 12,
                          right: 12,
                          padding:
                            "7px 11px",
                          borderRadius:
                            8,
                          background:
                            "#64748b",
                          color:
                            "#fff",
                          fontSize:
                            12,
                          fontWeight:
                            "bold"
                        }}
                      >
                        BOOKED
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 20
          }}
        >
          <h2>
            Booking Details
          </h2>

          <b>
            Player Name
          </b>

          <input
            value={
              playerName
            }
            onChange={(e) => {
              const value = e.target.value;
              setPlayerName(value);
              if (value.trim()) {
                savePlayerName(game.id, value.trim());
              }
            }}
            placeholder="Enter your name"
            style={{
              ...inputStyle,
              marginTop:
                8
            }}
          />

          <button
            type="button"
            onClick={
              bookTickets
            }
            disabled={
              booking ||
              !selected.length
            }
            style={{
              ...primaryButton,
              width:
                "100%",
              marginTop:
                14,
              fontSize:
                18,
              opacity:
                booking ||
                !selected.length
                  ? 0.55
                  : 1
            }}
          >
            {booking
              ? "SUBMITTING..."
              : `BOOK ${
                  selected.length ||
                  ""
                } SELECTED TICKET${
                  selected.length ===
                  1
                    ? ""
                    : "S"
                }`}
          </button>

          <p
            style={{
              textAlign:
                "center",
              color:
                "#64748b"
            }}
          >
            Your booking will
            remain pending until
            the host approves it.
          </p>

          {message && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  13,
                borderRadius:
                  10,
                background:
                  messageType ===
                  "success"
                    ? "#ecfdf5"
                    : "#fef2f2",
                color:
                  messageType ===
                  "success"
                    ? "#047857"
                    : "#b91c1c",
                textAlign:
                  "center",
                fontWeight:
                  "bold"
              }}
            >
              {
                message
              }
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   LIVE GAME PAGE
========================================================= */

function LiveGamePage({ game }) {
  const [calledNumbers, setCalledNumbers] = useState(
    Array.isArray(game.called_numbers) ? game.called_numbers : []
  );
  const [liveGame, setLiveGame] = useState(game);
  const finalAnnouncementSpokenRef = useRef(false);
  const finalSummaryTimerRef = useRef(null);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [viewFinishedLive, setViewFinishedLive] = useState(false);

  useEffect(() => {
    if (finalSummaryTimerRef.current) {
      window.clearTimeout(finalSummaryTimerRef.current);
      finalSummaryTimerRef.current = null;
    }

    if (liveGame.status !== "ended") {
      setShowFinalResults(false);
      setViewFinishedLive(false);
      return undefined;
    }

    finalSummaryTimerRef.current = window.setTimeout(() => {
      setViewFinishedLive(false);
      setShowFinalResults(true);
      finalSummaryTimerRef.current = null;
    }, 3000);

    return () => {
      if (finalSummaryTimerRef.current) {
        window.clearTimeout(finalSummaryTimerRef.current);
        finalSummaryTimerRef.current = null;
      }
    };
  }, [liveGame.status]);

  useEffect(() => {
    if (
      liveGame.status !== "ended" ||
      finalAnnouncementSpokenRef.current
    ) {
      return;
    }

    finalAnnouncementSpokenRef.current = true;

    const message =
      "And that's the game! All prizes have been claimed! Thank you everyone for joining us and making this game special. We hope you enjoyed the fun - see you in the next game!";

    if (
      "speechSynthesis" in window
    ) {
      try {
        window.speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(message);

        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error(
          "Could not announce game end:",
          err
        );
      }
    }
  }, [liveGame.status]);

  const [playerBooking, setPlayerBooking] = useState(
    () => getPlayerBooking(game.id)
  );
  const [playerBookings, setPlayerBookings] = useState([]);
  const [loadingPlayerBookings, setLoadingPlayerBookings] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [searchText, setSearchText] = useState("");

  async function loadMyBookings() {
    const playerKey = getOrCreatePlayerKey(game.id);

    try {
      let savedBooking = getPlayerBooking(game.id);
      let playerId = savedBooking?.playerId || null;

      if (!playerId) {
        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("id, player_name, player_key")
          .eq("game_id", game.id)
          .eq("player_key", playerKey)
          .maybeSingle();

        if (playerError) throw playerError;
        playerId = player?.id || null;
      }

      if (!playerId) {
        setPlayerBookings([]);
        setPlayerBooking(savedBooking || null);
        return;
      }

      const { data, error } = await supabase
        .from("ticket_bookings")
        .select(
          "id, player_id, player_name, ticket_numbers, status, created_at"
        )
        .eq("game_id", game.id)
        .eq("player_id", playerId)
        .eq("status", "accepted")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const acceptedBookings = data || [];
      setPlayerBookings(acceptedBookings);

      const allTickets = [];
      acceptedBookings.forEach((booking) => {
        const numbers = Array.isArray(booking.ticket_numbers)
          ? booking.ticket_numbers
          : [];

        numbers.forEach((n) => {
          const number = Number(n);
          if (
            Number.isInteger(number) &&
            number >= 1 &&
            number <= 100
          ) {
            allTickets.push(number);
          }
        });
      });

      const uniqueTickets = [...new Set(allTickets)].sort(
        (a, b) => a - b
      );

      const displayName =
        acceptedBookings[acceptedBookings.length - 1]?.player_name ||
        savedBooking?.playerName ||
        getSavedPlayerName(game.id) ||
        "";

      const updatedPlayerBooking = {
        ...(savedBooking || {}),
        playerId,
        playerKey,
        playerName: displayName,
        ticketNumbers: uniqueTickets
      };

      setPlayerBooking(updatedPlayerBooking);
      savePlayerBooking(game.id, updatedPlayerBooking);
    } catch (err) {
      console.error("Could not load this player's bookings:", err);
      setPlayerBookings([]);
    } finally {
      setLoadingPlayerBookings(false);
    }
  }

  async function loadLiveBookings() {
    try {
      const { data, error } = await supabase
        .from("ticket_bookings")
        .select(
          "id, player_id, player_name, ticket_numbers, status, created_at"
        )
        .eq("game_id", game.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: true });

      if (error) throw error;

      setBookings(data || []);
    } catch (err) {
      console.error("Could not load live game bookings:", err);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    setLiveGame((current) => {
      if (
        current &&
        current.id === game.id &&
        current.status === game.status &&
        JSON.stringify(current.called_numbers || []) ===
          JSON.stringify(game.called_numbers || [])
      ) {
        return current;
      }
      return game;
    });

    setCalledNumbers((current) => {
      const next = Array.isArray(game.called_numbers)
        ? game.called_numbers
        : [];
      return JSON.stringify(current) === JSON.stringify(next)
        ? current
        : next;
    });

    setPlayerBooking(getPlayerBooking(game.id));
    loadMyBookings();
  }, [game.id, game.status, game.called_numbers]);

  useEffect(() => {
    async function refreshGame() {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", game.id)
        .maybeSingle();

      if (!error && data) {
        setLiveGame((current) => {
          if (
            current &&
            current.id === data.id &&
            current.status === data.status &&
            JSON.stringify(current.called_numbers || []) ===
              JSON.stringify(data.called_numbers || []) &&
            current.game_name === data.game_name &&
            current.game_code === data.game_code
          ) {
            return current;
          }
          return data;
        });

        setCalledNumbers((current) => {
          const next = Array.isArray(data.called_numbers)
            ? data.called_numbers
            : [];
          return JSON.stringify(current) === JSON.stringify(next)
            ? current
            : next;
        });
      }
    }

    refreshGame();

    const channel = supabase
      .channel(`live-game-${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`
        },
        (payload) => {
          const updated = payload.new;
          setLiveGame(updated);
          setCalledNumbers(
            Array.isArray(updated.called_numbers)
              ? updated.called_numbers
              : []
          );
        }
      )
      .subscribe();

    const interval = setInterval(refreshGame, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [game.id]);

  useEffect(() => {
    loadMyBookings();
    loadLiveBookings();

    const channel = supabase
      .channel(`live-bookings-${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_bookings",
          filter: `game_id=eq.${game.id}`
        },
        () => {
          loadMyBookings();
          loadLiveBookings();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadMyBookings();
      loadLiveBookings();
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [game.id]);

  const myTicketNumbers = useMemo(() => {
    const numbers = [];

    playerBookings.forEach((booking) => {
      const ticketNumbers = Array.isArray(booking.ticket_numbers)
        ? booking.ticket_numbers
        : [];

      ticketNumbers.forEach((n) => {
        const number = Number(n);
        if (
          Number.isInteger(number) &&
          number >= 1 &&
          number <= 100
        ) {
          numbers.push(number);
        }
      });
    });

    if (!numbers.length && Array.isArray(playerBooking?.ticketNumbers)) {
      numbers.push(...playerBooking.ticketNumbers.map(Number));
    }

    return [...new Set(numbers)]
      .filter(
        (n) =>
          Number.isInteger(n) &&
          n >= 1 &&
          n <= 100
      )
      .sort((a, b) => a - b);
  }, [playerBookings, playerBooking?.ticketNumbers]);

  const myTicketCards = useMemo(
    () =>
      myTicketNumbers.map((ticketNumber) => ({
        number: ticketNumber,
        grid: makeTicket(liveGame.game_code, ticketNumber)
      })),
    [myTicketNumbers, liveGame.game_code]
  );

  const allBookedTickets = useMemo(() => {
    const result = [];

    bookings.forEach((booking) => {
      const numbers = Array.isArray(booking.ticket_numbers)
        ? booking.ticket_numbers
        : [];

      numbers.forEach((number) => {
        const ticketNumber = Number(number);

        if (
          Number.isInteger(ticketNumber) &&
          ticketNumber >= 1 &&
          ticketNumber <= 100
        ) {
          result.push({
            bookingId: booking.id,
            playerName: booking.player_name || "Player",
            number: ticketNumber,
            grid: makeTicket(liveGame.game_code, ticketNumber)
          });
        }
      });
    });

    return result.sort((a, b) => a.number - b.number);
  }, [bookings, liveGame.game_code]);

  const filteredBookedTickets = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return allBookedTickets;

    return allBookedTickets.filter((ticket) => {
      const player = ticket.playerName.toLowerCase();
      const number = String(ticket.number);
      const normalizedQuery = query.replace(/^#/, "");

      return (
        player.includes(query) ||
        number === normalizedQuery ||
        `#${number}`.includes(query)
      );
    });
  }, [allBookedTickets, searchText]);

  const lastCalled = calledNumbers.length
    ? calledNumbers[calledNumbers.length - 1]
    : null;

  if (liveGame.status === "ended" && !viewFinishedLive) {
    const finalPrizes = Array.isArray(liveGame.selected_prizes)
      ? liveGame.selected_prizes
      : [];

    const finalWinners = finalPrizes.flatMap((prize, prizeIndex) =>
      (Array.isArray(prize?.winners) ? prize.winners : []).map((winner, winnerIndex) => ({
        ...winner,
        prizeName: prize.name || `Prize ${prizeIndex + 1}`,
        prizeAmount: prize.amount,
        prizeIndex,
        winnerIndex
      }))
    );

    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 800, margin: "40px auto" }}>
          <section style={{ ...cardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>[WINNER]</div>
            <h1 style={{ marginBottom: 8 }}>FINAL GAME RESULTS</h1>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>
              Game complete. Your final results are shown below.
            </p>

            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                gap: 10
              }}
            >
              <div style={{ ...cardStyle, margin: 0, background: "#f8fafc" }}>
                <b>Numbers Called</b>
                <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>{calledNumbers.length}</div>
              </div>
              <div style={{ ...cardStyle, margin: 0, background: "#f8fafc" }}>
                <b>Prizes Won</b>
                <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>
                  {finalPrizes.filter((prize) => prize?.locked).length}
                </div>
              </div>
              <div style={{ ...cardStyle, margin: 0, background: "#f8fafc" }}>
                <b>Winner Entries</b>
                <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>{finalWinners.length}</div>
              </div>
            </div>
          </section>

          {showFinalResults && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(15,23,42,0.72)",
                padding: 16,
                boxSizing: "border-box",
                overflowY: "auto"
              }}
            >
              <div
                style={{
                  maxWidth: 760,
                  margin: "30px auto",
                  background: "#fff",
                  borderRadius: 18,
                  padding: 20,
                  boxShadow: "0 20px 60px rgba(0,0,0,.25)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#64748b", fontWeight: "bold" }}>
                      GAME COMPLETE
                    </div>
                    <h2 style={{ margin: "5px 0 0" }}>FINAL GAME SUMMARY</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFinalResults(false);
                      setViewFinishedLive(true);
                    }}
                    style={{
                      ...secondaryButton,
                      whiteSpace: "nowrap"
                    }}
                  >
                    VIEW GAME HISTORY
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    background: "#f0fdf4",
                    color: "#166534",
                    fontWeight: "bold"
                  }}
                >
                  All prizes have been claimed.
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 10
                  }}
                >
                  {finalPrizes.map((prize, prizeIndex) => {
                    const winners = Array.isArray(prize?.winners)
                      ? prize.winners
                      : [];

                    return (
                      <div
                        key={`summary-${prizeIndex}`}
                        style={{
                          padding: 13,
                          borderRadius: 12,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0"
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>
                          {prize.name || `Prize ${prizeIndex + 1}`}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            color: prize.locked ? "#166534" : "#64748b",
                            fontWeight: "bold"
                          }}
                        >
                          {prize.locked ? "WON" : "NOT WON"}
                        </div>

                        {winners.length > 0 && (
                          <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
                            {winners.map((winner, winnerIndex) => (
                              <div key={`summary-winner-${prizeIndex}-${winnerIndex}`}>
                                {winner.playerName || "Player"} - Ticket #{winner.ticketNumber}
                                {" | "}
                                {formatPrizeAmount(winner.prizeShare)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <section style={cardStyle}>
            <h2>Prize Results</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {finalPrizes.map((prize, prizeIndex) => {
                const winners = Array.isArray(prize?.winners) ? prize.winners : [];
                return (
                  <div
                    key={prizeIndex}
                    style={{
                      padding: 15,
                      borderRadius: 12,
                      background: prize.locked ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${prize.locked ? "#bbf7d0" : "#e2e8f0"}`
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: 17 }}>
                      {prize.name || `Prize ${prizeIndex + 1}`}
                    </div>
                    <div style={{ marginTop: 5, color: prize.locked ? "#166534" : "#64748b", fontWeight: "bold" }}>
                      {prize.locked ? "WON" : "NOT WON"}
                      {prize.amount !== "" && prize.amount != null ? ` - ${formatPrizeAmount(prize.amount)}` : ""}
                    </div>
                    {winners.length > 0 ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        {winners.map((winner, winnerIndex) => (
                          <div
                            key={`${prizeIndex}-${winner.bookingId || ""}-${winner.ticketNumber || ""}-${winnerIndex}`}
                            style={{ padding: 9, borderRadius: 9, background: "#fff" }}
                          >
                            <b>{winner.playerName || "Player"}</b> - Ticket #{winner.ticketNumber}
                            {winner.prizeShare != null ? ` - ${formatPrizeAmount(winner.prizeShare)}` : ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, color: "#64748b" }}>No confirmed winner.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <div>
                <h2 style={{ marginBottom: 4 }}>LIVE GAME HISTORY</h2>
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  Read-only history of the game that just finished.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFinalResults(true)}
                style={primaryButton}
              >
                OPEN FINAL SUMMARY
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: 10
              }}
            >
              <div style={{ ...cardStyle, margin: 0, background: "#f8fafc" }}>
                <b>Numbers Called</b>
                <div style={{ fontSize: 28, fontWeight: "bold", marginTop: 6 }}>
                  {calledNumbers.length}
                </div>
              </div>

              <div style={{ ...cardStyle, margin: 0, background: "#f8fafc" }}>
                <b>Last Call</b>
                <div style={{ fontSize: 28, fontWeight: "bold", marginTop: 6 }}>
                  {lastCalled ?? "-"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3>Called Number History</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(48px,1fr))",
                  gap: 7
                }}
              >
                {calledNumbers.map((number, index) => (
                  <div
                    key={`history-number-${index}-${number}`}
                    style={{
                      padding: "9px 5px",
                      borderRadius: 9,
                      background:
                        index === calledNumbers.length - 1
                          ? "#2563eb"
                          : "#eff6ff",
                      color:
                        index === calledNumbers.length - 1
                          ? "#fff"
                          : "#1d4ed8",
                      textAlign: "center",
                      fontWeight: "bold"
                    }}
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Final Winners</h3>
              {finalWinners.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {finalWinners.map((winner, index) => (
                    <div
                      key={`history-winner-${index}`}
                      style={{
                        padding: 11,
                        borderRadius: 10,
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0"
                      }}
                    >
                      <b>{winner.prizeName}</b>
                      <div style={{ marginTop: 3 }}>
                        {winner.playerName || "Player"} - Ticket #{winner.ticketNumber}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          color: "#166534",
                          fontWeight: "bold"
                        }}
                      >
                        Share: {formatPrizeAmount(winner.prizeShare)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>
                  No confirmed winners recorded.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      {liveGame.status === "ended" && viewFinishedLive && (
        <div
          style={{
            position: "sticky",
            top: 10,
            zIndex: 1000,
            maxWidth: 800,
            margin: "10px auto",
            padding: "10px 12px",
            borderRadius: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap"
          }}
        >
          <div style={{ fontWeight: "bold", color: "#1d4ed8" }}>
            GAME FINISHED - VIEWING LIVE GAME HISTORY
          </div>

          <button
            type="button"
            onClick={() => {
              setViewFinishedLive(false);
              setShowFinalResults(true);
            }}
            style={primaryButton}
          >
            OPEN FINAL SUMMARY
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1>{liveGame.game_name}</h1>
          <div
            style={{
              display: "inline-block",
              padding: "8px 18px",
              borderRadius: 30,
              background: "#dcfce7",
              color: "#166534",
              fontWeight: "bold"
            }}
          >
            [DOT] LIVE GAME
          </div>
        </div>

        <section style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ color: "#64748b", fontWeight: "bold" }}>
            LAST CALLED NUMBER
          </div>

          <div
            style={{
              width: 150,
              height: 150,
              margin: "15px auto",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 58,
              fontWeight: "bold",
              boxShadow: "0 10px 30px rgba(37,99,235,.25)"
            }}
          >
            {lastCalled || "-"}
          </div>

          <div style={{ color: "#64748b" }}>
            Numbers called: {calledNumbers.length}/90
          </div>
        </section>

        {playerBooking && (
          <section style={cardStyle}>
            <h2>Your Tickets</h2>
            <p style={{ color: "#64748b" }}>
              Player: <b>{playerBooking.playerName}</b>
            </p>

            {loadingPlayerBookings ? (
              <p style={{ color: "#64748b" }}>
                Loading your tickets...
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(250px,1fr))",
                  gap: 16,
                  alignItems: "start",
                  contain: "layout"
                }}
              >
                {myTicketCards.length ? (
                  myTicketCards.map((ticket) => (
                    <TicketGrid
                      key={`mine-${ticket.number}`}
                      ticket={ticket}
                      selected={false}
                      calledNumbers={calledNumbers}
                      readOnly
                      ownerName={playerBooking.playerName}
                    />
                  ))
                ) : (
                  <p style={{ color: "#64748b" }}>
                    No accepted tickets found for this player yet.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div>
              <h2 style={{ marginBottom: 5 }}>
                All Booked 3x9 Tickets
              </h2>
              <p style={{ color: "#64748b", marginTop: 0 }}>
                Every accepted player's ticket is visible to everyone.
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 9,
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: "bold"
              }}
            >
              {allBookedTickets.length} booked
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              flexWrap: "wrap"
            }}
          >
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search player name or ticket #"
              style={{ ...inputStyle, flex: "1 1 240px" }}
            />

            <button
              type="button"
              onClick={() => setSearchText("")}
              style={secondaryButton}
            >
              [SEARCH] Search / Clear
            </button>
          </div>

          {loadingBookings ? (
            <p style={{ color: "#64748b", marginTop: 18 }}>
              Loading booked tickets...
            </p>
          ) : filteredBookedTickets.length === 0 ? (
            <div
              style={{
                marginTop: 18,
                padding: 20,
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                textAlign: "center",
                color: "#64748b"
              }}
            >
              {allBookedTickets.length === 0
                ? "No accepted tickets found yet."
                : "No tickets match your search."}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(280px,1fr))",
                gap: 18,
                marginTop: 18,
                contain: "layout"
              }}
            >
              {filteredBookedTickets.map((ticket) => (
                <TicketGrid
                  key={`${ticket.bookingId}-${ticket.number}`}
                  ticket={ticket}
                  selected={false}
                  calledNumbers={calledNumbers}
                  readOnly
                  ownerName={ticket.playerName}
                />
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2>Called Numbers</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10,minmax(0,1fr))",
              gap: 7
            }}
          >
            {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => {
              const called = calledNumbers.includes(number);

              return (
                <div
                  key={number}
                  style={{
                    padding: "11px 4px",
                    textAlign: "center",
                    borderRadius: 8,
                    border: called
                      ? "2px solid #2563eb"
                      : "1px solid #e2e8f0",
                    background: called ? "#2563eb" : "#fff",
                    color: called ? "#fff" : "#64748b",
                    fontWeight: "bold"
                  }}
                >
                  {number}
                </div>
              );
            })}
          </div>
        </section>

        <LivePrizeList game={liveGame} />

        <div
          style={{
            textAlign: "center",
            color: "#64748b",
            padding: "10px 0 30px"
          }}
        >
          Stay on this page. The game board will update automatically when
          the host calls a number.
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   WINNER HISTORY
========================================================= */

function WinnerHistory({ history }) {
  return (
    <section style={cardStyle}>
      <h2>Winner History</h2>

      {history.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No confirmed winners yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {history.map((winner, index) => (
            <div
              key={`${winner.prizeName}-${winner.playerName}-${winner.ticketNumber}-${winner.winningNumber}-${index}`}
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0"
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {winner.prizeName}
              </div>

              <div style={{ marginTop: 4 }}>
                {winner.playerName} - Ticket #{winner.ticketNumber}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#166534",
                  fontWeight: "bold"
                }}
              >
                Share: {formatPrizeAmount(winner.prizeShare)}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 13
                }}
              >
                Prize Pool: {formatPrizeAmount(winner.prizeAmount)}
                {" | "}
                Winning Call: #{winner.winningNumber}
                {" | "}
                {winner.winnerCount} winner{winner.winnerCount === 1 ? "" : "s"}
                {" | Confirmed"}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   LIVE PRIZE LIST
========================================================= */

function LivePrizeList({ game }) {
  const prizes = Array.isArray(game.selected_prizes)
    ? game.selected_prizes
    : [];

  return (
    <section style={cardStyle}>
      <h2>[WINNER] Prizes & Winners</h2>

      {prizes.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No prizes have been configured for this game.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {prizes.map((prize, index) => {
            const winners = Array.isArray(prize.winners)
              ? prize.winners
              : [];
            const locked = Boolean(prize.locked);

            return (
              <div
                key={`${prize.name || "prize"}-${index}`}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: locked ? "#ecfdf5" : "#fffbeb",
                  border: locked
                    ? "2px solid #22c55e"
                    : "2px solid #f59e0b"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 16 }}>
                      {prize.name || `Prize ${index + 1}`}
                    </div>
                    {prize.description && (
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 3
                        }}
                      >
                        {prize.description}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      background: locked ? "#16a34a" : "#f59e0b",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 12
                    }}
                  >
                    {locked ? "[WINNER] WON" : "[OPEN] OPEN"}
                  </div>
                </div>

                {locked && winners.length > 0 ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    {winners.map((winner, winnerIndex) => (
                      <div
                        key={`${winner.bookingId || winnerIndex}-${winner.ticketNumber || "ticket"}`}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 8,
                          background: "#fff",
                          border: "1px solid #bbf7d0",
                          fontWeight: "bold"
                        }}
                      >
                        <div>
                          [WINNER] {winner.playerName || "Player"} - Ticket #{winner.ticketNumber}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: "#166534",
                            fontSize: 13
                          }}
                        >
                          Prize Share: {formatPrizeAmount(winner.prizeShare)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#92400e",
                      fontWeight: "bold"
                    }}
                  >
                    Remaining prize - waiting for a winner
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   HOST CONTROL CENTRE
========================================================= */

function HostControlPage({
  game,
  onNewGame,
  onGameUpdated
}) {
  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  const prizes =
    Array.isArray(
      game.selected_prizes
    )
      ? game.selected_prizes
      : [];

  const [
    bookings,
    setBookings
  ] = useState([]);

  const [
    loadingBookings,
    setLoadingBookings
  ] = useState(
    true
  );

  const [
    actionId,
    setActionId
  ] = useState(null);

  const [
    copied,
    setCopied
  ] = useState(false);

  const [
    posterCreating,
    setPosterCreating
  ] = useState(false);

  const [
    shareMessage,
    setShareMessage
  ] = useState("");

  const [
    calledNumbers,
    setCalledNumbers
  ] = useState(
    Array.isArray(
      game.called_numbers
    )
      ? game.called_numbers
      : []
  );

  const [
    gameAction,
    setGameAction
  ] = useState(false);

  const [
    gameError,
    setGameError
  ] = useState("");

  // Live calling controls
  const [
    autoCall,
    setAutoCall
  ] = useState(false);

  const [
    autoCallPaused,
    setAutoCallPaused
  ] = useState(false);

  const [
    callIntervalSeconds,
    setCallIntervalSeconds
  ] = useState(5);

  const [
    callerMode,
    setCallerMode
  ] = useState("fun");

  const [
    callingNumber,
    setCallingNumber
  ] = useState(false);

  const [
    pendingWinnerEvents,
    setPendingWinnerEvents
  ] = useState([]);

  const [
    confirmingWinners,
    setConfirmingWinners
  ] = useState(false);

  const [
    winnerHistory,
    setWinnerHistory
  ] = useState([]);

  const [
    showGameSummary,
    setShowGameSummary
  ] = useState(false);

  const callingRef = useRef(false);

  useEffect(
    () => {
      setCalledNumbers(
        Array.isArray(
          game.called_numbers
        )
          ? game.called_numbers
          : []
      );
    },
    [
      game.called_numbers
    ]
  );

  async function loadBookings() {
    setLoadingBookings(
      true
    );

    try {
      const {
        data,
        error
      } =
        await supabase
          .from(
            "ticket_bookings"
          )
          .select("*")
          .eq(
            "game_id",
            game.id
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );

      if (error) {
        throw error;
      }

      setBookings(
        data || []
      );
    } catch (err) {
      console.error(
        err
      );

      setBookings([]);
    } finally {
      setLoadingBookings(
        false
      );
    }
  }

  useEffect(
    () => {
      loadBookings();

      const channel =
        supabase
          .channel(
            `bookings-${game.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema:
                "public",
              table:
                "ticket_bookings",
              filter:
                `game_id=eq.${game.id}`
            },
            () => {
              loadBookings();
            }
          )
          .subscribe();

      return () => {
        supabase.removeChannel(
          channel
        );
      };
    },
    [
      game.id
    ]
  );

  const pending =
    bookings.filter(
      (b) =>
        b.status ===
        "pending"
    );

  const accepted =
    bookings.filter(
      (b) =>
        b.status ===
        "accepted"
    );

  const rejected =
    bookings.filter(
      (b) =>
        b.status ===
        "rejected"
    );

  async function startGame() {
    if (
      gameAction ||
      game.status === "live"
    ) {
      return;
    }

    setGameAction(true);
    setGameError("");

    try {
      const { error } =
        await supabase
          .from("games")
          .update({
            status: "live"
          })
          .eq(
            "id",
            game.id
          );

      if (error) {
        throw error;
      }

      const updatedGame = {
        ...game,
        status: "live"
      };

      saveHostGame(
        updatedGame
      );

      onGameUpdated(
        updatedGame
      );

    } catch (err) {
      console.error(
        "Could not start game:",
        err
      );

      setGameError(
        err?.message ||
        "Could not start game."
      );

    } finally {
      setGameAction(false);
    }
  }
    
  async function endGame() {
    if (
      gameAction ||
      game.status ===
        "ended"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to end this game?"
      );

    if (!confirmed) {
      return;
    }

    setGameAction(
      true
    );

    setGameError("");

    try {
      const {
        data,
        error
      } =
        await supabase
          .from(
            "games"
          )
          .update({
            status:
              "ended"
          })
          .eq(
            "id",
            game.id
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      const updatedGame =
        data || {
          ...game,
          status:
            "ended"
        };

      saveHostGame(
        updatedGame
      );

      onGameUpdated(
        updatedGame
      );
    } catch (err) {
      console.error(
        "Could not end game:",
        err
      );

      setGameError(
        err?.message ||
        "Could not end game."
      );
    } finally {
      setGameAction(
        false
      );
    }
  }

  async function updateBookingStatus(
    bookingId,
    status
  ) {
    setActionId(
      bookingId
    );

    try {
      const {
        error
      } =
        await supabase
          .from(
            "ticket_bookings"
          )
          .update({
            status
          })
          .eq(
            "id",
            bookingId
          );

      if (error) {
        throw error;
      }

      await loadBookings();
    } catch (err) {
      console.error(
        err
      );

      alert(
        err?.message ||
        "Could not update booking."
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setCopied(
        true
      );

      setTimeout(
        () =>
          setCopied(
            false
          ),
        1500
      );
    } catch {
      window.prompt(
        "Copy game link:",
        inviteUrl
      );
    }
  }

  async function shareGame() {
    if (
      posterCreating
    ) {
      return;
    }

    setPosterCreating(
      true
    );

    setShareMessage("");

    const message =
`[TICKET] ${game.game_name}

[DATE] ${game.game_date || "-"}
[TIME] ${game.game_time || "-"}
[TICKET] Ticket Price: INR ${game.ticket_price || 0}

[TICKET] Game Code: ${game.game_code}

Join Game:
${inviteUrl}`;

    try {
      const poster =
        await createGamePoster(
          game,
          inviteUrl
        );

      const canShareFiles =
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files:
            [poster]
        });

      if (
        canShareFiles
      ) {
        await navigator.share({
          title:
            game.game_name,
          text:
            message,
          files:
            [poster]
        });

        setShareMessage(
          "Poster and game link ready to share!"
        );

        return;
      }

      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            game.game_name,
          text:
            message,
          url:
            inviteUrl
        });

        setShareMessage(
          "Game link shared. Your device does not support sharing the poster as a file."
        );

        return;
      }

      await copyLink();

      setShareMessage(
        "Game link copied. Your browser does not support the share sheet."
      );
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "Could not share game:",
        error
      );

      try {
        await copyLink();

        setShareMessage(
          "Poster could not be shared automatically, so the game link was copied."
        );
      } catch {
        setShareMessage(
          "Could not share the game."
        );
      }
    } finally {
      setPosterCreating(
        false
      );
    }
  }

  const CALLER_PHRASES = {
    1: "First on the board, number 1",
    2: "One little duck, number 2",
    3: "Cup of tea, number 3",
    4: "Knock at the door, number 4",
    5: "Man alive, number 5",
    6: "Half a dozen, number 6",
    7: "Lucky seven, number 7",
    8: "Garden gate, number 8",
    9: "Doctor's orders, number 9",
    10: "Big fat hen, number 10",
    11: "Legs eleven, number 11",
    12: "One dozen, number 12",
    13: "Unlucky for some, number 13",
    14: "Valentine's Day, number 14",
    15: "Young and keen, number 15",
    16: "Sweet sixteen, number 16",
    17: "Dancing queen, number 17",
    18: "Coming of age, number 18",
    19: "Goodbye teens, number 19",
    20: "One score, number 20",
    21: "Key to the door, number 21",
    22: "Two little ducks, number 22",
    23: "You and me, number 23",
    24: "Two dozen, number 24",
    25: "Silver jubilee, number 25",
    26: "Republic Day, number 26",
    27: "Gateway to heaven, number 27",
    28: "Duck and its mate, number 28",
    29: "Rise and shine, number 29",
    30: "Flirty thirty, number 30",
    31: "Get up and run, number 31",
    32: "Buckle my shoe, number 32",
    33: "All the threes, number 33",
    34: "Dil maange more, number 34",
    35: "Jump and jive, number 35",
    36: "Three dozen, number 36",
    37: "Mixed luck, number 37",
    38: "Christmas cake, number 38",
    39: "The thirty-nine steps, number 39",
    40: "Life begins at forty, number 40",
    41: "Time for fun, number 41",
    42: "The answer to life, number 42",
    43: "Down on your knees, number 43",
    44: "All the fours, number 44",
    45: "Halfway there, number 45",
    46: "Up to tricks, number 46",
    47: "Four and seven, number 47",
    48: "Four dozen, number 48",
    49: "Rise and shine, number 49",
    50: "Half a century, number 50",
    51: "Charity begins at fifty-one, number 51",
    52: "Pack of cards, number 52",
    53: "Stuck in the tree, number 53",
    54: "Clean the floor, number 54",
    55: "Snakes alive, number 55",
    56: "Pick up sticks, number 56",
    57: "Fifty-seven varieties, number 57",
    58: "Make them wait, number 58",
    59: "Brighton line, number 59",
    60: "Diamond jubilee, number 60",
    61: "Baker's bun, number 61",
    62: "Turn the screw, number 62",
    63: "Tickle me, number 63",
    64: "Almost retired, number 64",
    65: "Retirement time, number 65",
    66: "Clickety click, number 66",
    67: "Stairway to heaven, number 67",
    68: "Pick a mate, number 68",
    69: "Ulta pulta, number 69",
    70: "Three score and ten, number 70",
    71: "Bang on the drum, number 71",
    72: "Six dozen, number 72",
    73: "Queen bee, number 73",
    74: "Hit the floor, number 74",
    75: "Strive and strive, number 75",
    76: "Seventy-six trombones, number 76",
    77: "Double lucky seven, number 77",
    78: "Lucky seth, number 78",
    79: "One more time, number 79",
    80: "Eight and zero, number 80",
    81: "Stop and run, number 81",
    82: "Straight on through, number 82",
    83: "Time for tea, number 83",
    84: "Seven dozen, number 84",
    85: "Staying alive, number 85",
    86: "Between the sticks, number 86",
    87: "Last of luck, number 87",
    88: "Two fat ladies, number 88",
    89: "Nearly there, number 89",
    90: "Top of the house, number 90"
  };

  const INDIAN_CALLER_PHRASES = {
    1: "Ek number, shuruaat zabardast",
    2: "Do chhote ducks, number 2",
    3: "Cup of chai, number 3",
    4: "Darwaze par knock, number 4",
    5: "Paanch ka punch, number 5",
    6: "Chhe, aadha dozen",
    7: "Lucky saat, number 7",
    8: "Aath ka aath, number 8",
    9: "Nau, doctor ka number",
    10: "Das ka dum, number 10",
    11: "Gyarah, legs eleven",
    12: "Ek dozen, baarah",
    13: "Terah, unlucky for some",
    14: "Chaudah, Valentine special",
    15: "Pandrah, quarter century ki taraf",
    16: "Solah, sweet sixteen",
    17: "Satrah, dancing queen ke kareeb",
    18: "Atharah, coming of age",
    19: "Unnis, almost twenty",
    20: "Bees, score number 20",
    21: "Ikkis, key of the door",
    22: "Baais, do little ducks",
    23: "Teis, you and me",
    24: "Chaubees, two dozen",
    25: "Pachchees, quarter century",
    30: "Tees, dirty thirty",
    40: "Chalees, life begins at forty",
    50: "Pachaas, half century",
    60: "Saath, sixty on the board",
    66: "Chhiyaasath, clickety click",
    69: "Unhattar, ulta pulta",
    77: "Sattaattar, double lucky seven",
    88: "Athaasi, two fat ladies",
    90: "Nabbe, top of the house"
  };

  function getCallerPhrase(number) {
    if (callerMode === "classic") {
      return `Number ${number}`;
    }

    if (callerMode === "indian") {
      return (
        INDIAN_CALLER_PHRASES[number] ||
        `Agla number hai ${number}, dhyaan se dekhiye!`
      );
    }

    return (
      CALLER_PHRASES[number] ||
      `Number ${number}`
    );
  }

  function announceNumber(number) {
    try {
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const phrase = getCallerPhrase(number);

      const utterance = new SpeechSynthesisUtterance(
        phrase
      );
      utterance.rate = 0.88;
      utterance.pitch = 1.02;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Could not announce number:", err);
    }
  }

  function playCallSound() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        880,
        context.currentTime + 0.12
      );

      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        context.currentTime + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.22
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);

      oscillator.onended = () => {
        context.close().catch(() => {});
      };
    } catch (err) {
      console.error("Could not play call sound:", err);
    }
  }

  function detectWinnersForCall(nextNumber, nextCalledNumbers) {
    const acceptedBookings = bookings.filter(
      (booking) => booking.status === "accepted"
    );

    if (!acceptedBookings.length) {
      return [];
    }

    const currentPrizes = Array.isArray(game.selected_prizes)
      ? game.selected_prizes
      : [];

    const events = [];

    currentPrizes.forEach((prize, prizeIndex) => {
      if (prize?.locked) return;

      const winners = findPrizeWinners(
        prize,
        acceptedBookings,
        nextCalledNumbers,
        nextNumber,
        game.game_code
      );

      if (winners.length) {
        const prizeAmount = Number(prize.amount) || 0;
        const shares = calculateWinnerShares(
          prizeAmount,
          winners.length
        );

        const winnersWithShares = winners.map(
          (winner, winnerIndex) => ({
            ...winner,
            prizeAmount,
            winnerCount: winners.length,
            prizeShare: shares[winnerIndex]
          })
        );

        events.push({
          prizeIndex,
          prizeName: prize.name || `Prize ${prizeIndex + 1}`,
          prizeAmount,
          winningNumber: nextNumber,
          winnerCount: winnersWithShares.length,
          winners: winnersWithShares
        });
      }
    });

    if (!events.length) {
      return [];
    }

    setPendingWinnerEvents(events);

    window.setTimeout(() => {
      speakWinnerAnnouncement(events);
    }, 950);

    window.setTimeout(() => {
      confirmWinnerEvents(events);
    }, 300);

    return events;
  }

  function recordWinnerHistory(events) {
    if (!Array.isArray(events) || !events.length) {
      return;
    }

    setWinnerHistory((current) => {
      const existingKeys = new Set(
        current.map(
          (item) =>
            `${item.prizeName}|${item.playerName}|${item.ticketNumber}|${item.winningNumber}`
        )
      );

      const entries = [];

      events.forEach((event) => {
        if (!Array.isArray(event.winners)) {
          return;
        }

        event.winners.forEach((winner) => {
          const item = {
            prizeName: event.prizeName,
            prizeAmount: event.prizeAmount,
            winnerCount:
              event.winnerCount || event.winners.length,
            playerName:
              winner.playerName || "Player",
            ticketNumber:
              winner.ticketNumber,
            prizeShare:
              winner.prizeShare,
            winningNumber:
              event.winningNumber,
            confirmedAt:
              new Date().toISOString()
          };

          const key =
            `${item.prizeName}|${item.playerName}|${item.ticketNumber}|${item.winningNumber}`;

          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            entries.push(item);
          }
        });
      });

      return [
        ...current,
        ...entries
      ];
    });
  }

  function getConfirmedPrizeResults() {
    const prizes = Array.isArray(game.selected_prizes) ? game.selected_prizes : [];
    return prizes.map((prize, index) => ({
      ...prize,
      index,
      winners: Array.isArray(prize?.winners) ? prize.winners : []
    }));
  }

  function hasConfirmedFullHouse() {
    return getConfirmedPrizeResults().some(
      (prize) => getPrizePattern(prize?.name) === "full_house" && prize?.locked
    );
  }

  async function confirmWinnerEvents(eventsOverride = null) {
    const eventsToConfirm =
      Array.isArray(eventsOverride) && eventsOverride.length
        ? eventsOverride
        : pendingWinnerEvents;

    if (!eventsToConfirm.length || confirmingWinners) {
      return;
    }

    setConfirmingWinners(true);
    setGameError("");

    try {
      const currentPrizes = Array.isArray(game.selected_prizes)
        ? game.selected_prizes
        : [];

      const updatedPrizes = currentPrizes.map((prize, index) => {
        const event = eventsToConfirm.find(
          (item) => item.prizeIndex === index
        );

        if (!event || prize?.locked) {
          return prize;
        }

        const existingWinners = Array.isArray(prize.winners)
          ? prize.winners
          : [];

        const mergedWinners = [...existingWinners];
        const seen = new Set(
          mergedWinners.map(
            (winner) => `${winner.bookingId || ""}:${winner.ticketNumber || ""}`
          )
        );

        event.winners.forEach((winner) => {
          const key = `${winner.bookingId || ""}:${winner.ticketNumber || ""}`;
          if (seen.has(key)) return;
          seen.add(key);
          mergedWinners.push(winner);
        });

        return {
          ...prize,
          winners: mergedWinners,
          locked: true,
          lockedAt: new Date().toISOString()
        };
      });

      const { data, error } = await supabase
        .from("games")
        .update({
          selected_prizes: updatedPrizes
        })
        .eq("id", game.id)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      const updatedGame = data || {
        ...game,
        selected_prizes: updatedPrizes
      };

      saveHostGame(updatedGame);
      onGameUpdated(updatedGame);
      recordWinnerHistory(eventsToConfirm);

      const allPrizesClaimed =
        updatedPrizes.length > 0 &&
        updatedPrizes.every((prize) => prize?.locked);

      if (allPrizesClaimed) {
        const endedUpdate = await supabase
          .from("games")
          .update({
            selected_prizes: updatedPrizes,
            status: "ended"
          })
          .eq("id", game.id)
          .select()
          .maybeSingle();

        if (endedUpdate.error) {
          throw endedUpdate.error;
        }

        const endedGame = endedUpdate.data || {
          ...updatedGame,
          selected_prizes: updatedPrizes,
          status: "ended"
        };

        setAutoCall(false);
        setAutoCallPaused(false);
        saveHostGame(endedGame);
        onGameUpdated(endedGame);
      }

      window.setTimeout(() => {
        setPendingWinnerEvents([]);
      }, allPrizesClaimed ? 1500 : 3500);
    } catch (err) {
      console.error("Could not confirm winner:", err);
      setGameError(
        err?.message || "Could not confirm the winner. Please try again."
      );
    } finally {
      setConfirmingWinners(false);
    }
  }

  async function callNextNumber() {
    if (
      game.status !== "live" ||
      callingRef.current ||
      calledNumbers.length >= 90 ||
      confirmingWinners
    ) {
      return false;
    }

    callingRef.current = true;
    setCallingNumber(true);
    setGameError("");

    try {
      const currentCalled = Array.isArray(calledNumbers)
        ? calledNumbers
        : [];

      const remaining = Array.from(
        { length: 90 },
        (_, index) => index + 1
      ).filter(
        (number) => !currentCalled.includes(number)
      );

      if (!remaining.length) {
        return false;
      }

      const nextNumber =
        remaining[Math.floor(Math.random() * remaining.length)];

      const next = [
        ...currentCalled,
        nextNumber
      ];

      const { data, error } = await supabase
        .from("games")
        .update({
          called_numbers: next
        })
        .eq("id", game.id)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      const updatedGame = data || {
        ...game,
        called_numbers: next
      };

      setCalledNumbers(next);
      saveHostGame(updatedGame);
      onGameUpdated(updatedGame);

      detectWinnersForCall(nextNumber, next);

      playCallSound();

      // Small delay makes the sound lead naturally into the voice.
      window.setTimeout(() => {
        announceNumber(nextNumber);
      }, 260);

      return true;
    } catch (err) {
      console.error("Could not call next number:", err);
      setGameError(
        err?.message || "Could not call the next number."
      );
      return false;
    } finally {
      callingRef.current = false;
      setCallingNumber(false);
    }
  }

  useEffect(() => {
    if (
      !autoCall ||
      autoCallPaused ||
      game.status !== "live" ||
      calledNumbers.length >= 90 ||
      confirmingWinners
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      callNextNumber();
    }, Math.max(3, Number(callIntervalSeconds) || 5) * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    autoCall,
    autoCallPaused,
    game.status,
    game.id,
    calledNumbers.length,
    callIntervalSeconds,
    confirmingWinners
  ]);

  useEffect(() => {
    if (calledNumbers.length >= 90) {
      setAutoCall(false);
      setAutoCallPaused(false);
    }
  }, [calledNumbers.length]);

  async function toggleCalledNumber(
    number
  ) {
    if (
      game.status !==
      "live" ||
      confirmingWinners
    ) {
      return;
    }

    const exists =
      calledNumbers.includes(
        number
      );

    const next =
      exists
        ? calledNumbers.filter(
            (n) =>
              n !==
              number
          )
        : [
            ...calledNumbers,
            number
          ].sort(
            (a, b) =>
              a - b
          );

    setCalledNumbers(
      next
    );

    const localUpdated = {
      ...game,
      called_numbers:
        next
    };

    saveHostGame(
      localUpdated
    );

    onGameUpdated(
      localUpdated
    );

    if (!exists) {
      detectWinnersForCall(number, next);
    }

    try {
      const {
        error
      } =
        await supabase
          .from(
            "games"
          )
          .update({
            called_numbers:
              next
          })
          .eq(
            "id",
            game.id
          );

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error(
        "Could not save called number:",
        err
      );

      setGameError(
        err?.message ||
        "Could not save called number."
      );
    }
  }

  function ticketNumbersText(
    booking
  ) {
    const numbers =
      Array.isArray(
        booking.ticket_numbers
      )
        ? [
            ...booking.ticket_numbers
          ]
        : [];

    return numbers.length
      ? numbers
          .sort(
            (a, b) =>
              a - b
          )
          .map(
            (n) =>
              `#${n}`
          )
          .join(
            ", "
          )
      : "-";
  }

  const isLive =
    game.status ===
    "live";

  const isEnded =
    game.status ===
    "ended";

  return (
    <main
      style={
        pageStyle
      }
    >
      <div
        style={{
          maxWidth:
            1000,
          margin:
            "0 auto"
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            marginBottom:
              20
          }}
        >
          <h1>
            {
              game.game_name
            }
          </h1>

          <p
            style={{
              color:
                "#64748b"
            }}
          >
            Host Control Centre
          </p>
        </div>

        <section
          style={{
            ...cardStyle,
            border:
              isLive
                ? "2px solid #22c55e"
                : isEnded
                ? "2px solid #94a3b8"
                : "1px solid #f59e0b"
          }}
        >
          <h2>
            Game Status
          </h2>

          <div
            style={{
              display:
                "inline-block",
              padding:
                "10px 18px",
              borderRadius:
                25,
              background:
                isLive
                  ? "#dcfce7"
                  : isEnded
                  ? "#e2e8f0"
                  : "#fef3c7",
              color:
                isLive
                  ? "#166534"
                  : isEnded
                  ? "#475569"
                  : "#92400e",
              fontWeight:
                "bold",
              fontSize:
                18
            }}
          >
            {isLive
              ? "[DOT] GAME LIVE"
              : isEnded
              ? "GAME ENDED"
              : "GAME UPCOMING"}
          </div>

          {gameError && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  12,
                borderRadius:
                  10,
                background:
                  "#fef2f2",
                color:
                  "#b91c1c",
                fontWeight:
                  "bold"
              }}
            >
              {
                gameError
              }
            </div>
          )}
        </section>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Game Details
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12
            }}
          >
            <InfoBox
              title="Game Code"
              value={
                game.game_code
              }
            />

            <InfoBox
              title="Date"
              value={
                game.game_date ||
                "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time ||
                "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`INR ${
                game.ticket_price ||
                0
              }`}
            />

            <InfoBox
              title="Ticket Limit"
              value={
                game.ticket_limit ||
                0
              }
            />

            <InfoBox
              title="Theme"
              value={
                game.theme ||
                "Classic"
              }
            />
          </div>
        </section>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Share Game
          </h2>

          <p
            style={{
              color:
                "#64748b"
            }}
          >
            Share Game automatically
            creates a real PNG poster
            containing the game details
            and joining link.
          </p>

          <input
            readOnly
            value={
              inviteUrl
            }
            style={{
              ...inputStyle,
              marginBottom:
                10
            }}
          />

          <div
            style={{
              display:
                "flex",
              gap: 8,
              flexWrap:
                "wrap"
            }}
          >
            <button
              onClick={
                copyLink
              }
              style={
                secondaryButton
              }
            >
              {copied
                ? "[OK] Copied"
                : "Copy Link"}
            </button>

            <button
              onClick={
                shareGame
              }
              disabled={
                posterCreating
              }
              style={{
                ...primaryButton,
                opacity:
                  posterCreating
                    ? 0.6
                    : 1
              }}
            >
              {posterCreating
                ? "Creating Poster..."
                : "[STYLE] Share Game + Poster"}
            </button>
          </div>

          {shareMessage && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  12,
                borderRadius:
                  10,
                background:
                  "#eff6ff",
                color:
                  "#1d4ed8",
                fontWeight:
                  "bold"
              }}
            >
              {
                shareMessage
              }
            </div>
          )}
        </section>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Ticket Bookings
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 10
            }}
          >
            <StatusBox
              title="Pending"
              value={
                pending.length
              }
            />

            <StatusBox
              title="Accepted"
              value={
                accepted.length
              }
            />

            <StatusBox
              title="Rejected"
              value={
                rejected.length
              }
            />
          </div>
        </section>

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Player Booking Requests
          </h2>

          {loadingBookings ? (
            <p>
              Loading bookings...
            </p>
          ) : bookings.length ===
            0 ? (
            <div
              style={{
                padding:
                  20,
                textAlign:
                  "center",
                background:
                  "#f8fafc",
                borderRadius:
                  10,
                color:
                  "#64748b"
              }}
            >
              No player bookings
              yet.
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",
                gap:
                  12
              }}
            >
              {bookings.map(
                (
                  booking
                ) => {
                  const status =
                    String(
                      booking.status ||
                        "pending"
                    ).toLowerCase();

                  return (
                    <div
                      key={
                        booking.id
                      }
                      style={{
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          12,
                        padding:
                          15,
                        background:
                          "#fff"
                      }}
                    >
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(150px,1fr))",
                          gap:
                            12
                        }}
                      >
                        <InfoBox
                          title="Player Name"
                          value={
                            booking.player_name ||
                            "-"
                          }
                        />

                        <InfoBox
                          title="Ticket Numbers"
                          value={ticketNumbersText(
                            booking
                          )}
                        />

                        <InfoBox
                          title="Ticket Count"
                          value={
                            Array.isArray(
                              booking.ticket_numbers
                            )
                              ? booking
                                  .ticket_numbers
                                  .length
                              : 0
                          }
                        />

                        <InfoBox
                          title="Status"
                          value={status.toUpperCase()}
                        />
                      </div>

                      {status ===
                        "pending" && (
                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              10,
                            marginTop:
                              14,
                            flexWrap:
                              "wrap"
                          }}
                        >
                          <button
                            disabled={
                              actionId ===
                              booking.id
                            }
                            onClick={() =>
                              updateBookingStatus(
                                booking.id,
                                "accepted"
                              )
                            }
                            style={{
                              ...primaryButton,
                              background:
                                "#16a34a",
                              opacity:
                                actionId ===
                                booking.id
                                  ? 0.5
                                  : 1
                            }}
                          >
                            [OK] APPROVE
                          </button>

                          <button
                            disabled={
                              actionId ===
                              booking.id
                            }
                            onClick={() =>
                              updateBookingStatus(
                                booking.id,
                                "rejected"
                              )
                            }
                            style={{
                              ...secondaryButton,
                              color:
                                "#dc2626",
                              border:
                                "1px solid #fca5a5",
                              opacity:
                                actionId ===
                                booking.id
                                  ? 0.5
                                  : 1
                            }}
                          >
                            [X] REJECT
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section
          style={{
            ...cardStyle,
            border:
              isLive
                ? "2px solid #22c55e"
                : "1px solid #e5e7eb"
          }}
        >
          <h2>
            Game Control
          </h2>

          <p
            style={{
              color:
                "#64748b"
            }}
          >
            When you press START GAME,
            every player's game link
            will automatically change
            from the booking page to
            the live game page.
          </p>

          <div
            style={{
              display:
                "flex",
              gap:
                10,
              flexWrap:
                "wrap"
            }}
          >
            <button
              type="button"
              onClick={
                startGame
              }
              disabled={
                gameAction ||
                isLive ||
                isEnded
              }
              style={{
                ...primaryButton,
                background:
                  isLive
                    ? "#16a34a"
                    : "#2563eb",
                opacity:
                  gameAction ||
                  isLive ||
                  isEnded
                    ? 0.55
                    : 1,
                minWidth:
                  180
              }}
            >
              {gameAction
                ? "STARTING..."
                : isLive
                ? "[OK] GAME IS LIVE"
                : "START GAME"}
            </button>

            <button
              type="button"
              onClick={
                endGame
              }
              disabled={
                gameAction ||
                !isLive
              }
              style={{
                ...secondaryButton,
                color:
                  "#dc2626",
                border:
                  "1px solid #fca5a5",
                opacity:
                  gameAction ||
                  !isLive
                    ? 0.5
                    : 1,
                minWidth:
                  150
              }}
            >
              {gameAction
                ? "PLEASE WAIT..."
                : "END GAME"}
            </button>
          </div>
        </section>

        {isLive && (
          <section
            style={{
              ...cardStyle,
              border:
                "2px solid #22c55e"
            }}
          >
            <h2>
              Live Game Number Control
            </h2>

            <div
              style={{
                textAlign:
                  "center",
                marginBottom:
                  18
              }}
            >
              <div
                style={{
                  color:
                    "#64748b"
                }}
              >
                LAST CALLED NUMBER
              </div>

              <div
                style={{
                  fontSize:
                    55,
                  fontWeight:
                    "bold",
                  color:
                    "#2563eb",
                  marginTop:
                    5
                }}
              >
                {calledNumbers.length
                  ? calledNumbers[
                      calledNumbers.length -
                        1
                    ]
                  : "-"}
              </div>

              <div
                style={{
                  color:
                    "#64748b"
                }}
              >
                {
                  calledNumbers.length
                } / 90 called
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(140px,1fr))",
                gap: 10,
                marginBottom: 18
              }}
            >
              <button
                type="button"
                onClick={() => setAutoCall((current) => !current)}
                disabled={callingNumber || calledNumbers.length >= 90 || confirmingWinners}
                style={{
                  ...primaryButton,
                  background: autoCall ? "#16a34a" : "#2563eb",
                  opacity:
                    callingNumber || calledNumbers.length >= 90
                      ? 0.55
                      : 1
                }}
              >
                {autoCall ? "[STOP] STOP AUTO CALL" : "[PLAY] AUTO CALL"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAutoCallPaused((current) => !current)
                }
                disabled={!autoCall || callingNumber || pendingWinnerEvents.length > 0}
                style={{
                  ...secondaryButton,
                  opacity: !autoCall || callingNumber ? 0.55 : 1
                }}
              >
                {autoCallPaused ? "[PLAY] RESUME AUTO CALL" : "[PAUSE] PAUSE AUTO CALL"}
              </button>

              <button
                type="button"
                onClick={() => callNextNumber()}
                disabled={
                  callingNumber ||
                  game.status !== "live" ||
                  calledNumbers.length >= 90 ||
                  pendingWinnerEvents.length > 0
                }
                style={{
                  ...secondaryButton,
                  opacity:
                    callingNumber ||
                    game.status !== "live" ||
                    calledNumbers.length >= 90
                      ? 0.55
                      : 1
                }}
              >
                {callingNumber ? "CALLING..." : "[TAMBOLA] CALL NEXT"}
              </button>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "#f8fafc",
                  fontWeight: "bold"
                }}
              >
                Every
                <select
                  value={callIntervalSeconds}
                  onChange={(e) =>
                    setCallIntervalSeconds(Number(e.target.value))
                  }
                  disabled={autoCall || callingNumber}
                  style={{
                    padding: "7px 8px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1"
                  }}
                >
                  <option value={3}>3 sec</option>
                  <option value={5}>5 sec</option>
                  <option value={7}>7 sec</option>
                  <option value={10}>10 sec</option>
                  <option value={15}>15 sec</option>
                </select>
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 8,
                marginBottom: 12
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "#f8fafc",
                  fontWeight: "bold"
                }}
              >
                <span>[CALLER] Caller Style</span>
                <select
                  value={callerMode}
                  onChange={(e) => setCallerMode(e.target.value)}
                  disabled={callingNumber}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: "bold"
                  }}
                >
                  <option value="classic">Classic</option>
                  <option value="indian"> Indian / Hinglish</option>
                  <option value="fun">[CELEBRATE] Fun</option>
                </select>
              </label>
            </div>

            <div
              style={{
                padding: "10px 12px",
                marginBottom: 16,
                borderRadius: 10,
                background: autoCallPaused
                  ? "#fef3c7"
                  : autoCall
                  ? "#dcfce7"
                  : "#f1f5f9",
                color: autoCallPaused
                  ? "#92400e"
                  : autoCall
                  ? "#166534"
                  : "#475569",
                textAlign: "center",
                fontWeight: "bold"
              }}
            >
              {autoCallPaused
                ? "[PAUSE] AUTO CALL PAUSED"
                : autoCall
                ? `[VOICE] AUTO CALL ACTIVE - every ${callIntervalSeconds} seconds`
                : "AUTO CALL OFF - use CALL NEXT or select a number manually"}
            </div>

            {pendingWinnerEvents.length > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: "#ecfdf5",
                  color: "#166534",
                  textAlign: "center",
                  fontWeight: "bold"
                }}
              >
                [WINNER] WINNER ANNOUNCED - PRIZE AUTOMATICALLY LOCKED
              </div>
            )}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(10,1fr)",
                gap: 7
              }}
            >
              {Array.from(
                {
                  length:
                    90
                },
                (
                  _,
                  i
                ) =>
                  i + 1
              ).map(
                (
                  number
                ) => {
                  const called =
                    calledNumbers.includes(
                      number
                    );

                  return (
                    <button
                      key={
                        number
                      }
                      type="button"
                      onClick={() =>
                        toggleCalledNumber(
                          number
                        )
                      }
                      disabled={callingNumber || pendingWinnerEvents.length > 0}
                      style={{
                        padding:
                          "10px 3px",
                        borderRadius:
                          8,
                        border:
                          called
                            ? "2px solid #2563eb"
                            : "1px solid #cbd5e1",
                        background:
                          called
                            ? "#2563eb"
                            : "#fff",
                        color:
                          called
                            ? "#fff"
                            : "#111827",
                        fontWeight:
                          "bold",
                        cursor:
                          "pointer"
                      }}
                    >
                      {
                        number
                      }
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        {!isLive && (
          <section
            style={
              cardStyle
            }
          >
            <h2>
              Called Numbers
            </h2>

            <p
              style={{
                color:
                  "#64748b"
              }}
            >
              Start the game before
              calling numbers.
            </p>
          </section>
        )}

        <WinnerHistory history={winnerHistory} />

        <LivePrizeList game={game} />

        {pendingWinnerEvents.length > 0 && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              zIndex: 9999
            }}
          >
            <section
              style={{
                width: "100%",
                maxWidth: 620,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 22,
                padding: 24,
                boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: 54 }}>[WINNER]</div>
              <h2 style={{ margin: "8px 0 6px" }}>WINNER DETECTED!</h2>
              <p style={{ color: "#64748b", marginTop: 0 }}>
                Winners are announced and prizes are locked automatically. Auto Call continues.
              </p>

              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                {pendingWinnerEvents.map((event) => (
                  <div
                    key={`${event.prizeIndex}-${event.winningNumber}`}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: "#ecfdf5",
                      border: "2px solid #22c55e"
                    }}
                  >
                    <div
                      style={{
                        color: "#166534",
                        fontWeight: "bold",
                        fontSize: 20
                      }}
                    >
                      [CELEBRATE] {event.prizeName} WON!
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "grid",
                        gap: 6
                      }}
                    >
                      {event.winners.map((winner, index) => (
                        <div
                          key={`${winner.bookingId}-${winner.ticketNumber}-${index}`}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "#fff",
                            fontWeight: "bold"
                          }}
                        >
                          <div>
                            [PLAYER] {winner.playerName} - [TICKET] Ticket #{winner.ticketNumber}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: "#166534",
                              fontSize: 13
                            }}
                          >
                            Share: {formatPrizeAmount(winner.prizeShare)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#64748b",
                        fontSize: 13
                      }}
                    >
                      Winning call: #{event.winningNumber}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 10,
                        background: "#f0fdf4",
                        color: "#166534",
                        fontWeight: "bold",
                        fontSize: 13
                      }}
                    >
                      Prize Pool: {formatPrizeAmount(event.prizeAmount)}
                      {event.winnerCount > 1
                        ? ` - Split equally among ${event.winnerCount} winners`
                        : " - Single winner"}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: 14,
                  boxSizing: "border-box",
                  borderRadius: 12,
                  background: "#ecfdf5",
                  color: "#166534",
                  fontWeight: "bold"
                }}
              >
                [OK] WINNER POSTED AND PRIZE LOCKED AUTOMATICALLY
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fffbeb",
                  color: "#92400e",
                  fontWeight: "bold"
                }}
              >
                Auto Call continues. Remaining prizes stay OPEN until they are won.
              </div>
            </section>
          </div>
        )}

        {hasConfirmedFullHouse() && game.status === "live" && (
          <button
            type="button"
            onClick={() => setShowGameSummary(true)}
            style={{
              ...primaryButton,
              width: "100%",
              marginBottom: 12,
              background: "#7c3aed"
            }}
          >
            VIEW GAME SUMMARY
          </button>
        )}

        {showGameSummary && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              zIndex: 10000
            }}
          >
            <section
              style={{
                width: "100%",
                maxWidth: 720,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 22,
                padding: 24,
                boxShadow: "0 25px 70px rgba(0,0,0,0.35)"
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h2 style={{ marginTop: 0 }}>GAME SUMMARY</h2>
                <p style={{ color: "#64748b" }}>
                  Full House has been confirmed. Review all confirmed prizes before ending the game.
                </p>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {getConfirmedPrizeResults().map((prize) => (
                  <div
                    key={prize.index}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: prize.locked ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${prize.locked ? "#bbf7d0" : "#e2e8f0"}`
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      {prize.name || `Prize ${prize.index + 1}`}
                    </div>
                    <div style={{ marginTop: 4, color: prize.locked ? "#166534" : "#64748b" }}>
                      {prize.locked ? "CONFIRMED" : "NOT WON"}
                      {prize.amount !== "" && prize.amount != null ? ` - ${formatPrizeAmount(prize.amount)}` : ""}
                    </div>
                    {prize.winners.length > 0 && (
                      <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
                        {prize.winners.map((winner, i) => (
                          <div key={`${prize.index}-${winner.bookingId || ""}-${winner.ticketNumber || ""}-${i}`}>
                            {winner.playerName || "Player"} - Ticket #{winner.ticketNumber}
                            {winner.prizeShare != null ? ` - ${formatPrizeAmount(winner.prizeShare)}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={endGame}
                  disabled={gameAction}
                  style={{ ...primaryButton, width: "100%", background: "#dc2626" }}
                >
                  {gameAction ? "ENDING GAME..." : "END GAME & SHOW FINAL RESULTS"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGameSummary(false)}
                  disabled={gameAction}
                  style={{ ...secondaryButton, width: "100%" }}
                >
                  BACK TO LIVE GAME
                </button>
              </div>
            </section>
          </div>
        )}

        <button
          onClick={
            onNewGame
          }
          style={{
            ...secondaryButton,
            width:
              "100%"
          }}
        >
          Create Another Game
        </button>
      </div>
    </main>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function InfoBox({
  title,
  value
}) {
  return (
    <div
      style={{
        padding:
          14,
        border:
          "1px solid #e5e7eb",
        borderRadius:
          10,
        background:
          "#f8fafc"
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            13,
          marginBottom:
            5
        }}
      >
        {
          title
        }
      </div>

      <b>
        {
          value
        }
      </b>
    </div>
  );
}

function StatusBox({
  title,
  value
}) {
  return (
    <div
      style={{
        padding:
          14,
        textAlign:
          "center",
        border:
          "1px solid #e5e7eb",
        borderRadius:
          10,
        background:
          "#f8fafc"
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            13
        }}
      >
        {
          title
        }
      </div>

      <div
        style={{
          fontSize:
            24,
          fontWeight:
            "bold",
          marginTop:
            5
        }}
      >
        {
          value
        }
      </div>
    </div>
  );
}

/* =========================================================
   APP ROUTING
========================================================= */

function App() {
  const [
    playerCode
  ] = useState(
    () =>
      getGameFromUrl()
  );

  const [
    game,
    setGame
  ] = useState(
    () =>
      getSavedHostGame()
  );

  const [
    playerGame,
    setPlayerGame
  ] = useState(
    null
  );

  const [
    loading,
    setLoading
  ] = useState(
    true
  );

  /* -------------------------------------------------------
     PLAYER GAME LOADING + REAL-TIME STATUS
  ------------------------------------------------------- */

  useEffect(
    () => {
      if (
        playerCode
      ) {
        const cleanCode =
          String(
            playerCode
          )
            .trim()
            .toUpperCase();

        loadPlayerGame(
          cleanCode
        );

        const channel =
          supabase
            .channel(
              `player-game-${cleanCode}`
            )
            .on(
              "postgres_changes",
              {
                event:
                  "UPDATE",
                schema:
                  "public",
                table:
                  "games",
                filter:
                  `game_code=eq.${cleanCode}`
              },
              (
                payload
              ) => {
                if (
                  payload?.new
                ) {
                  setPlayerGame(
                    payload.new
                  );
                }
              }
            )
            .subscribe();

        const interval =
          setInterval(
            () =>
              loadPlayerGame(
                cleanCode
              ),
            2000
          );

        return () => {
          clearInterval(
            interval
          );

          supabase.removeChannel(
            channel
          );
        };
      }

      setLoading(
        false
      );

      return undefined;
    },
    [
      playerCode
    ]
  );

  /* -------------------------------------------------------
     HOST GAME REAL-TIME SYNC
  ------------------------------------------------------- */

  useEffect(
    () => {
      if (
        playerCode ||
        !game?.id
      ) {
        return undefined;
      }

      const channel =
        supabase
          .channel(
            `host-game-${game.id}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "UPDATE",
              schema:
                "public",
              table:
                "games",
              filter:
                `id=eq.${game.id}`
            },
            (
              payload
            ) => {
              if (
                payload?.new
              ) {
                setGame(
                  payload.new
                );

                saveHostGame(
                  payload.new
                );
              }
            }
          )
          .subscribe();

      const interval =
        setInterval(
          async () => {
            const {
              data,
              error
            } =
              await supabase
                .from(
                  "games"
                )
                .select("*")
                .eq(
                  "id",
                  game.id
                )
                .maybeSingle();

            if (
              !error &&
              data
            ) {
              setGame(
                data
              );

              saveHostGame(
                data
              );
            }
          },
          3000
        );

      return () => {
        clearInterval(
          interval
        );

        supabase.removeChannel(
          channel
        );
      };
    },
    [
      playerCode,
      game?.id
    ]
  );

  async function loadPlayerGame(
    code
  ) {
    try {
      if (!code) {
        setPlayerGame(
          null
        );

        return;
      }

      const {
        data,
        error
      } =
        await supabase
          .from(
            "games"
          )
          .select("*")
          .eq(
            "game_code",
            code
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      setPlayerGame((current) => {
        if (!data) {
          return null;
        }

        if (
          current &&
          current.id === data.id &&
          current.status === data.status &&
          JSON.stringify(current.called_numbers || []) ===
            JSON.stringify(data.called_numbers || []) &&
          current.game_name === data.game_name &&
          current.game_code === data.game_code
        ) {
          return current;
        }

        return data;
      });
    } catch (err) {
      console.error(
        "Could not load player game:",
        err
      );

      setPlayerGame(
        null
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  function handleCreated(
    newGame
  ) {
    setGame(
      newGame
    );

    saveHostGame(
      newGame
    );

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  function handleGameUpdated(
    updatedGame
  ) {
    setGame(
      updatedGame
    );

    saveHostGame(
      updatedGame
    );
  }

  function handleNewGame() {
    saveHostGame(
      null
    );

    setGame(
      null
    );

    setPlayerGame(
      null
    );

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display:
            "flex",
          justifyContent:
            "center",
          alignItems:
            "center"
        }}
      >
        <h2>
          Loading...
        </h2>
      </main>
    );
  }

  /* -------------------------------------------------------
     PLAYER ROUTING
  ------------------------------------------------------- */

  if (
    playerCode
  ) {
    if (
      !playerGame
    ) {
      return (
        <main
          style={
            pageStyle
          }
        >
          <div
            style={{
              maxWidth:
                600,
              margin:
                "60px auto",
              textAlign:
                "center"
            }}
          >
            <section
              style={
                cardStyle
              }
            >
              <h2>
                Game Not Found
              </h2>

              <p>
                This game link is
                invalid or the game
                no longer exists.
              </p>

              <p
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    13
                }}
              >
                Game Code:
                {" "}
                {
                  playerCode
                }
              </p>
            </section>
          </div>
        </main>
      );
    }

    /* -----------------------------------------------------
       THIS IS THE IMPORTANT PART.

       UPCOMING = BOOKING PAGE
       LIVE     = LIVE GAME PAGE
       ENDED    = LIVE PAGE'S END SCREEN
    ----------------------------------------------------- */

    if (
      playerGame.status ===
      "live"
    ) {
      return (
        <LiveGamePage
          game={
            playerGame
          }
        />
      );
    }

    if (
      playerGame.status ===
      "ended"
    ) {
      return (
        <LiveGamePage
          game={
            playerGame
          }
        />
      );
    }

    return (
      <PlayerBookingPage
        game={
          playerGame
        }
      />
    );
  }

  /* -------------------------------------------------------
     HOST ROUTING
  ------------------------------------------------------- */

  if (game) {
    return (
      <HostControlPage
        game={
          game
        }
        onNewGame={
          handleNewGame
        }
        onGameUpdated={
          handleGameUpdated
        }
      />
    );
  }

  return (
    <CreateGamePage
      onCreated={
        handleCreated
      }
    />
  );
}

/* =========================================================
   START APP
========================================================= */

const rootElement =
  document.getElementById(
    "root"
  );

if (
  !rootElement
) {
  throw new Error(
    'Could not find the root element. Make sure index.html contains <div id="root"></div>.'
  );
}

const root =
  createRoot(
    rootElement
  );

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
