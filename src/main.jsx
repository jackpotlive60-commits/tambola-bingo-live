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
   PLAYER VOICE UNLOCK

   Mobile browsers block audible autoplay until the player has
   interacted with the page. We unlock speech from ANY normal
   player-page interaction (including the booking page), so the
   player does not need to press a dedicated voice button.
========================================================= */

let playerSpeechUnlocked = false;
let playerSpeechUnlockStarted = false;

/* =========================================================
   PLAYER NUMBER AUDIO
   Uses real MP3 assets from /public/voice instead of
   speechSynthesis for live called-number announcements.
   The audio element is primed from a real player gesture
   (BOOK tap or any normal player-page interaction) and the
   same element is reused for later calls.
========================================================= */

const playerAudioState = {
  unlocked: false,
  audio: null,
  audioContext: null,
  bufferCache: new Map(),
  queue: [],
  playing: false,
  priming: false
};

function getPlayerAudioElement() {
  if (!playerAudioState.audio) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    audio.playsInline = true;
    playerAudioState.audio = audio;
  }

  return playerAudioState.audio;
}

function getPlayerAudioContext() {
  if (!playerAudioState.audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) return null;

    playerAudioState.audioContext =
      new AudioContextClass();
  }

  return playerAudioState.audioContext;
}

async function primePlayerAudioFromGesture() {
  if (playerAudioState.unlocked) return true;
  if (playerAudioState.priming) return false;

  playerAudioState.priming = true;

  try {
    // Android/iOS-friendly unlock: resume AudioContext directly from
    // the player's real tap. Muted HTMLAudio does not reliably grant
    // permission for later audible playback.
    const context = getPlayerAudioContext();

    if (context) {
      await context.resume();

      if (context.state === "running") {
        playerAudioState.unlocked = true;
        playerAudioState.priming = false;
        flushPlayerAudioQueue();
        return true;
      }
    }

    // Older-browser fallback.
    const audio = getPlayerAudioElement();
    audio.src = "/voice/welcome.mp3";
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 0.001;

    const result = audio.play();
    if (result && typeof result.then === "function") {
      await result;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    audio.muted = false;

    playerAudioState.unlocked = true;
    playerAudioState.priming = false;
    flushPlayerAudioQueue();
    return true;
  } catch (error) {
    console.warn("Player audio prime was blocked:", error);
    playerAudioState.priming = false;
    return false;
  }
}

async function loadPlayerAudioBuffer(fileName) {
  const context = getPlayerAudioContext();
  if (!context) return null;

  if (playerAudioState.bufferCache.has(fileName)) {
    return playerAudioState.bufferCache.get(fileName);
  }

  const response = await fetch(
    `/voice/${encodeURIComponent(fileName)}`,
    { cache: "force-cache" }
  );

  if (!response.ok) {
    throw new Error(
      `Voice file ${fileName} returned HTTP ${response.status}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = await context.decodeAudioData(arrayBuffer);

  playerAudioState.bufferCache.set(fileName, buffer);
  return buffer;
}

function playPlayerAudioFile(fileName) {
  playerAudioState.queue.push(fileName);

  if (!playerAudioState.unlocked) {
    return;
  }

  flushPlayerAudioQueue();
}

async function flushPlayerAudioQueue() {
  if (
    !playerAudioState.unlocked ||
    playerAudioState.playing ||
    !playerAudioState.queue.length
  ) {
    return;
  }

  const next = playerAudioState.queue.shift();
  const context = getPlayerAudioContext();

  // Preferred path for Android/iOS: Web Audio.
  if (context) {
    try {
      if (context.state !== "running") {
        await context.resume();
      }

      const buffer = await loadPlayerAudioBuffer(next);
      if (!buffer) throw new Error("Web Audio unavailable");

      playerAudioState.playing = true;

      const source = context.createBufferSource();
      const gain = context.createGain();

      source.buffer = buffer;
      gain.gain.value = 1;
      source.connect(gain);
      gain.connect(context.destination);

      source.onended = () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch {}

        playerAudioState.playing = false;
        flushPlayerAudioQueue();
      };

      source.start(0);
      return;
    } catch (error) {
      console.warn(
        "Web Audio failed; using HTMLAudio fallback:",
        next,
        error
      );
      playerAudioState.playing = false;
    }
  }

  // Fallback for older browsers.
  const audio = getPlayerAudioElement();
  playerAudioState.playing = true;

  audio.pause();
  audio.currentTime = 0;
  audio.src = `/voice/${next}`;
  audio.muted = false;
  audio.volume = 1;

  const finish = () => {
    audio.onended = null;
    audio.onerror = null;
    playerAudioState.playing = false;
    flushPlayerAudioQueue();
  };

  audio.onended = finish;
  audio.onerror = (event) => {
    console.warn("Could not play player voice asset:", next, event);
    finish();
  };

  const result = audio.play();
  if (result && typeof result.catch === "function") {
    result.catch((error) => {
      console.warn("Player audio playback was blocked:", error);
      finish();
    });
  }
}

function getPreferredEnglishSpeechVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find((voice) => /^en-US$/i.test(voice.lang)) ||
    voices.find((voice) => /^en-GB$/i.test(voice.lang)) ||
    voices.find((voice) => /^en-IN$/i.test(voice.lang)) ||
    voices.find((voice) => /^en(-|_)/i.test(voice.lang)) ||
    null
  );
}

function unlockPlayerSpeechFromGesture() {
  if (playerSpeechUnlocked || playerSpeechUnlockStarted) {
    return playerSpeechUnlocked;
  }

  if (!("speechSynthesis" in window)) {
    return false;
  }

  playerSpeechUnlockStarted = true;

  try {
    const synth = window.speechSynthesis;
    synth.resume();

    // Unlock speech silently. Do NOT announce anything here.
    // The booking message is spoken only after a successful Book action.
    const englishVoice = getPreferredEnglishSpeechVoice();

    const utterance = new SpeechSynthesisUtterance("");
    utterance.lang = englishVoice?.lang || "en-US";
    utterance.volume = 0;

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      playerSpeechUnlocked = true;
      window.dispatchEvent(new Event("player-speech-unlocked"));
    };

    utterance.onend = () => {
      playerSpeechUnlocked = true;
      window.dispatchEvent(new Event("player-speech-unlocked"));
    };

    utterance.onerror = () => {
      playerSpeechUnlockStarted = false;
    };

    synth.speak(utterance);
    return true;
  } catch (error) {
    console.warn("Player speech could not be unlocked:", error);
    playerSpeechUnlockStarted = false;
    return false;
  }
}

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

    const englishVoice = getPreferredEnglishSpeechVoice();
    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    }

    window.speechSynthesis.resume();
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
        text: "#ffffff",
        muted: "#d8c8f2",
        surface: "#171126",
        surface2: "#21173a",
        inputBg: "#fbf9ff",
        inputText: "#171126",
        panelBg: "#f7f3fb",
        panelText: "#171126",
        panelMuted: "#5b526a",
        ticketBg: "#fbf9ff",
        ticketText: "#171126"
      };

    case "Party":
      return {
        background: "#7c1d5c",
        accent: "#facc15",
        secondary: "#22d3ee",
        text: "#ffffff",
        muted: "#d9d2e7",
        surface: "#171126",
        surface2: "#291536",
        inputBg: "#fffaff",
        inputText: "#171126",
        panelBg: "#f7f3fb",
        panelText: "#171126",
        panelMuted: "#5b526a",
        ticketBg: "#fffaff",
        ticketText: "#171126"
      };

    case "Bollywood":
      return {
        background: "#7f1d1d",
        accent: "#fbbf24",
        secondary: "#fb7185",
        text: "#ffffff",
        muted: "#f0d6d8",
        surface: "#1d0d12",
        surface2: "#321016",
        inputBg: "#fffafa",
        inputText: "#1d0d12",
        panelBg: "#fff7f7",
        panelText: "#1d0d12",
        panelMuted: "#674b50",
        ticketBg: "#fffafa",
        ticketText: "#1d0d12"
      };

    case "Neon":
      return {
        background: "#07111f",
        accent: "#22d3ee",
        secondary: "#a78bfa",
        text: "#ffffff",
        muted: "#b9c7d9",
        surface: "#07101d",
        surface2: "#0d1a2b",
        inputBg: "#f7fbff",
        inputText: "#07111f",
        panelBg: "#f4fbff",
        panelText: "#07111f",
        panelMuted: "#536579",
        ticketBg: "#f7fbff",
        ticketText: "#07111f"
      };

    case "Elegant":
      return {
        background: "#172033",
        accent: "#d4af37",
        secondary: "#94a3b8",
        text: "#ffffff",
        muted: "#c4ceda",
        surface: "#101722",
        surface2: "#182232",
        inputBg: "#fbfcfd",
        inputText: "#101722",
        panelBg: "#f6f8fb",
        panelText: "#101722",
        panelMuted: "#53606f",
        ticketBg: "#fbfcfd",
        ticketText: "#101722"
      };

    default:
      return {
        background: "#172554",
        accent: "#fbbf24",
        secondary: "#60a5fa",
        text: "#ffffff",
        muted: "#c6d4e5",
        surface: "#0f172a",
        surface2: "#16213a",
        inputBg: "#f8fbff",
        inputText: "#0f172a",
        panelBg: "#f5f8fc",
        panelText: "#0f172a",
        panelMuted: "#526174",
        ticketBg: "#f8fbff",
        ticketText: "#0f172a"
      };
  }
}


function getThemeUI(theme) {
  const colors = posterTheme(theme);

  const backgrounds = {
    Classic: `radial-gradient(circle at 18% 0%, rgba(212,175,55,.18), transparent 26%), radial-gradient(circle at 85% 10%, rgba(160,20,35,.18), transparent 24%), linear-gradient(135deg, #050505 0%, #140d08 52%, #090909 100%)`,
    Royal: `radial-gradient(circle at 15% 0%, rgba(212,175,55,.18), transparent 28%), radial-gradient(circle at 88% 5%, rgba(126,34,206,.20), transparent 26%), linear-gradient(135deg, #090608 0%, #1b0d24 52%, #080509 100%)`,
    Party: `radial-gradient(circle at 12% 5%, rgba(245,197,66,.18), transparent 26%), radial-gradient(circle at 90% 0%, rgba(239,68,68,.18), transparent 24%), linear-gradient(135deg, #0a0705 0%, #24100d 50%, #080707 100%)`,
    Bollywood: `radial-gradient(circle at 12% 5%, rgba(251,191,36,.20), transparent 26%), radial-gradient(circle at 90% 0%, rgba(185,28,28,.24), transparent 24%), linear-gradient(135deg, #080504 0%, #2b0b0d 52%, #090505 100%)`,
    Neon: `radial-gradient(circle at 12% 5%, rgba(34,211,238,.20), transparent 28%), radial-gradient(circle at 88% 0%, rgba(168,85,247,.22), transparent 24%), linear-gradient(135deg, #030303 0%, #071019 52%, #050408 100%)`,
    Elegant: `radial-gradient(circle at 12% 5%, rgba(212,175,55,.22), transparent 28%), radial-gradient(circle at 88% 0%, rgba(148,163,184,.12), transparent 24%), linear-gradient(135deg, #050505 0%, #17130d 52%, #080808 100%)`
  };

  const background = backgrounds[theme] || backgrounds.Classic;

  return {
    colors,
    page: {
      background,
      color: colors.text,
      padding: 20,
      position: "relative",
      overflowX: "hidden",
      "--theme-accent": colors.accent,
      "--theme-secondary": colors.secondary,
      "--theme-bg": colors.background,
      "--theme-text": colors.panelText,
      "--theme-muted": colors.muted,
      "--theme-surface": colors.surface,
      "--theme-surface2": colors.surface2,
      "--theme-input-bg": colors.inputBg,
      "--theme-input-text": colors.inputText,
      "--theme-input-muted": colors.panelMuted,
      "--theme-panel-bg": colors.panelBg,
      "--theme-panel-text": colors.panelText,
      "--theme-panel-muted": colors.panelMuted,
      "--theme-ticket-bg": colors.ticketBg,
      "--theme-ticket-text": colors.ticketText,
      "--theme-glow": `${colors.secondary}35`
    },
    card: {
      background: `linear-gradient(145deg, ${colors.surface}f7, ${colors.surface2}e8)`,
      border: `1px solid ${colors.accent}66`,
      borderTop: `3px solid ${colors.accent}`,
      borderRadius: 18,
      padding: 24,
      color: colors.text,
      boxShadow: `0 20px 55px rgba(0,0,0,.48), 0 0 0 1px ${colors.accent}18 inset, 0 0 28px ${colors.accent}12`,
      backdropFilter: "blur(16px)"
    },
    input: {
      border: `1px solid ${colors.secondary}70`,
      boxShadow: `0 0 0 4px ${colors.secondary}0c, 0 8px 20px rgba(0,0,0,.12)`,
      background: colors.inputBg,
      color: colors.inputText,
      WebkitTextFillColor: colors.inputText,
      caretColor: colors.accent
    },
    primary: {
      background: `linear-gradient(135deg, ${theme === "Bollywood" || theme === "Party" ? "#b91c1c" : colors.accent} 0%, ${theme === "Neon" ? colors.secondary : "#6f0f17"} 100%)`,
      color: "#ffffff",
      boxShadow: `0 12px 28px ${colors.secondary}45`,
      transform: "translateY(0)"
    },
    secondary: {
      border: `1px solid ${colors.accent}66`,
      background: `linear-gradient(180deg, ${colors.surface2} 0%, ${colors.surface} 100%)`,
      color: colors.text,
      boxShadow: `0 6px 16px ${colors.secondary}12`
    }
  };
}


function installCasinoResponsiveStyles() {
  if (typeof document === "undefined" || document.getElementById("tambolalive-casino-responsive")) return;
  const style = document.createElement("style");
  style.id = "tambolalive-casino-responsive";
  style.textContent = `
    @media (max-width: 760px) {
      main { padding: 12px !important; }
      [data-host-section] { overflow-x: auto; }
      input, button { min-height: 44px; }
    }
    @media (max-width: 820px) {
      div[style*="minmax(260px, .7fr)"] { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
}

function ThemeHero({ theme, title, subtitle, compact = false }) {
  const ui = getThemeUI(theme);
  const c = ui.colors;

  const ball = (number, size, offset, opacity = 1) => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: Math.max(14, size * .28),
    color: "#fff",
    background: `radial-gradient(circle at 32% 25%, #fff 0%, ${c.secondary} 18%, ${c.background} 82%)`,
    border: `2px solid ${c.accent}`,
    boxShadow: `0 0 28px ${c.secondary}66, inset -8px -10px 18px rgba(0,0,0,.25)`,
    opacity,
    ...offset
  });

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto 18px",
        minHeight: compact ? 120 : 155,
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        border: `1px solid ${c.accent}66`,
        background: `linear-gradient(135deg, ${c.background} 0%, #020617 100%)`,
        boxShadow: `0 18px 50px rgba(0,0,0,.30), 0 0 40px ${c.secondary}18`,
        color: "#fff",
        padding: compact ? "22px 24px" : "28px 30px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 70% 35%, ${c.accent}1f, transparent 28%), radial-gradient(circle at 25% 80%, ${c.secondary}22, transparent 30%)`,
          pointerEvents: "none"
        }}
      />
      <div style={{ position: "relative", zIndex: 2, maxWidth: "72%" }}>
        <div style={{ fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", color: c.accent, fontWeight: 800 }}>
          {theme || "Classic"} - TAMBOLA LIVE
        </div>
        <div style={{ fontSize: compact ? 25 : 32, lineHeight: 1.08, fontWeight: 900, marginTop: 8 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop: 8, color: "var(--theme-panel-muted, #64748b)", fontSize: 14 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div aria-hidden="true">
        <div style={ball(7, compact ? 68 : 86, { right: 116, top: compact ? 24 : 30 }, .88)}>7</div>
        <div style={ball(42, compact ? 86 : 110, { right: 42, top: compact ? 14 : 18 }, 1)}>42</div>
        <div style={ball(89, compact ? 54 : 68, { right: 178, bottom: compact ? -18 : -22 }, .62)}>89</div>
      </div>
    </div>
  );
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
  game
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
    830;

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
    const displayPrizes = prizes;
    const prizeRowGap = displayPrizes.length > 6 ? 34 : 40;
    const prizeFontSize = displayPrizes.length > 6 ? 20 : 22;

    displayPrizes.forEach(
      (
        prize,
        index
      ) => {
        const y =
          prizeY +
          55 +
          index * prizeRowGap;

        ctx.fillStyle =
          colors.text;

        ctx.font =
          `bold ${prizeFontSize}px Arial`;

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

  const footerY =
    Math.min(1225, prizeY + 95 + prizes.length * (prizes.length > 6 ? 34 : 40));

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    colors.secondary;

  ctx.font =
    "bold 22px Arial";

  ctx.fillText(
    "PRIZE LIST UPDATED",
    width / 2,
    footerY
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.75)";

  ctx.font =
    "18px Arial";

  ctx.fillText(
    "Final prize amounts announced by the host",
    width / 2,
    footerY + 38
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
  background: "#090909",
  padding: 20,
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  color: "#fff"
};

const cardStyle = {
  background: "linear-gradient(145deg, #15100d 0%, #090909 100%)",
  color: "var(--theme-text, #fff)",
  border: "1px solid rgba(212,175,55,.55)",
  borderRadius: 18,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.025)",
  boxSizing: "border-box"
};

const inputStyle = {
  width: "100%",
  padding: 13,
  border:
    "1px solid rgba(212,175,55,.5)",
  borderRadius: 10,
  boxSizing: "border-box",
  fontSize: 16,
  background: "#fffaf0"
};

const primaryButton = {
  padding:
    "13px 18px",
  border: "1px solid #f5d76e",
  borderRadius: 10,
  background: "linear-gradient(135deg, #a30f1c 0%, #6d0711 100%)",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(128,0,0,.35), inset 0 1px rgba(255,255,255,.18)"
};

const secondaryButton = {
  padding:
    "11px 16px",
  border:
    "1px solid rgba(212,175,55,.6)",
  borderRadius: 10,
  background: "linear-gradient(180deg, #211a10 0%, #0e0b08 100%)",
  color: "#f5d76e",
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
  const themeUI = getThemeUI(theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const themedInputStyle = { ...inputStyle, ...themeUI.input };
  const themedPrimaryButton = { ...primaryButton, ...themeUI.primary };
  const themedSecondaryButton = { ...secondaryButton, ...themeUI.secondary };

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
    <main style={themedPageStyle}>
      <ThemeHero
        theme={theme}
        title="Create your next premium game"
        subtitle="Choose a visual theme now. The same theme will carry through the player booking page, host controls, live game and final results."
      />
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
              themedCardStyle
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
                ...themedInputStyle,
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
                    ...themedInputStyle,
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
                    ...themedInputStyle,
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
                    ...themedInputStyle,
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
                    ...themedInputStyle,
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
                  ...themedInputStyle,
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
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${getThemeUI(theme).colors.background}, #020617)`,
                  border: `1px solid ${getThemeUI(theme).colors.accent}66`,
                  color: "#fff",
                  boxShadow: `0 10px 28px ${getThemeUI(theme).colors.secondary}20`
                }}
              >
                <div style={{ fontSize: 12, letterSpacing: 1.5, color: getThemeUI(theme).colors.accent, fontWeight: 800 }}>THEME PREVIEW</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{theme}</div>
                <div style={{ color: "var(--theme-muted, #cbd5e1)", fontSize: 13, marginTop: 4 }}>This visual identity will follow the game across every page.</div>
              </div>
            </div>
          </section>

          <section
            style={
              themedCardStyle
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
                      themedInputStyle
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
                      themedSecondaryButton
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
                  themedInputStyle
                }
              />

              <button
                type="button"
                onClick={
                  addPrize
                }
                style={
                  themedSecondaryButton
                }
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <section
              style={{
                ...themedCardStyle,
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
              ...themedPrimaryButton,
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
  calledNumbers = [],
  ownerName = "",
  theme = "Classic"
}) {
  const ui = getThemeUI(theme);
  const c = ui.colors;

  const ticketTheme = (() => {
    switch (theme) {
      case "Royal":
        return {
          shell: "linear-gradient(145deg, #2a123f 0%, #180b28 100%)",
          grid: "#fff8df",
          empty: "#f7edcf",
          line: "#c9ad72",
          text: "#24113f",
          muted: "#f5c542",
          player: "rgba(245,197,66,.12)",
          selected: "linear-gradient(145deg, #3b1b5d, #24113f)",
          glow: "rgba(245,197,66,.28)"
        };
      case "Party":
        return {
          shell: "linear-gradient(145deg, #5a1247 0%, #2a0b25 100%)",
          grid: "#fff7fb",
          empty: "#f8eaf3",
          line: "#e3a8c8",
          text: "#3b1234",
          muted: "#facc15",
          player: "rgba(34,211,238,.12)",
          selected: "linear-gradient(145deg, #7c1d5c, #4a123b)",
          glow: "rgba(244,63,94,.30)"
        };
      case "Bollywood":
        return {
          shell: "linear-gradient(145deg, #6d1518 0%, #2c090b 100%)",
          grid: "#fff8e9",
          empty: "#f8ead5",
          line: "#d9a26a",
          text: "#4b1117",
          muted: "#fbbf24",
          player: "rgba(251,191,36,.14)",
          selected: "linear-gradient(145deg, #8f1d1d, #4b1117)",
          glow: "rgba(251,191,36,.30)"
        };
      case "Neon":
        return {
          shell: "linear-gradient(145deg, #0b1528 0%, #030712 100%)",
          grid: "#0d1728",
          empty: "#08111f",
          line: "#334155",
          text: "#f8fafc",
          muted: "#22d3ee",
          player: "rgba(34,211,238,.10)",
          selected: "linear-gradient(145deg, #101d38, #050814)",
          glow: "rgba(34,211,238,.34)"
        };
      case "Elegant":
        return {
          shell: "linear-gradient(145deg, #152b2a 0%, #0b1717 100%)",
          grid: "#fff9e8",
          empty: "#f2ead3",
          line: "#b8a56a",
          text: "#172033",
          muted: "#d4af37",
          player: "rgba(212,175,55,.12)",
          selected: "linear-gradient(145deg, #193b37, #0c201e)",
          glow: "rgba(212,175,55,.28)"
        };
      default:
        return {
          shell: "linear-gradient(145deg, #102d55 0%, #07111f 100%)",
          grid: "#f8fbff",
          empty: "#eaf2fb",
          line: "#9bb3cf",
          text: "#0f172a",
          muted: "#60a5fa",
          player: "rgba(96,165,250,.12)",
          selected: "linear-gradient(145deg, #173e70, #0b1e36)",
          glow: "rgba(96,165,250,.28)"
        };
    }
  })();

  return (
    <div
      onClick={onSelect}
      style={{
        position: "relative",
        border: selected
          ? `2px solid ${c.accent}`
          : `1px solid ${c.secondary}88`,
        borderLeft: `6px solid ${c.accent}`,
        borderRadius: 22,
        padding: 14,
        background: selected
          ? ticketTheme.selected
          : ticketTheme.shell,
        cursor: onSelect ? "pointer" : "default",
        boxShadow: selected
          ? `0 16px 34px ${ticketTheme.glow}, 0 0 0 1px ${c.accent}66 inset`
          : `0 12px 28px rgba(0,0,0,.25), 0 0 0 1px ${c.secondary}22 inset`,
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(circle at 88% 8%, ${c.accent}18, transparent 28%), radial-gradient(circle at 10% 92%, ${c.secondary}14, transparent 30%)`
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 10
        }}
      >
        <b
          style={{
            fontSize: 21,
            letterSpacing: "-.02em",
            color: "#ffffff"
          }}
        >
          Ticket #{ticket.number}
        </b>

        <span
          style={{
            padding: "7px 11px",
            borderRadius: 10,
            background: selected
              ? `linear-gradient(135deg, ${c.accent}, ${c.secondary})`
              : `${c.secondary}20`,
            color: selected ? "#ffffff" : "#ffffff",
            border: `1px solid ${selected ? c.accent : c.secondary}88`,
            fontWeight: "800",
            fontSize: 12,
            letterSpacing: ".03em",
            whiteSpace: "nowrap"
          }}
        >
          {selected ? "SELECTED" : ownerName ? "BOOKED" : "AVAILABLE"}
        </span>
      </div>

      {ownerName && (
        <div
          style={{
            position: "relative",
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background: ticketTheme.player,
            border: `1px solid ${c.secondary}45`,
            color: "#ffffff",
            fontWeight: "800",
            fontSize: 14
          }}
        >
          Player: {ownerName}
        </div>
      )}

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(9,minmax(28px,1fr))",
          border: `2px solid ${theme === "Neon" ? c.secondary : c.accent}`,
          overflow: "hidden",
          borderRadius: 10,
          boxShadow: `0 0 0 1px ${c.secondary}22 inset`
        }}
      >
        {ticket.grid.flatMap((row, r) =>
          row.map((value, col) => {
            const called = value && calledNumbers.includes(value);

            return (
              <div
                key={`${r}-${col}`}
                style={{
                  minHeight: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight:
                    col === 8 ? "none" : `1px solid ${ticketTheme.line}`,
                  borderBottom:
                    r === 2 ? "none" : `1px solid ${ticketTheme.line}`,
                  fontWeight: value ? "800" : "normal",
                  fontSize: 17,
                  background: called
                    ? `linear-gradient(145deg, #fde68a, #fbbf24)`
                    : value
                    ? ticketTheme.grid
                    : ticketTheme.empty,
                  color: called
                    ? "#78350f"
                    : ticketTheme.text
                }}
              >
                {value || ""}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 10,
          textAlign: "center",
          color: c.accent,
          fontWeight: "800",
          letterSpacing: ".01em"
        }}
      >
        {selected ? "[OK] Tap to unselect" : "Tap to select"}
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
  const themeUI = getThemeUI(game.theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const themedInputStyle = { ...inputStyle, ...themeUI.input };
  const themedPrimaryButton = { ...primaryButton, ...themeUI.primary };
  const themedSecondaryButton = { ...secondaryButton, ...themeUI.secondary };
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
    ticketStatuses,
    setTicketStatuses
  ] = useState({});

  const [
    ticketOwners,
    setTicketOwners
  ] = useState({});

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
            "ticket_numbers,status,player_name"
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

      const statuses = {};
      const owners = {};

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

                // If multiple bookings somehow reference the same ticket,
                // an accepted booking takes precedence over pending.
                if (
                  statuses[n] !==
                  "accepted"
                ) {
                  statuses[n] =
                    booking.status ===
                    "accepted"
                      ? "accepted"
                      : "pending";
                }

                if (booking.status === "accepted") {
                  owners[n] = booking.player_name || "Player";
                  statuses[n] = "accepted";
                }
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

      setTicketStatuses(
        statuses
      );
      setTicketOwners(owners);
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

  function speakBookingPendingMessage() {
    if (!("speechSynthesis" in window)) return;

    try {
      // The Book tap is a real user gesture. Prime the real MP3 player
      // silently so Live Game can later play called-number assets.
      primePlayerAudioFromGesture();

      // Keep the existing speech unlock state for the booking-status message.
      playerSpeechUnlocked = true;
      playerSpeechUnlockStarted = false;
      window.dispatchEvent(new Event("player-speech-unlocked"));

      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume();

      const utterance = new SpeechSynthesisUtterance(
        "Booking pending. Waiting for host approval."
      );
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const englishVoice = getPreferredEnglishSpeechVoice();
      if (englishVoice) {
        utterance.voice = englishVoice;
        utterance.lang = englishVoice.lang;
      }

      synth.speak(utterance);
    } catch (error) {
      console.warn("Booking pending announcement failed:", error);
    }
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

      // Speak the professional booking-status message ONLY after the
      // player's Book action succeeds. Voice unlocking itself is silent.
      speakBookingPendingMessage();

      // Clear only this submission. Existing bookings do not lock this player
      // out of making another booking for any still-available ticket.
      setSelected([]);

      await loadUnavailableTickets();

      // Open WhatsApp with an approval request. No host phone number is
      // hard-coded; WhatsApp lets the player choose the host/contact.
      const whatsappMessage =
        `Hello, I am ${name}. I have requested ticket${
          sortedTickets.length === 1 ? "" : "s"
        } ${sortedTickets
          .map((n) => `#${n}`)
          .join(", ")} for ${game.game_name}. Please approve my booking.`;

      const whatsappUrl =
        `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );
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
    <main style={themedPageStyle}>
      <ThemeHero
        theme={game.theme}
        title={game.game_name}
        subtitle="Premium player booking - Select your tickets and request host approval"
      />
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
          style={{
            ...themedCardStyle,
            marginBottom: 0
          }}
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
            themedCardStyle
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
                      minHeight: 65,
                      border: active
                        ? `3px solid ${themeUI.colors.accent}`
                        : unavailable
                        ? `2px solid ${themeUI.colors.secondary}55`
                        : `1px solid ${themeUI.colors.secondary}66`,
                      borderRadius: 13,
                      background: active
                        ? `linear-gradient(135deg, ${themeUI.colors.accent}, ${themeUI.colors.secondary})`
                        : unavailable
                        ? `${themeUI.colors.secondary}22`
                        : "rgba(255,255,255,.96)",
                      color: active
                        ? "#fff"
                        : unavailable
                        ? "#94a3b8"
                        : "#0f172a",
                      fontWeight: "bold",
                      fontSize: 17,
                      cursor: unavailable ? "not-allowed" : "pointer",
                      opacity: unavailable ? 0.78 : 1,
                      boxShadow: active
                        ? `0 8px 20px ${themeUI.colors.secondary}35`
                        : `0 5px 14px ${themeUI.colors.secondary}12`
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
                            3,
                          color:
                            ticketStatuses[ticket.number] ===
                            "accepted"
                              ? "#166534"
                              : "#9a3412"
                        }}
                      >
                        {ticketStatuses[ticket.number] ===
                        "accepted"
                          ? "BOOKED"
                          : "PENDING"}
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
                "var(--theme-panel-bg, #f8fafc)",
              color:
                "var(--theme-panel-text, #0f172a)",
              border:
                "1px solid var(--theme-secondary, #e2e8f0)66"
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
                  themeUI.colors.accent,
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
                  ...themedSecondaryButton,
                  marginTop:
                    10
                }}
              >
                Clear Selection
              </button>
            )}

            {!selected.length && !booking && messageType === "success" && (
              <button
                type="button"
                onClick={() => {
                  document.getElementById("player-ticket-list")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                  });
                }}
                style={{
                  ...themedPrimaryButton,
                  marginTop: 10,
                  width: "100%"
                }}
              >
                BOOK ANOTHER TICKET
              </button>
            )}
          </div>
        </section>

        <section
          id="player-ticket-list"
          style={
            themedCardStyle
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
                      theme={game.theme}
                      selected={selected.includes(
                        ticket.number
                      )}
                      ownerName={
                        ticketStatuses[ticket.number] === "accepted"
                          ? ticketOwners[ticket.number] || "Player"
                          : ""
                      }
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
                            ticketStatuses[ticket.number] ===
                            "accepted"
                              ? "#64748b"
                              : "#f59e0b",
                          color:
                            "#fff",
                          fontSize:
                            12,
                          fontWeight:
                            "bold"
                        }}
                      >
                        {ticketStatuses[ticket.number] ===
                        "accepted"
                          ? "BOOKED"
                          : "PENDING"}
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
            ...themedCardStyle,
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
              ...themedInputStyle,
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
              ...themedPrimaryButton,
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
  const themeUI = getThemeUI(game.theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const themedInputStyle = { ...inputStyle, ...themeUI.input };
  const themedPrimaryButton = { ...primaryButton, ...themeUI.primary };
  const themedSecondaryButton = { ...secondaryButton, ...themeUI.secondary };
  const [calledNumbers, setCalledNumbers] = useState(
    Array.isArray(game.called_numbers) ? game.called_numbers : []
  );
  const [liveGame, setLiveGame] = useState(game);
  const liveGameRef = useRef(game);
  liveGameRef.current = liveGame;
  const finalAnnouncementSpokenRef = useRef(false);
  const finalSummaryTimerRef = useRef(null);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [viewFinishedLive, setViewFinishedLive] = useState(false);

  // Player-side voice tracking. Live called numbers use MP3 assets,
  // while the existing speech unlock remains available for other
  // announcements.
  const playerVoiceUnlockedRef = useRef(playerSpeechUnlocked);
  const playerVoiceReadyRef = useRef(playerAudioState.unlocked);
  const playerCalledNumbersRef = useRef(
    Array.isArray(game.called_numbers) ? game.called_numbers.map(Number) : []
  );
  const playerWinnerKeysRef = useRef(
    (Array.isArray(game.selected_prizes) ? game.selected_prizes : [])
      .flatMap((prize, prizeIndex) =>
        (Array.isArray(prize?.winners) ? prize.winners : []).map((winner) =>
          `${prizeIndex}|${prize?.name || `Prize ${prizeIndex + 1}`}|${winner?.playerName || "Player"}|${winner?.ticketNumber}|${winner?.winningNumber}`
        )
      )
  );

  // Any normal interaction on the Live Game page can prime the MP3
  // player. This is silent and requires no visible voice button.
  useEffect(() => {
    const unlockFromGesture = () => {
      primePlayerAudioFromGesture().then((unlocked) => {
        if (unlocked) {
          playerVoiceUnlockedRef.current = true;
          playerVoiceReadyRef.current = true;
          playerSpeechUnlocked = true;
          window.dispatchEvent(new Event("player-speech-unlocked"));
        }
      });
    };

    const options = { capture: true, passive: true };
    window.addEventListener("pointerdown", unlockFromGesture, options);
    window.addEventListener("touchstart", unlockFromGesture, options);
    window.addEventListener("click", unlockFromGesture, options);
    window.addEventListener("keydown", unlockFromGesture, options);

    if (playerAudioState.unlocked || playerSpeechUnlocked) {
      playerVoiceUnlockedRef.current = true;
      playerVoiceReadyRef.current = true;
    }

    return () => {
      window.removeEventListener("pointerdown", unlockFromGesture, true);
      window.removeEventListener("touchstart", unlockFromGesture, true);
      window.removeEventListener("click", unlockFromGesture, true);
      window.removeEventListener("keydown", unlockFromGesture, true);
    };
  }, []);

  function speakPlayerNumber(number) {
    const numericNumber = Number(number);

    if (
      !Number.isInteger(numericNumber) ||
      numericNumber < 1 ||
      numericNumber > 90
    ) {
      return;
    }

    // Real MP3: /public/voice/number-N.mp3
    playPlayerAudioFile(`number-${numericNumber}.mp3`);
  }

  useEffect(() => {
    const nextNumbers = Array.isArray(liveGame.called_numbers)
      ? liveGame.called_numbers
          .map(Number)
          .filter((n) => Number.isInteger(n))
      : [];

    const previousNumbers = playerCalledNumbersRef.current;

    if (playerAudioState.unlocked || playerSpeechUnlocked) {
      playerVoiceUnlockedRef.current = true;
      playerVoiceReadyRef.current = true;
    }

    const newlyCalled = nextNumbers.filter(
      (number) => !previousNumbers.includes(number)
    );

    playerCalledNumbersRef.current = nextNumbers;

    if (!newlyCalled.length || !playerVoiceUnlockedRef.current) return;

    newlyCalled.forEach((number, index) => {
      window.setTimeout(() => {
        if (playerAudioState.unlocked || playerVoiceUnlockedRef.current) {
          speakPlayerNumber(number);
        }
      }, index * 1800);
    });
  }, [liveGame.called_numbers]);

  useEffect(() => {
    const prizes = Array.isArray(liveGame.selected_prizes) ? liveGame.selected_prizes : [];
    const newlyConfirmedEvents = [];
    const nextKeys = [];

    prizes.forEach((prize, prizeIndex) => {
      const winners = Array.isArray(prize?.winners) ? prize.winners : [];
      winners.forEach((winner) => {
        const key = `${prizeIndex}|${prize?.name || `Prize ${prizeIndex + 1}`}|${winner?.playerName || "Player"}|${winner?.ticketNumber}|${winner?.winningNumber}`;
        nextKeys.push(key);
      });

      const newWinners = winners.filter((winner) => {
        const key = `${prizeIndex}|${prize?.name || `Prize ${prizeIndex + 1}`}|${winner?.playerName || "Player"}|${winner?.ticketNumber}|${winner?.winningNumber}`;
        return !playerWinnerKeysRef.current.includes(key);
      });

      if (newWinners.length) {
        newlyConfirmedEvents.push({
          prizeName: prize?.name || `Prize ${prizeIndex + 1}`,
          prizeAmount: prize?.amount ?? prize?.prizeAmount ?? 0,
          winningNumber: newWinners[0]?.winningNumber,
          winners: newWinners
        });
      }
    });

    playerWinnerKeysRef.current = nextKeys;

    if (
      !newlyConfirmedEvents.length ||
      (!playerAudioState.unlocked && !playerSpeechUnlocked)
    ) {
      return;
    }

    window.setTimeout(() => {
      if (playerAudioState.unlocked) {
        playPlayerAudioFile("prize-winner.mp3");
      }
      speakWinnerAnnouncement(newlyConfirmedEvents);
    }, 300);
  }, [liveGame.selected_prizes]);

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

    const speakMessage = (message) => {
      if (!("speechSynthesis" in window)) {
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(message);

        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Could not announce game end:", err);
      }
    };

    if (!finalAnnouncementSpokenRef.current) {
      finalAnnouncementSpokenRef.current = true;

      speakMessage(
        "All prizes have been claimed! No prizes remaining."
      );

      finalSummaryTimerRef.current = window.setTimeout(() => {
        speakMessage(
          "And that's the game! All prizes have been claimed! Thank you everyone for joining us and making this game special. We hope you enjoyed the fun - see you in the next game!"
        );

        finalSummaryTimerRef.current = window.setTimeout(() => {
          setViewFinishedLive(false);
          setShowFinalResults(true);
          finalSummaryTimerRef.current = null;
        }, 3000);
      }, 3000);
    }

    return () => {
      if (finalSummaryTimerRef.current) {
        window.clearTimeout(finalSummaryTimerRef.current);
        finalSummaryTimerRef.current = null;
      }
    };
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
      <main style={themedPageStyle}>
        <ThemeHero
          theme={liveGame.theme}
          title="Game complete"
          subtitle="The final results keep the same theme as the live event."
          compact
        />
        <div style={{ maxWidth: 800, margin: "40px auto" }}>
          <section style={{ ...themedCardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>[WINNER]</div>
            <h1 style={{ marginBottom: 8 }}>FINAL GAME RESULTS</h1>
            <p style={{ color: "var(--theme-muted, #64748b)", fontSize: 15, marginTop: 8 }}>
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
              <div style={{ ...themedCardStyle, margin: 0, background: "var(--theme-panel-bg, #f8fafc)" }}>
                <b>Numbers Called</b>
                <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>{calledNumbers.length}</div>
              </div>
              <div style={{ ...themedCardStyle, margin: 0, background: "var(--theme-panel-bg, #f8fafc)" }}>
                <b>Prizes Won</b>
                <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>
                  {finalPrizes.filter((prize) => prize?.locked).length}
                </div>
              </div>
              <div style={{ ...themedCardStyle, margin: 0, background: "var(--theme-panel-bg, #f8fafc)" }}>
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
                  background: "var(--theme-panel-bg, #fff)",
                      color: "var(--theme-panel-text, #0f172a)",
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
                    <div style={{ fontSize: 13, color: "var(--theme-muted, #64748b)", fontWeight: "bold" }}>
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
                      ...themedSecondaryButton,
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
                          background: "var(--theme-panel-bg, #f8fafc)",
                      color: "var(--theme-panel-text, #0f172a)",
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

          <section style={themedCardStyle}>
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
                      background: prize.locked ? "#f0fdf4" : "var(--theme-panel-bg, #f8fafc)",
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
                            style={{ padding: 9, borderRadius: 9, background: "var(--theme-panel-bg, #fff)" }}
                          >
                            <b>{winner.playerName || "Player"}</b> - Ticket #{winner.ticketNumber}
                            {winner.prizeShare != null ? ` - ${formatPrizeAmount(winner.prizeShare)}` : ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, color: "var(--theme-muted, #64748b)" }}>No confirmed winner.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section style={themedCardStyle}>
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
                <div style={{ color: "var(--theme-muted, #64748b)", fontSize: 14 }}>
                  Read-only history of the game that just finished.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFinalResults(true)}
                style={themedPrimaryButton}
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
              <div style={{ ...themedCardStyle, margin: 0, background: "var(--theme-panel-bg, #f8fafc)" }}>
                <b>Numbers Called</b>
                <div style={{ fontSize: 28, fontWeight: "bold", marginTop: 6 }}>
                  {calledNumbers.length}
                </div>
              </div>

              <div style={{ ...themedCardStyle, margin: 0, background: "var(--theme-panel-bg, #f8fafc)" }}>
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
                <div style={{ color: "var(--theme-muted, #64748b)" }}>
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
    <main style={themedPageStyle}>
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
            style={themedPrimaryButton}
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

        {/* =========================================================
           PLAYER LIVE-GAME ORDER - DO NOT REORDER
           1 Current Numbers
           2 Called Number Board
           3 Call History
           4 My Booked Tickets
           5 Prizes
           6 Search Player Name or Ticket Number
           7 All Booked Tickets
        ========================================================= */}

        {/* 1. CURRENT NUMBER - ONE BIG DISPLAY ONLY */}
        <section data-live-section="1-current-number" style={{ ...themedCardStyle, textAlign: "center" }}>
          <h2 style={{ margin: 0 }}>Current Number</h2>

          <div
            style={{
              width: 170,
              height: 170,
              margin: "18px auto 12px",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 72,
              fontWeight: "bold",
              boxShadow: "0 10px 30px rgba(37,99,235,.25)"
            }}
          >
            {lastCalled || "-"}
          </div>

          <div style={{ color: "var(--theme-muted, #64748b)", fontWeight: "bold" }}>
            Total Called: {calledNumbers.length}/90
          </div>
        </section>

        {/* 2. CALLED NUMBER BOARD */}
        <section data-live-section="2-called-number-board" style={themedCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <h2 style={{ margin: 0 }}>Called Number Board</h2>
            <div style={{ color: "var(--theme-muted, #64748b)", fontWeight: "bold" }}>
              {calledNumbers.length}/90 called
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10,minmax(0,1fr))",
              gap: 8,
              marginTop: 16
            }}
          >
            {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => {
              const isCalled = calledNumbers.includes(number);
              const isLast = lastCalled === number;

              return (
                <div
                  key={`board-${number}`}
                  style={{
                    minHeight: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    border: isCalled
                      ? "2px solid #2563eb"
                      : "1px solid #e2e8f0",
                    background: isCalled ? "#2563eb" : "#fff",
                    color: isCalled ? "#fff" : "var(--theme-panel-text, #0f172a)",
                    fontWeight: "bold",
                    fontSize: 16,
                    boxShadow: isLast
                      ? "0 0 0 3px #facc15, 0 5px 14px rgba(37,99,235,.18)"
                      : "none",
                    transform: isLast ? "scale(1.04)" : "none"
                  }}
                  title={
                    isLast
                      ? `Last called number: ${number}`
                      : isCalled
                      ? `Called: ${number}`
                      : `Not called: ${number}`
                  }
                >
                  {number}
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 16,
              color: "var(--theme-muted, #64748b)",
              fontSize: 13,
              fontWeight: "bold"
            }}
          >
            <span>Blue = called</span>
            <span>Yellow outline = last called</span>
          </div>
        </section>

        {/* 3. CALL HISTORY */}
        <section data-live-section="3-call-history" style={themedCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <h2 style={{ margin: 0 }}>Call History</h2>
            <div style={{ color: "var(--theme-muted, #64748b)", fontWeight: "bold" }}>
              {calledNumbers.length} calls
            </div>
          </div>

          {calledNumbers.length === 0 ? (
            <p style={{ color: "var(--theme-muted, #64748b)", marginBottom: 0 }}>
              Call history will appear here as numbers are called.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 14,
                overflowX: "auto",
                paddingBottom: 4
              }}
            >
              {[...calledNumbers].reverse().map((number, index) => (
                <div
                  key={`history-${number}-${index}`}
                  style={{
                    minWidth: 72,
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: index === 0
                      ? "2px solid #2563eb"
                      : "1px solid #e2e8f0",
                    background: index === 0 ? `${themeUI.colors.secondary}18` : "var(--theme-panel-bg, #f8fafc)",
                    textAlign: "center"
                  }}
                >
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: "bold",
                      color: "#1e3a8a"
                    }}
                  >
                    {number}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. MY BOOKED TICKETS */}
        {playerBooking && (
          <section data-live-section="4-my-booked-tickets" style={themedCardStyle}>
            <h2>Your Booked Tickets</h2>
            <p style={{ color: "var(--theme-muted, #64748b)" }}>
              Player: <b>{playerBooking.playerName}</b>
            </p>

            {loadingPlayerBookings ? (
              <p style={{ color: "var(--theme-muted, #64748b)" }}>
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
                      theme={liveGame.theme}
                      ticket={ticket}
                      selected={false}
                      calledNumbers={calledNumbers}
                      readOnly
                      ownerName={playerBooking.playerName}
                    />
                  ))
                ) : (
                  <p style={{ color: "var(--theme-muted, #64748b)" }}>
                    No accepted tickets found for this player yet.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* 5. PRIZES */}
        <div data-live-section="5-prizes"><LivePrizeList game={liveGame} /></div>

        {/* 6. SEARCH */}
        <section data-live-section="6-search" style={themedCardStyle}>
          <h2>Search Player Name or Ticket Number</h2>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap"
            }}
          >
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search player name or ticket number"
              style={{ ...themedInputStyle, flex: "1 1 280px" }}
            />
            <button
              type="button"
              onClick={() => setSearchText("")}
              style={themedSecondaryButton}
            >
              [SEARCH] Search / Clear
            </button>
          </div>
          <p style={{ color: "var(--theme-muted, #64748b)", marginBottom: 0 }}>
            Search will filter the All Booked Tickets below.
          </p>
        </section>

        {/* 7. ALL BOOKED TICKETS */}
        <section data-live-section="7-all-booked-tickets" style={themedCardStyle}>
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
              <p style={{ color: "var(--theme-muted, #64748b)", marginTop: 0 }}>
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

          {loadingBookings ? (
            <p style={{ color: "var(--theme-muted, #64748b)", marginTop: 18 }}>
              Loading booked tickets...
            </p>
          ) : filteredBookedTickets.length === 0 ? (
            <div
              style={{
                marginTop: 18,
                padding: 20,
                borderRadius: 12,
                background: "var(--theme-panel-bg, #f8fafc)",
                      color: "var(--theme-panel-text, #0f172a)",
                border: "1px solid #e2e8f0",
                textAlign: "center",
                color: "var(--theme-muted, #64748b)"
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
                  theme={liveGame.theme}
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

        <div
          style={{
            textAlign: "center",
            color: "var(--theme-muted, #64748b)",
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
        <p style={{ color: "var(--theme-muted, #64748b)" }}>
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
                  color: "var(--theme-muted, #64748b)",
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
        <p style={{ color: "var(--theme-muted, #64748b)" }}>
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
                          color: "var(--theme-muted, #64748b)",
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
                          background: "var(--theme-panel-bg, #fff)",
                      color: "var(--theme-panel-text, #0f172a)",
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
  const themeUI = getThemeUI(game.theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const themedInputStyle = { ...inputStyle, ...themeUI.input };
  const themedPrimaryButton = { ...primaryButton, ...themeUI.primary };
  const themedSecondaryButton = { ...secondaryButton, ...themeUI.secondary };
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
    editablePrizes,
    setEditablePrizes
  ] = useState(
    () =>
      Array.isArray(game.selected_prizes)
        ? game.selected_prizes.map((prize) => ({ ...prize }))
        : []
  );

  const [
    savingPrizes,
    setSavingPrizes
  ] = useState(false);

  const [
    shareMessage,
    setShareMessage
  ] = useState("");

  const [
    savedPrizeGame,
    setSavedPrizeGame
  ] = useState(null);

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

  useEffect(
    () => {
      setEditablePrizes(
        Array.isArray(game.selected_prizes)
          ? game.selected_prizes.map((prize) => ({ ...prize }))
          : []
      );
    },
    [game.selected_prizes]
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

  function updateEditablePrizeAmount(index, amount) {
    setEditablePrizes((current) =>
      current.map((prize, prizeIndex) =>
        prizeIndex === index
          ? { ...prize, amount }
          : prize
      )
    );
    setSavedPrizeGame(null);
    setShareMessage("");
  }

  async function savePrizeAmounts() {
    const prizeEditingAllowed =
      game.status !== "ended";

    if (savingPrizes || !prizeEditingAllowed) {
      return false;
    }

    setSavingPrizes(true);
    setGameError("");
    setShareMessage("");

    try {
      const updatedPrizes = editablePrizes.map((prize) => ({
        ...prize,
        amount:
          prize.amount === "" || prize.amount == null
            ? ""
            : Number(prize.amount) || 0
      }));

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

      setEditablePrizes(
        Array.isArray(updatedGame.selected_prizes)
          ? updatedGame.selected_prizes.map((prize) => ({ ...prize }))
          : []
      );

      saveHostGame(updatedGame);
      onGameUpdated(updatedGame);
      setSavedPrizeGame(updatedGame);
      setShareMessage("Prize amounts saved. Now generate the updated poster below to share the new prize list.");
      return updatedGame;
    } catch (err) {
      console.error("Could not save prize amounts:", err);
      setGameError(
        err?.message || "Could not save prize amounts."
      );
      return false;
    } finally {
      setSavingPrizes(false);
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
      posterCreating ||
      savingPrizes
    ) {
      return;
    }

    let posterSourceGame = savedPrizeGame || game;

    const prizeEditingAllowed =
      game.status !== "ended";

    if (prizeEditingAllowed) {
      const savedGame = await savePrizeAmounts();
      if (!savedGame) {
        return;
      }
      posterSourceGame = savedGame;
    }

    setPosterCreating(
      true
    );

    setShareMessage("");

    try {
      const posterGame = {
        ...posterSourceGame,
        selected_prizes: Array.isArray(posterSourceGame.selected_prizes)
          ? posterSourceGame.selected_prizes.map((prize) => ({ ...prize }))
          : editablePrizes.map((prize) => ({ ...prize }))
      };

      const poster =
        await createGamePoster(
          posterGame
        );

      const canShareFiles =
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [poster]
        });

      if (canShareFiles) {
        await navigator.share({
          title: game.game_name,
          files: [poster]
        });

        setShareMessage(
          "Updated prize poster ready to share. Only the poster was sent."
        );

        return;
      }

      // If the browser cannot share image files directly, save only the poster.
      try {
        const posterUrl = URL.createObjectURL(poster);
        const downloadLink = document.createElement("a");
        downloadLink.href = posterUrl;
        downloadLink.download = poster.name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(posterUrl), 1000);

        setShareMessage(
          "Updated prize poster saved. Share the poster file in WhatsApp."
        );
      } catch (downloadError) {
        console.error("Could not prepare poster download:", downloadError);
        setShareMessage(
          "Could not share or save the updated poster."
        );
      }
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

      setShareMessage(
        "Updated prize poster could not be shared automatically. Please use the saved poster file in WhatsApp."
      );
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
        themedPageStyle
      }
    >
      <ThemeHero
        theme={game.theme}
        title={game.game_name}
        subtitle="Host Control Centre - Manage bookings, prizes and the live game"
        compact
      />
      <div
        style={{
          maxWidth:
            1200,
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, .7fr) minmax(0, 1.8fr)",
            gap: 18,
            alignItems: "stretch"
          }}
        >

        <section
          style={{
            ...themedCardStyle,
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
            themedCardStyle
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

        </div>

        <section
          data-host-section="prize-amounts"
          style={{
            ...themedCardStyle,
            display: "block",
            visibility: "visible",
            minHeight: 220,
            position: "relative",
            zIndex: 2
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Prize Amounts
          </h2>

          <p
            style={{
              color: "var(--theme-muted, #64748b)",
              marginTop: 0
            }}
          >
            Edit the prize amounts here based on your ticket sales. Save them before sharing the updated poster.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px",
              gap: 8,
              alignItems: "center",
              padding: "10px 12px",
              background: "var(--theme-panel-bg, #f8fafc)",
              color: "var(--theme-panel-text, #0f172a)",
              borderRadius: 10,
              fontWeight: "bold",
              marginBottom: 8
            }}
          >
            <div style={{ color: "var(--theme-panel-text, #0f172a)" }}>Prize</div>
            <div style={{ color: "var(--theme-panel-text, #0f172a)" }}>Amount (INR)</div>
          </div>

          {(editablePrizes.length === 0 && prizes.length === 0) ? (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "var(--theme-panel-bg, #f8fafc)",
                      color: "var(--theme-panel-muted, #64748b)"
              }}
            >
              No prizes configured for this game.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(editablePrizes.length ? editablePrizes : prizes).map((prize, index) => {
                const locked = Boolean(prize?.locked);
                const prizeEditingAllowed =
                  game.status !== "ended";
                const disabled = !prizeEditingAllowed || locked || savingPrizes;

                return (
                  <div
                    key={`${prize.name || "prize"}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 160px",
                      gap: 8,
                      alignItems: "center"
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 9,
                        background: locked ? "var(--theme-panel-bg, #f8fafc)" : "var(--theme-panel-bg, #fff)",
                        color: "var(--theme-panel-text, #0f172a)"
                      }}
                    >
                      <b style={{ color: "var(--theme-panel-text, #0f172a)" }}>{prize.name || `Prize ${index + 1}`}</b>
                      {locked && (
                        <div style={{ marginTop: 3, color: "#166534", fontSize: 12, fontWeight: "bold" }}>
                          LOCKED - WINNER CONFIRMED
                        </div>
                      )}
                    </div>

                    <input
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={prize.amount ?? ""}
                      disabled={disabled}
                      onChange={(e) =>
                        updateEditablePrizeAmount(index, e.target.value)
                      }
                      style={{
                        ...themedInputStyle,
                        opacity: disabled ? 0.82 : 1
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={savePrizeAmounts}
            disabled={
              savingPrizes ||
              game.status === "ended"
            }
            style={{
              ...themedPrimaryButton,
              marginTop: 14,
              opacity:
                savingPrizes ||
                game.status === "ended"
                  ? 0.55
                  : 1
            }}
          >
            {savingPrizes ? "SAVING PRIZES..." : "SAVE PRIZE AMOUNTS"}
          </button>
        </section>

        <section
          style={
            themedCardStyle
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
            and updated prize amounts.
            The poster contains no game link.
          </p>

          <p
            style={{
              color: "#166534",
              fontWeight: "bold",
              marginTop: 0
            }}
          >
            Save your new prize amounts first, then use the button below to generate a fresh poster with the updated prizes.
          </p>

          <input
            readOnly
            value={
              inviteUrl
            }
            style={{
              ...themedInputStyle,
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
                themedSecondaryButton
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
                ...themedPrimaryButton,
                opacity:
                  posterCreating
                    ? 0.6
                    : 1
              }}
            >
              {posterCreating
                ? "Creating Poster..."
                : "[STYLE] GENERATE UPDATED PRIZE POSTER + SHARE"}
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
            themedCardStyle
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
            themedCardStyle
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
                  "var(--theme-panel-bg, #f8fafc)",
                borderRadius:
                  10,
                color:
                  "var(--theme-panel-muted, #64748b)"
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
                          "var(--theme-input-bg, #fff)",
                        color:
                          "var(--theme-input-text, #0f172a)"
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
                              ...themedPrimaryButton,
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
                              ...themedSecondaryButton,
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
            ...themedCardStyle,
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
                ...themedPrimaryButton,
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
                ...themedSecondaryButton,
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
              ...themedCardStyle,
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
                  ...themedPrimaryButton,
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
                  ...themedSecondaryButton,
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
                  ...themedSecondaryButton,
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
                  background: "var(--theme-panel-bg, #f8fafc)",
                      color: "var(--theme-panel-text, #0f172a)",
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
                  background: "var(--theme-panel-bg, #f8fafc)",
                      color: "var(--theme-panel-text, #0f172a)",
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
                    background: "var(--theme-panel-bg, #fff)",
                      color: "var(--theme-panel-text, #0f172a)",
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
              themedCardStyle
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
                background: "var(--theme-panel-bg, #fff)",
                      color: "var(--theme-panel-text, #0f172a)",
                borderRadius: 22,
                padding: 24,
                boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: 54 }}>[WINNER]</div>
              <h2 style={{ margin: "8px 0 6px" }}>WINNER DETECTED!</h2>
              <p style={{ color: "var(--theme-muted, #64748b)", marginTop: 0 }}>
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
                            background: "var(--theme-panel-bg, #fff)",
                      color: "var(--theme-panel-text, #0f172a)",
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
                        color: "var(--theme-muted, #64748b)",
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
              ...themedPrimaryButton,
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
                background: "var(--theme-panel-bg, #fff)",
                      color: "var(--theme-panel-text, #0f172a)",
                borderRadius: 22,
                padding: 24,
                boxShadow: "0 25px 70px rgba(0,0,0,0.35)"
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h2 style={{ marginTop: 0 }}>GAME SUMMARY</h2>
                <p style={{ color: "var(--theme-muted, #64748b)" }}>
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
                      background: prize.locked ? "#f0fdf4" : "var(--theme-panel-bg, #f8fafc)",
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
                  style={{ ...themedPrimaryButton, width: "100%", background: "#dc2626" }}
                >
                  {gameAction ? "ENDING GAME..." : "END GAME & SHOW FINAL RESULTS"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGameSummary(false)}
                  disabled={gameAction}
                  style={{ ...themedSecondaryButton, width: "100%" }}
                >
                  BACK TO LIVE GAME
                </button>
              </div>
            </section>
          </div>
        )}

        <section
          data-host-section="prize-winners-overview"
          style={{
            ...themedCardStyle,
            marginTop: 16
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Prize Winners
          </h2>

          <p
            style={{
              color: "var(--theme-muted, #64748b)",
              marginTop: 0
            }}
          >
            Prize status and confirmed winners. This section updates with the saved game results.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1.5fr",
              gap: 8,
              alignItems: "center",
              padding: "10px 12px",
              background: "var(--theme-panel-bg, #f8fafc)",
              color: "var(--theme-panel-text, #0f172a)",
              borderRadius: 10,
              fontWeight: "bold",
              marginBottom: 8
            }}
          >
            <div style={{ color: "var(--theme-panel-text, #0f172a)" }}>Prize</div>
            <div style={{ color: "var(--theme-panel-text, #0f172a)" }}>Amount</div>
            <div style={{ color: "var(--theme-panel-text, #0f172a)" }}>Winner</div>
          </div>

          {(Array.isArray(game.selected_prizes) ? game.selected_prizes : []).length === 0 ? (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "var(--theme-panel-bg, #f8fafc)",
                      color: "var(--theme-panel-muted, #64748b)"
              }}
            >
              No prizes configured for this game.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(Array.isArray(game.selected_prizes) ? game.selected_prizes : []).map((prize, index) => {
                const winners = Array.isArray(prize?.winners) ? prize.winners : [];
                const confirmed = Boolean(prize?.locked) || winners.length > 0;

                return (
                  <div
                    key={`host-prize-winner-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1.5fr",
                      gap: 8,
                      alignItems: "start",
                      padding: 12,
                      border: `1px solid ${confirmed ? "#bbf7d0" : "#e5e7eb"}`,
                      borderRadius: 10,
                      background: confirmed ? "#f0fdf4" : "var(--theme-panel-bg, #fff)",
                      color: confirmed ? "#166534" : "var(--theme-panel-text, #0f172a)"
                    }}
                  >
                    <div>
                      <b style={{ color: "var(--theme-panel-text, #0f172a)" }}>{prize?.name || `Prize ${index + 1}`}</b>
                    </div>

                    <div>
                      {prize?.amount !== "" && prize?.amount != null
                        ? formatPrizeAmount(prize.amount)
                        : "-"}
                    </div>

                    <div>
                      {winners.length > 0 ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          {winners.map((winner, winnerIndex) => (
                            <div
                              key={`host-winner-${index}-${winner.bookingId || ""}-${winner.ticketNumber || ""}-${winnerIndex}`}
                              style={{ fontWeight: "bold", color: "#166534" }}
                            >
                              {winner.playerName || "Player"} - Ticket #{winner.ticketNumber}
                              {winner.prizeShare != null
                                ? ` - ${formatPrizeAmount(winner.prizeShare)}`
                                : ""}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--theme-muted, #64748b)" }}>Waiting for a winner</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <button
          onClick={
            onNewGame
          }
          style={{
            ...themedSecondaryButton,
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
        padding: 16,
        border: "1px solid var(--theme-secondary, #cbd5e1)",
        borderRadius: 14,
        background: "var(--theme-panel-bg, #f8fafc)",
        color: "var(--theme-panel-text, #0f172a)",
        boxShadow: "0 8px 20px rgba(0,0,0,.12) inset"
      }}
    >
      <div
        style={{
          color: "var(--theme-panel-muted, #64748b)",
          fontSize: 13,
          marginBottom:
            5
        }}
      >
        {
          title
        }
      </div>

      <b style={{ color: "var(--theme-panel-text, #0f172a)" }}>
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
          "1px solid var(--theme-secondary, #e5e7eb)",
        borderRadius:
          10,
        background:
          "var(--theme-panel-bg, #f8fafc)",
        color:
          "var(--theme-panel-text, #0f172a)"
      }}
    >
      <div
        style={{
          color:
            "var(--theme-panel-muted, #64748b)",
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
  installCasinoResponsiveStyles();
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
        const unlockOptions = { capture: true, passive: true };

        window.addEventListener(
          "pointerdown",
          unlockPlayerSpeechFromGesture,
          unlockOptions
        );
        window.addEventListener(
          "touchstart",
          unlockPlayerSpeechFromGesture,
          unlockOptions
        );
        window.addEventListener(
          "click",
          unlockPlayerSpeechFromGesture,
          unlockOptions
        );
        window.addEventListener(
          "keydown",
          unlockPlayerSpeechFromGesture,
          unlockOptions
        );

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

          window.removeEventListener(
            "pointerdown",
            unlockPlayerSpeechFromGesture,
            true
          );
          window.removeEventListener(
            "touchstart",
            unlockPlayerSpeechFromGesture,
            true
          );
          window.removeEventListener(
            "click",
            unlockPlayerSpeechFromGesture,
            true
          );
          window.removeEventListener(
            "keydown",
            unlockPlayerSpeechFromGesture,
            true
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
          JSON.stringify(current.selected_prizes || []) ===
            JSON.stringify(data.selected_prizes || []) &&
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
