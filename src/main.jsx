import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { createRoot } from "react-dom/client";

import { supabase } from "./lib/supabase";

import "./themes/themes.css";

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

const THEME_LOGOS = {
  Classic: "/assets/casino-logo.png",
  Royal: "/assets/royal-logo.png",
  Party: "/assets/fun-logo.png",
  Bollywood: "/assets/bollywood-logo.png",
  Neon: "/assets/neon-logo.png",
  Elegant: "/assets/elegant-logo.png"
};

function getThemeLogo(theme) {
  return THEME_LOGOS[theme] || THEME_LOGOS.Classic;
}

/*
 * Section visual treatment: reuse the existing theme assets, but crop and
 * place them differently for successive sections. The content side remains
 * protected by a strong themed gradient so artwork never sits directly under
 * labels and inputs. No new image files are required.
 */
function getThemedSectionStyle(themeUI, extra = {}) {
  /*
   * Section visuals are intentionally NOT loaded from public/assets here.
   * themes.css owns the decorative visual layer so main.jsx only controls
   * theme state and content. This prevents old PNGs from being reintroduced
   * by inline React styles.
   */
  return {
    ...themeUI.card,
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    background: "var(--theme-section-bg)",
    border: "var(--theme-section-border)",
    boxShadow: "var(--theme-section-shadow)",
    color: "var(--theme-text)",
    backdropFilter: "var(--theme-section-backdrop, none)",
    WebkitBackdropFilter: "var(--theme-section-backdrop, none)",
    ...extra
  };
}


/* =========================================================
   THEME DESIGN SYSTEM
   Runtime definitions mirror /public/themes/theme-designs.json
========================================================= */

const THEME_DESIGNS = {
  "Classic": {
    "backgroundImage": "/assets/casino-background-mobile.jpg",
    "identity": "Traditional tambola and casino game-room",
    "page": {
      "overlay": "rgba(3, 20, 15, 0.42)",
      "text": "#fff8e7",
      "muted": "#d8d0bd"
    },
    "hero": {
      "surface": "rgba(5, 35, 25, 0.82)",
      "border": "#d4af37",
      "accent": "#f5c542",
      "text": "#fff8e7",
      "decoration": "casino-balls"
    },
    "card": {
      "surface": "rgba(7, 28, 22, 0.88)",
      "surfaceAlt": "rgba(15, 48, 35, 0.78)",
      "border": "rgba(212,175,55,0.55)",
      "radius": 20,
      "shadow": "0 18px 45px rgba(0,0,0,0.38)"
    },
    "input": {
      "background": "#f8f6ef",
      "text": "#172018",
      "border": "#c9a93b",
      "radius": 14
    },
    "button": {
      "primary": "#c99a1e",
      "primaryAlt": "#f0c94a",
      "text": "#17120a",
      "radius": 14
    }
  },
  "Royal": {
    "backgroundImage": "/assets/royal-background-mobile.jpg",
    "identity": "Regal palace, velvet and gold",
    "page": {
      "overlay": "rgba(28, 9, 48, 0.38)",
      "text": "#fff8e8",
      "muted": "#dfd1eb"
    },
    "hero": {
      "surface": "rgba(42, 16, 65, 0.80)",
      "border": "#e7c45b",
      "accent": "#f5c542",
      "text": "#fff8e8",
      "decoration": "royal-ornament"
    },
    "card": {
      "surface": "rgba(31, 12, 48, 0.88)",
      "surfaceAlt": "rgba(61, 27, 84, 0.76)",
      "border": "rgba(231,196,91,0.55)",
      "radius": 22,
      "shadow": "0 20px 55px rgba(18,5,30,0.48)"
    },
    "input": {
      "background": "#fbf7ff",
      "text": "#21122e",
      "border": "#c8a343",
      "radius": 14
    },
    "button": {
      "primary": "#d4a72c",
      "primaryAlt": "#f3d36a",
      "text": "#201326",
      "radius": 14
    }
  },
  "Party": {
    "backgroundImage": "/assets/fun-background-mobile.jpg",
    "identity": "Bright celebration, playful and energetic",
    "page": {
      "overlay": "rgba(52, 11, 55, 0.24)",
      "text": "#ffffff",
      "muted": "#f1e5f4"
    },
    "hero": {
      "surface": "rgba(76, 18, 79, 0.76)",
      "border": "#facc15",
      "accent": "#22d3ee",
      "text": "#ffffff",
      "decoration": "confetti"
    },
    "card": {
      "surface": "rgba(44, 13, 55, 0.82)",
      "surfaceAlt": "rgba(91, 24, 88, 0.72)",
      "border": "rgba(250,204,21,0.42)",
      "radius": 24,
      "shadow": "0 18px 45px rgba(35,5,42,0.34)"
    },
    "input": {
      "background": "#fffaff",
      "text": "#28152f",
      "border": "#22d3ee",
      "radius": 16
    },
    "button": {
      "primary": "#ec4899",
      "primaryAlt": "#22d3ee",
      "text": "#ffffff",
      "radius": 16
    }
  },
  "Bollywood": {
    "backgroundImage": "/assets/bollywood-background-mobile.jpg",
    "identity": "Indian cinema glamour, lights and celebration",
    "page": {
      "overlay": "rgba(76, 8, 13, 0.36)",
      "text": "#fffaf0",
      "muted": "#f1d8cf"
    },
    "hero": {
      "surface": "rgba(89, 16, 22, 0.80)",
      "border": "#fbbf24",
      "accent": "#fbbf24",
      "text": "#fffaf0",
      "decoration": "cinema-lights"
    },
    "card": {
      "surface": "rgba(62, 10, 16, 0.86)",
      "surfaceAlt": "rgba(111, 20, 28, 0.72)",
      "border": "rgba(251,191,36,0.55)",
      "radius": 20,
      "shadow": "0 20px 50px rgba(45,4,8,0.46)"
    },
    "input": {
      "background": "#fffaf5",
      "text": "#2a1113",
      "border": "#d99a18",
      "radius": 14
    },
    "button": {
      "primary": "#d97706",
      "primaryAlt": "#fbbf24",
      "text": "#ffffff",
      "radius": 14
    }
  },
  "Neon": {
    "backgroundImage": "/assets/neon-background-mobile.jpg",
    "identity": "Futuristic arcade, cyan and violet glow",
    "page": {
      "overlay": "rgba(1, 7, 18, 0.38)",
      "text": "#f5fbff",
      "muted": "#b9c9dc"
    },
    "hero": {
      "surface": "rgba(3, 13, 30, 0.78)",
      "border": "#22d3ee",
      "accent": "#22d3ee",
      "text": "#f5fbff",
      "decoration": "neon-grid"
    },
    "card": {
      "surface": "rgba(3, 12, 27, 0.84)",
      "surfaceAlt": "rgba(8, 24, 48, 0.74)",
      "border": "rgba(34,211,238,0.50)",
      "radius": 18,
      "shadow": "0 18px 50px rgba(0,0,0,0.46), 0 0 28px rgba(34,211,238,0.12)"
    },
    "input": {
      "background": "#f6fbff",
      "text": "#07111f",
      "border": "#22d3ee",
      "radius": 12
    },
    "button": {
      "primary": "#0891b2",
      "primaryAlt": "#8b5cf6",
      "text": "#ffffff",
      "radius": 12
    }
  },
  "Elegant": {
    "backgroundImage": "/assets/elegant-background-mobile.jpg",
    "identity": "Refined contemporary luxury",
    "page": {
      "overlay": "rgba(245, 241, 232, 0.16)",
      "text": "#20262d",
      "muted": "#66717b"
    },
    "hero": {
      "surface": "rgba(250, 248, 243, 0.88)",
      "border": "rgba(173, 139, 57, 0.72)",
      "accent": "#a98532",
      "text": "#20262d",
      "decoration": "minimal-gold"
    },
    "card": {
      "surface": "rgba(250, 248, 243, 0.90)",
      "surfaceAlt": "rgba(238, 233, 222, 0.82)",
      "border": "rgba(169,139,67,0.38)",
      "radius": 22,
      "shadow": "0 18px 45px rgba(48,43,34,0.18)"
    },
    "input": {
      "background": "rgba(255,255,255,0.94)",
      "text": "#20262d",
      "border": "#b99b5b",
      "radius": 12
    },
    "button": {
      "primary": "#a98532",
      "primaryAlt": "#d1b56a",
      "text": "#ffffff",
      "radius": 12
    }
  }
};

function getThemeDesign(theme) {
  return THEME_DESIGNS[theme] || THEME_DESIGNS.Classic;
}

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

const VOICE_SETTINGS_PREFIX = "tambolalive_voice_settings_v2_";
const DEFAULT_VOICE_PRESET_ID = "english";

const VOICE_PRESETS = [
  {
    id: "english",
    label: "English (Default)",
    rate: 0.88,
    pitch: 1.0,
    preferredLanguages: ["en-US", "en-GB", "en-IN"]
  },
  {
    id: "auto",
    label: "Auto / Best Available",
    rate: 0.88,
    pitch: 1.0,
    preferredLanguages: ["en-US", "en-GB", "en-IN", "hi-IN"]
  },
  {
    id: "indian",
    label: "Indian English",
    rate: 0.86,
    pitch: 0.98,
    preferredLanguages: ["en-IN", "hi-IN"]
  },
  {
    id: "hinglish",
    label: "Hindi / Hinglish",
    rate: 0.84,
    pitch: 0.98,
    preferredLanguages: ["hi-IN", "en-IN"]
  },
  {
    id: "cinema",
    label: "Deep Cinema Announcer",
    rate: 0.80,
    pitch: 0.78,
    preferredLanguages: ["en-IN", "hi-IN", "en-GB", "en-US"]
  },
  {
    id: "bright",
    label: "Bright Female Announcer",
    rate: 0.90,
    pitch: 1.18,
    preferredLanguages: ["en-IN", "hi-IN", "en-US", "en-GB"]
  }
];

function getVoiceSettingsKey(gameId) {
  return `${VOICE_SETTINGS_PREFIX}${gameId || "default"}`;
}

function loadVoicePreset(gameId) {
  try {
    const saved = localStorage.getItem(getVoiceSettingsKey(gameId));
    return VOICE_PRESETS.some((preset) => preset.id === saved) ? saved : DEFAULT_VOICE_PRESET_ID;
  } catch {
    return DEFAULT_VOICE_PRESET_ID;
  }
}

function saveVoicePreset(gameId, presetId) {
  try {
    localStorage.setItem(getVoiceSettingsKey(gameId), presetId);
  } catch (error) {
    console.error("Could not save voice preference:", error);
  }
}

function chooseSpeechVoice(voices, preset) {
  if (!Array.isArray(voices) || !voices.length) return null;

  const preferred = preset?.preferredLanguages || [];
  const englishVoices = voices.filter((voice) =>
    /^en(-|$)/i.test(String(voice.lang || ""))
  );

  const pool = preset?.id === "english" ? englishVoices : voices;
  if (!pool.length) return null;

  const byLanguage = pool.find((voice) =>
    preferred.some((language) =>
      String(voice.lang || "").toLowerCase() === language.toLowerCase()
    )
  );

  if (byLanguage) return byLanguage;

  return pool.find((voice) => /^en-US$/i.test(String(voice.lang || "")))
    || pool.find((voice) => /^en-GB$/i.test(String(voice.lang || "")))
    || pool.find((voice) => /^en-IN$/i.test(String(voice.lang || "")))
    || pool[0]
    || null;
}

function applySpeechVoice(utterance, presetId, voices) {
  const preset =
    VOICE_PRESETS.find((item) => item.id === presetId) ||
    VOICE_PRESETS[0];

  utterance.rate = preset.rate;
  utterance.pitch = preset.pitch;
  utterance.volume = 1;

  // English is a hard default: never let the browser silently fall back
  // to a Hindi/system voice when the voice list is still loading.
  utterance.lang = preset.id === "english" ? "en-US" : (preset.preferredLanguages?.[0] || "en-US");

  const selectedVoice = chooseSpeechVoice(voices, preset);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    if (preset.id === "english" && !/^en(-|$)/i.test(String(selectedVoice.lang || ""))) {
      utterance.lang = "en-US";
    } else {
      utterance.lang = selectedVoice.lang;
    }
  }

  return utterance;
}

function getAvailableSpeechVoices() {
  try {
    return "speechSynthesis" in window
      ? window.speechSynthesis.getVoices() || []
      : [];
  } catch {
    return [];
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

function speakWinnerAnnouncement(events, voicePresetId = "auto", voices = []) {
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
    applySpeechVoice(utterance, voicePresetId, voices);
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Could not announce winner:", err);
  }
}


const PLAYER_ENGLISH_CALLER_PHRASES = {
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



function getPlayerEnglishCallerPhrase(number) {
  return (
    PLAYER_ENGLISH_CALLER_PHRASES[number] ||
    `Number ${number}`
  );
}

function getWinnerAnnouncementParts(events) {
  if (!Array.isArray(events)) return [];

  return events.map((event) => {
    const voicePrizeName = getPrizeVoiceName(event.prizeName);
    const names = Array.isArray(event.winners)
      ? event.winners.map((winner) => winner.playerName || "Player")
      : [];

    let winnersText = names[0] || "a player";

    if (names.length === 2) {
      winnersText = `${names[0]} and ${names[1]}`;
    } else if (names.length > 2) {
      winnersText = `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    }

    if (names.length > 1) {
      return `${voicePrizeName} won by ${winnersText}. Prize of ${formatPrizeAmount(
        event.prizeAmount
      )} split equally among ${names.length} winners.`;
    }

    return `${voicePrizeName} won by ${winnersText}`;
  });
}

function speakPlayerAnnouncementQueue(items) {
  try {
    if (!("speechSynthesis" in window) || !Array.isArray(items) || !items.length) {
      return false;
    }

    const voices = getAvailableSpeechVoices();
    const queue = items.filter(Boolean).map((text) => String(text));
    if (!queue.length) return false;

    window.speechSynthesis.cancel();

    let index = 0;
    const speakNext = () => {
      if (index >= queue.length) return;

      const utterance = new SpeechSynthesisUtterance(queue[index++]);
      applySpeechVoice(utterance, DEFAULT_VOICE_PRESET_ID, voices);
      utterance.onend = speakNext;
      utterance.onerror = speakNext;
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
    return true;
  } catch (err) {
    console.error("Could not play player announcement:", err);
    return false;
  }
}

function getPlayerWinnerKeys(game) {
  const prizes = Array.isArray(game?.selected_prizes) ? game.selected_prizes : [];
  const keys = new Set();

  prizes.forEach((prize, prizeIndex) => {
    const winners = Array.isArray(prize?.winners) ? prize.winners : [];
    winners.forEach((winner, winnerIndex) => {
      keys.add(
        `${prizeIndex}|${winner.bookingId || ""}|${winner.ticketNumber || ""}|${winner.playerName || ""}|${winnerIndex}`
      );
    });
  });

  return keys;
}

function getNewPlayerWinnerEvents(game, previousKeys) {
  const prizes = Array.isArray(game?.selected_prizes) ? game.selected_prizes : [];
  const events = [];

  prizes.forEach((prize, prizeIndex) => {
    const winners = Array.isArray(prize?.winners) ? prize.winners : [];
    const newWinners = winners.filter((winner, winnerIndex) => {
      const key = `${prizeIndex}|${winner.bookingId || ""}|${winner.ticketNumber || ""}|${winner.playerName || ""}|${winnerIndex}`;
      return !previousKeys.has(key);
    });

    if (newWinners.length) {
      events.push({
        prizeIndex,
        prizeName: prize.name || `Prize ${prizeIndex + 1}`,
        prizeAmount: Number(prize.amount) || 0,
        winnerCount: winners.length,
        winners: newWinners
      });
    }
  });

  return events;
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
  const design = getThemeDesign(theme);

  const backgroundImage = design.backgroundImage
    ? `url("${design.backgroundImage}")`
    : "none";

  /*
    Theme design language.
    These values deliberately change structure/shape/effects, not only colors.
  */
  const variants = {
    Classic: {
      cardRadius: 16,
      inputRadius: 9,
      buttonRadius: 9,
      cardBorder: `1px solid ${design.card.border}`,
      cardShadow: "0 14px 34px rgba(0,0,0,.22)",
      cardBackdrop: "blur(8px)",
      buttonShadow: "0 8px 20px rgba(0,0,0,.20)",
      buttonFontWeight: 800,
      letterSpacing: ".01em",
      cardPadding: 22,
      inputPadding: "11px 13px",
      buttonPadding: "11px 17px"
    },

    Royal: {
      cardRadius: 24,
      inputRadius: 13,
      buttonRadius: 13,
      cardBorder: `1px solid ${design.card.border}`,
      cardShadow: "0 20px 48px rgba(35,10,55,.38), inset 0 1px 0 rgba(255,255,255,.10)",
      cardBackdrop: "blur(14px)",
      buttonShadow: "0 12px 30px rgba(100,55,130,.34), inset 0 1px 0 rgba(255,255,255,.16)",
      buttonFontWeight: 900,
      letterSpacing: ".035em",
      cardPadding: 26,
      inputPadding: "12px 15px",
      buttonPadding: "12px 20px"
    },

    Party: {
      cardRadius: 30,
      inputRadius: 17,
      buttonRadius: 22,
      cardBorder: `2px solid ${design.card.border}`,
      cardShadow: "0 18px 40px rgba(70,10,55,.28)",
      cardBackdrop: "blur(8px)",
      buttonShadow: "0 11px 25px rgba(230,45,115,.30)",
      buttonFontWeight: 900,
      letterSpacing: ".015em",
      cardPadding: 22,
      inputPadding: "12px 15px",
      buttonPadding: "12px 20px"
    },

    Bollywood: {
      cardRadius: 13,
      inputRadius: 7,
      buttonRadius: 7,
      cardBorder: `1px solid ${design.card.border}`,
      cardShadow: "0 18px 44px rgba(70,5,10,.34), inset 0 1px 0 rgba(255,220,150,.12)",
      cardBackdrop: "blur(12px)",
      buttonShadow: "0 11px 28px rgba(150,30,20,.32), inset 0 1px 0 rgba(255,220,150,.10)",
      buttonFontWeight: 900,
      letterSpacing: ".025em",
      cardPadding: 24,
      inputPadding: "11px 13px",
      buttonPadding: "11px 19px"
    },

    // Keep the Neon design as the visual benchmark.
    Neon: {
      cardRadius: 8,
      inputRadius: 6,
      buttonRadius: 6,
      cardBorder: `1px solid ${design.card.border}`,
      cardShadow: `0 0 0 1px ${design.button.primaryAlt}18 inset, 0 0 28px ${design.button.primaryAlt}20`,
      cardBackdrop: "blur(18px)",
      buttonShadow: `0 0 20px ${design.button.primaryAlt}45, inset 0 0 12px ${design.button.primaryAlt}15`,
      buttonFontWeight: 900,
      letterSpacing: ".04em",
      cardPadding: 20,
      inputPadding: "10px 12px",
      buttonPadding: "10px 16px"
    },

    Elegant: {
      cardRadius: 11,
      inputRadius: 6,
      buttonRadius: 6,
      cardBorder: `1px solid ${design.card.border}`,
      cardShadow: "0 13px 34px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.07)",
      cardBackdrop: "blur(13px)",
      buttonShadow: "0 8px 20px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.08)",
      buttonFontWeight: 700,
      letterSpacing: ".035em",
      cardPadding: 25,
      inputPadding: "11px 13px",
      buttonPadding: "11px 19px"
    }
  };

  const v = variants[theme] || variants.Classic;

  /*
     FULL-INTERFACE THEME VISUALS
     These are deliberately structural: every shared card, information tile,
     status box, prize panel and control inherits a different visual language.
     Ticket internals are not changed here.
  */
  const visuals = {
    Classic: {
      cardBackground: `linear-gradient(145deg, rgba(12,49,35,.97), rgba(3,25,18,.98)), radial-gradient(circle at 15% 12%, rgba(245,197,66,.15), transparent 30%), radial-gradient(circle at 90% 88%, rgba(181,43,34,.12), transparent 32%)`,
      panelBackground: `linear-gradient(145deg, rgba(17,57,42,.98), rgba(5,31,22,.98)), radial-gradient(circle at 20% 20%, rgba(245,197,66,.10), transparent 34%)`,
      prizeBackground: `linear-gradient(135deg, rgba(24,67,48,.98), rgba(8,35,25,.98))`,
      secondaryBackground: `linear-gradient(135deg, rgba(27,73,52,.98), rgba(9,39,28,.98))`,
      panelBorder: `1px solid rgba(212,175,55,.62)`,
      panelShadow: `0 10px 26px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,244,190,.08)`,
      statusLive: `linear-gradient(135deg, #14532d, #166534)`,
      statusEnded: `linear-gradient(135deg, #3f3f46, #27272a)`,
      statusUpcoming: `linear-gradient(135deg, #854d0e, #713f12)`
    },
    Royal: {
      cardBackground: `linear-gradient(145deg, rgba(54,19,76,.98), rgba(23,7,38,.99)), radial-gradient(circle at 12% 10%, rgba(245,197,66,.16), transparent 28%), radial-gradient(circle at 90% 90%, rgba(139,92,246,.16), transparent 32%)`,
      panelBackground: `linear-gradient(145deg, rgba(66,26,88,.98), rgba(28,10,45,.98)), radial-gradient(circle at 80% 15%, rgba(245,197,66,.12), transparent 30%)`,
      prizeBackground: `linear-gradient(135deg, rgba(74,30,99,.98), rgba(31,10,49,.98))`,
      secondaryBackground: `linear-gradient(135deg, rgba(75,34,104,.98), rgba(37,13,55,.98))`,
      panelBorder: `1px solid rgba(231,196,91,.70)`,
      panelShadow: `0 18px 40px rgba(20,5,32,.42), inset 0 1px 0 rgba(255,255,255,.10)`,
      statusLive: `linear-gradient(135deg, #166534, #14532d)`,
      statusEnded: `linear-gradient(135deg, #4c1d95, #312e81)`,
      statusUpcoming: `linear-gradient(135deg, #92400e, #78350f)`
    },
    Party: {
      cardBackground: `radial-gradient(circle at 12% 16%, rgba(236,72,153,.22) 0 2px, transparent 3px), radial-gradient(circle at 84% 24%, rgba(34,211,238,.22) 0 2px, transparent 3px), radial-gradient(circle at 68% 82%, rgba(250,204,21,.20) 0 2px, transparent 3px), linear-gradient(145deg, rgba(67,18,75,.96), rgba(38,9,48,.98))`,
      panelBackground: `radial-gradient(circle at 18% 18%, rgba(236,72,153,.18), transparent 26%), radial-gradient(circle at 82% 82%, rgba(34,211,238,.16), transparent 28%), linear-gradient(145deg, rgba(79,22,81,.98), rgba(45,11,55,.98))`,
      prizeBackground: `linear-gradient(135deg, rgba(110,27,92,.98), rgba(55,12,63,.98))`,
      secondaryBackground: `linear-gradient(135deg, rgba(123,31,91,.98), rgba(52,15,68,.98))`,
      panelBorder: `2px solid rgba(250,204,21,.58)`,
      panelShadow: `0 16px 34px rgba(44,6,53,.34), 0 0 24px rgba(236,72,153,.10)`,
      statusLive: `linear-gradient(135deg, #0e7490, #0891b2)`,
      statusEnded: `linear-gradient(135deg, #6b21a8, #4c1d95)`,
      statusUpcoming: `linear-gradient(135deg, #be185d, #9d174d)`
    },
    Bollywood: {
      cardBackground: `radial-gradient(circle at 10% 10%, rgba(251,191,36,.18) 0 2px, transparent 3px), radial-gradient(circle at 90% 10%, rgba(251,191,36,.14) 0 2px, transparent 3px), linear-gradient(145deg, rgba(91,16,22,.98), rgba(44,6,12,.99))`,
      panelBackground: `linear-gradient(145deg, rgba(111,24,30,.98), rgba(51,8,14,.98)), radial-gradient(circle at 50% 0%, rgba(251,191,36,.14), transparent 35%)`,
      prizeBackground: `linear-gradient(135deg, rgba(128,26,28,.98), rgba(59,8,14,.98))`,
      secondaryBackground: `linear-gradient(135deg, rgba(151,42,23,.98), rgba(70,10,15,.98))`,
      panelBorder: `1px solid rgba(251,191,36,.72)`,
      panelShadow: `0 18px 42px rgba(52,4,9,.42), inset 0 1px 0 rgba(255,220,150,.10)`,
      statusLive: `linear-gradient(135deg, #15803d, #166534)`,
      statusEnded: `linear-gradient(135deg, #7f1d1d, #991b1b)`,
      statusUpcoming: `linear-gradient(135deg, #b45309, #92400e)`
    },
    Neon: {
      cardBackground: `linear-gradient(145deg, rgba(4,18,38,.97), rgba(2,8,20,.99)), repeating-linear-gradient(90deg, transparent 0 28px, rgba(34,211,238,.055) 29px, transparent 30px), repeating-linear-gradient(0deg, transparent 0 28px, rgba(139,92,246,.045) 29px, transparent 30px)`,
      panelBackground: `linear-gradient(145deg, rgba(8,29,55,.98), rgba(2,12,28,.98)), repeating-linear-gradient(90deg, transparent 0 22px, rgba(34,211,238,.07) 23px, transparent 24px), repeating-linear-gradient(0deg, transparent 0 22px, rgba(139,92,246,.055) 23px, transparent 24px)`,
      prizeBackground: `linear-gradient(135deg, rgba(12,42,74,.98), rgba(4,18,40,.98)), linear-gradient(90deg, rgba(34,211,238,.08), transparent)`,
      secondaryBackground: `linear-gradient(135deg, rgba(10,48,75,.98), rgba(20,19,61,.98))`,
      panelBorder: `1px solid rgba(34,211,238,.72)`,
      panelShadow: `0 0 0 1px rgba(139,92,246,.20) inset, 0 0 26px rgba(34,211,238,.13), 0 14px 34px rgba(0,0,0,.34)`,
      statusLive: `linear-gradient(135deg, #0e7490, #155e75)`,
      statusEnded: `linear-gradient(135deg, #5b21b6, #312e81)`,
      statusUpcoming: `linear-gradient(135deg, #0f766e, #115e59)`
    },
    Elegant: {
      cardBackground: `linear-gradient(145deg, rgba(250,248,243,.96), rgba(235,231,221,.96)), radial-gradient(circle at 85% 10%, rgba(169,139,67,.10), transparent 30%)`,
      panelBackground: `linear-gradient(145deg, rgba(255,253,248,.98), rgba(238,234,224,.96))`,
      prizeBackground: `linear-gradient(135deg, rgba(255,253,248,.99), rgba(239,235,226,.98))`,
      secondaryBackground: `linear-gradient(135deg, rgba(255,253,248,.98), rgba(231,225,211,.98))`,
      panelBorder: `1px solid rgba(169,139,67,.55)`,
      panelShadow: `0 14px 30px rgba(48,43,34,.16), inset 0 1px 0 rgba(255,255,255,.80)`,
      statusLive: `linear-gradient(135deg, #166534, #15803d)`,
      statusEnded: `linear-gradient(135deg, #475569, #334155)`,
      statusUpcoming: `linear-gradient(135deg, #a16207, #854d0e)`
    }
  };

  const visual = visuals[theme] || visuals.Classic;

  return {
    themeName: theme,
    colors,
    design,
    visual,

    page: {
      backgroundColor: colors.background,
      backgroundImage: backgroundImage === "none"
        ? "none"
        : `linear-gradient(${design.page.overlay}, ${design.page.overlay}), ${backgroundImage}`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundAttachment: "scroll",
      backgroundRepeat: "no-repeat",
      isolation: "isolate",
      color: design.page.text,
      padding: 20,
      position: "relative",
      overflowX: "hidden",
      minHeight: "100vh",

      /* Shared theme variables for the entire interface. */
      "--theme-accent": design.hero.accent,
      "--theme-secondary": design.button.primaryAlt,
      "--theme-bg": colors.background,
      "--theme-text": design.hero.text,
      "--theme-muted": design.page.muted,
      "--theme-surface": design.card.surface,
      "--theme-surface2": design.card.surfaceAlt,
      "--theme-input-bg": design.input.background,
      "--theme-input-text": design.input.text,
      "--theme-input-muted": design.page.muted,
      "--theme-panel-bg": visual.panelBackground,
      "--theme-panel-text": design.hero.text,
      "--theme-panel-muted": design.page.muted,
      "--theme-ticket-bg": design.input.background,
      "--theme-ticket-text": design.input.text,
      "--theme-glow": design.button.primaryAlt,
      "--theme-card-bg": visual.cardBackground,
      "--theme-prize-bg": visual.prizeBackground,
      "--theme-secondary-bg": visual.secondaryBackground,
      "--theme-panel-border": visual.panelBorder,
      "--theme-panel-shadow": visual.panelShadow,
      "--theme-status-live": visual.statusLive,
      "--theme-status-ended": visual.statusEnded,
      "--theme-status-upcoming": visual.statusUpcoming,

      "--theme-card-radius": `${v.cardRadius}px`,
      "--theme-input-radius": `${v.inputRadius}px`,
      "--theme-button-radius": `${v.buttonRadius}px`,
      "--theme-letter-spacing": v.letterSpacing,
      "--theme-card-padding": `${v.cardPadding}px`,
      "--theme-input-padding": v.inputPadding,
      "--theme-button-padding": v.buttonPadding,
      "--theme-control-shadow": v.buttonShadow
    },

    card: {
      background: visual.cardBackground,
      border: v.cardBorder,
      borderRadius: v.cardRadius,
      backgroundClip: "padding-box",
      padding: v.cardPadding,
      color: design.hero.text,
      boxShadow: `${v.cardShadow}, ${visual.panelShadow}`,
      backdropFilter: v.cardBackdrop,
      WebkitBackdropFilter: v.cardBackdrop,
      overflow: "hidden"
    },

    input: {
      border: `1px solid ${design.input.border}`,
      borderRadius: v.inputRadius,
      padding: v.inputPadding,
      boxShadow: v.cardShadow,
      background: design.input.background,
      color: design.input.text,
      WebkitTextFillColor: design.input.text,
      caretColor: design.hero.accent,
      outlineColor: design.hero.accent
    },

    primary: {
      background: `linear-gradient(135deg, ${design.button.primary} 0%, ${design.button.primaryAlt} 100%)`,
      color: design.button.text,
      borderRadius: v.buttonRadius,
      padding: v.buttonPadding,
      border: `1px solid ${design.button.primary}`,
      boxShadow: v.buttonShadow,
      transform: "translateY(0)",
      fontWeight: v.buttonFontWeight,
      letterSpacing: v.letterSpacing
    },

    secondary: {
      border: `1px solid ${design.card.border}`,
      borderRadius: v.buttonRadius,
      padding: v.buttonPadding,
      background: visual.secondaryBackground,
      color: design.hero.text,
      boxShadow: v.buttonShadow,
      fontWeight: v.buttonFontWeight,
      letterSpacing: v.letterSpacing
    }
  };
}

function ThemeHero({ theme, title, subtitle, compact = false }) {
  const ui = getThemeUI(theme);
  const c = ui.colors;

  return (
    <div
      className="tl-theme-hero"
      style={{
        maxWidth: 1000,
        margin: "0 auto 18px",
        minHeight: compact ? 108 : 132,
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        border: `1px solid ${c.accent}66`,
        color: ui.design.hero.text,
        padding: compact ? "17px 20px" : "20px 24px",
        boxSizing: "border-box"
      }}
    >
      {/* Theme artwork is owned by themes.css. No inline PNG/background here. */}
      <div className="tl-theme-hero-art" aria-hidden="true" />

      <div className="tl-theme-hero-copy">
        <div
          style={{
            fontSize: compact ? 10 : 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: c.accent,
            fontWeight: 800
          }}
        >
          {theme || "Classic"} - TAMBOLA LIVE
        </div>

        <div
          style={{
            fontSize: compact ? 24 : 30,
            lineHeight: 1.06,
            fontWeight: 900,
            marginTop: 6,
            overflowWrap: "anywhere"
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: 7,
              color: "var(--theme-muted, #d8d0bd)",
              fontSize: compact ? 12 : 14,
              lineHeight: 1.3,
              maxWidth: 440
            }}
          >
            {subtitle}
          </div>
        )}
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
  game,
  options = {}
) {
  const showPrizeAmounts =
    options.showPrizeAmounts === true;

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

  const baseColors =
    posterTheme(
      game.theme
    );

  // Give every newly-created game its own poster variation.
  // The variation is deterministic from the game's unique code/id, so
  // refreshing or resharing the same game does not randomly change it.
  const gameIdentity = String(
    game.game_code ||
    game.id ||
    game.created_at ||
    game.game_name ||
    "TambolaLive"
  );

  let gameHash = 0;
  for (let i = 0; i < gameIdentity.length; i += 1) {
    gameHash =
      (gameHash * 31 + gameIdentity.charCodeAt(i)) >>> 0;
  }

  const posterVariant = gameHash % 5;

  const variantAccents = [
    baseColors.accent,
    baseColors.secondary,
    "#38bdf8",
    "#f472b6",
    "#a78bfa"
  ];

  const variantSecondary = [
    baseColors.secondary,
    "#22c55e",
    "#f59e0b",
    "#60a5fa",
    "#fb7185"
  ];

  const colors = {
    ...baseColors,
    accent: variantAccents[posterVariant],
    secondary: variantSecondary[posterVariant]
  };

  const gradient =
    ctx.createLinearGradient(
      posterVariant === 1 ? width : 0,
      posterVariant === 2 ? height : 0,
      posterVariant === 3 ? 0 : width,
      posterVariant === 4 ? 0 : height
    );

  gradient.addColorStop(
    0,
    colors.background
  );

  gradient.addColorStop(
    0.55,
    "#0f172a"
  );

  gradient.addColorStop(
    1,
    posterVariant === 0
      ? "#020617"
      : colors.secondary
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  // Per-game decorative glow shapes.
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = colors.accent;

  ctx.beginPath();
  ctx.arc(
    120 + posterVariant * 70,
    130 + posterVariant * 45,
    190 + posterVariant * 18,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.arc(
    960 - posterVariant * 55,
    250 + posterVariant * 65,
    230 - posterVariant * 12,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.globalAlpha = 1;

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
          showPrizeAmounts
            ? `${
                prize.name ||
                "Prize"
              } - INR ${
                prize.amount ||
                0
              }`
            : String(
                prize.name ||
                "Prize"
              ),
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
    showPrizeAmounts
      ? "PRIZE AMOUNTS"
      : "PRIZE LIST",
    width / 2,
    footerY
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.75)";

  ctx.font =
    "18px Arial";

  ctx.fillText(
    showPrizeAmounts
      ? "Prize amounts set by the host"
      : "Final prize amounts announced by the host",
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
    }-${gameIdentity.replace(/[^a-z0-9]/gi, "_")}-poster.png`,
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
  minHeight: "100dvh",
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  background: "#f5f7fb",
  /* Full-bleed app background; content keeps a small safe gutter. */
  padding: "12px max(14px, env(safe-area-inset-right)) 16px max(14px, env(safe-area-inset-left))",
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif"
};

const cardStyle = {
  background: "#fff",
                      color: "var(--theme-text, #0f172a)",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 3px 10px rgba(0,0,0,.05)",
  boxSizing: "border-box"
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
                      color: "var(--theme-text, #0f172a)",
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
  const themeUI = getThemeUI(theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const nextSectionStyle = (extra = {}) =>
    getThemedSectionStyle(themeUI, extra);
  const themedInputStyle = { ...inputStyle, ...themeUI.input };
  const themedPrimaryButton = { ...primaryButton, ...themeUI.primary };
  const themedSecondaryButton = { ...secondaryButton, ...themeUI.secondary };

  function togglePrize(index) {
    setPrizes((current) =>
      current.map((p, i) =>
        i === index
          ? { ...p, selected: p.selected !== false ? false : true }
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
          amount: "",
          selected: true
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
          .filter((p) => p.selected !== false)
          .map((p) => ({
            name: p.name,
            amount: ""
          }));

      if (!selectedPrizes.length) {
        setError("Please select at least one prize.");
        setCreating(false);
        return;
      }

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
    <main className={`tl-theme-page tl-theme-${theme.toLowerCase()}`} style={themedPageStyle}>
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
          <img
            src={getThemeLogo(theme)}
            alt={`${theme || "Classic"} Tambola Live`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            style={{
              width: "min(190px, 58vw)",
              maxHeight: 58,
              objectFit: "contain",
              display: "block",
              margin: "0 auto 6px",
              filter: `drop-shadow(0 4px 10px ${themeUI.colors.secondary}44)`
            }}
          />

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
          <section className="tl-theme-section"
            style={
              nextSectionStyle()
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

          <section className="tl-theme-section"
            style={
              nextSectionStyle()
            }
          >
            <h2>
              Select Prizes
            </h2>

            <p
              style={{
                color: "var(--theme-muted, #64748b)",
                marginTop: 0
              }}
            >
              Choose which prizes you want in this game. Prize amounts will be entered later in the Host Control Centre after ticket sales are known.
            </p>

            <div
              style={{
                display: "grid",
                gap: 9
              }}
            >
              {prizes.map((p, index) => {
                const selected = p.selected !== false;

                return (
                  <label
                    key={`${p.name}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      border: `1px solid ${selected ? themeUI.colors.accent : "#cbd5e1"}`,
                      borderRadius: 10,
                      background: selected
                        ? "var(--theme-panel-bg, #f8fafc)"
                        : "transparent",
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePrize(index)}
                      style={{
                        width: 20,
                        height: 20,
                        accentColor: themeUI.colors.accent
                      }}
                    />

                    <span
                      style={{
                        flex: 1,
                        fontWeight: 800,
                        color: "var(--theme-panel-text, #0f172a)"
                      }}
                    >
                      {p.name}
                    </span>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        removePrize(index);
                      }}
                      style={{
                        ...themedSecondaryButton,
                        padding: "7px 10px",
                        fontSize: 12
                      }}
                    >
                      Remove
                    </button>
                  </label>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 15
              }}
            >
              <input
                placeholder="Add custom prize"
                value={customPrize}
                onChange={(e) =>
                  setCustomPrize(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPrize();
                  }
                }}
                style={themedInputStyle}
              />

              <button
                type="button"
                onClick={addPrize}
                style={themedSecondaryButton}
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
          shell: "linear-gradient(145deg, #2b1242 0%, #12081e 100%)",
          grid: "linear-gradient(145deg, #24113b 0%, #35175a 100%)",
          empty: "#1a0d2b",
          line: "#8e6bb0",
          text: "#fff8df",
          muted: "#f5c542",
          player: "rgba(245,197,66,.14)",
          selected: "linear-gradient(145deg, #4b216f, #21102f)",
          glow: "rgba(245,197,66,.34)"
        };
      case "Party":
        return {
          shell: "linear-gradient(145deg, #68154f 0%, #260a23 100%)",
          grid: "linear-gradient(145deg, #4d123d 0%, #741957 100%)",
          empty: "#32102d",
          line: "#d66aa7",
          text: "#fff7fb",
          muted: "#fde047",
          player: "rgba(34,211,238,.14)",
          selected: "linear-gradient(145deg, #8f246c, #47102f)",
          glow: "rgba(244,63,94,.34)"
        };
      case "Bollywood":
        return {
          shell: "linear-gradient(145deg, #71161a 0%, #28080a 100%)",
          grid: "linear-gradient(145deg, #551013 0%, #861c20 100%)",
          empty: "#3a0b0e",
          line: "#d78b5b",
          text: "#fff8e9",
          muted: "#ffd166",
          player: "rgba(251,191,36,.16)",
          selected: "linear-gradient(145deg, #a92a2d, #511012)",
          glow: "rgba(251,191,36,.34)"
        };
      case "Neon":
        return {
          shell: "linear-gradient(145deg, #0b1528 0%, #030712 100%)",
          grid: "linear-gradient(145deg, #0c1d35 0%, #081426 100%)",
          empty: "#050c18",
          line: "#24506c",
          text: "#f8fafc",
          muted: "#22d3ee",
          player: "rgba(34,211,238,.12)",
          selected: "linear-gradient(145deg, #102b4b, #050814)",
          glow: "rgba(34,211,238,.40)"
        };
      case "Elegant":
        return {
          shell: "linear-gradient(145deg, #173330 0%, #091716 100%)",
          grid: "linear-gradient(145deg, #183c38 0%, #102c29 100%)",
          empty: "#0d211f",
          line: "#5e8c82",
          text: "#f8f4e8",
          muted: "#e4c76a",
          player: "rgba(212,175,55,.14)",
          selected: "linear-gradient(145deg, #28534d, #0b201e)",
          glow: "rgba(212,175,55,.34)"
        };
      default:
        return {
          shell: "linear-gradient(145deg, #102d55 0%, #07111f 100%)",
          grid: "linear-gradient(145deg, #153b68 0%, #0d294a 100%)",
          empty: "#081a2e",
          line: "#4b79a8",
          text: "#f8fbff",
          muted: "#60a5fa",
          player: "rgba(96,165,250,.14)",
          selected: "linear-gradient(145deg, #173e70, #0b1e36)",
          glow: "rgba(96,165,250,.34)"
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
        borderRadius: 18,
        padding: 10,
        width: "100%",
        boxSizing: "border-box",
        background: selected
          ? ticketTheme.selected
          : ticketTheme.shell,
        cursor: onSelect ? "pointer" : "default",
        boxShadow: selected
          ? `0 16px 34px ${ticketTheme.glow}, 0 0 0 1px ${c.accent}66 inset`
          : `0 12px 28px rgba(0,0,0,.25), 0 0 0 1px ${c.secondary}22 inset`,
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        // Progressive performance enhancement for long ticket lists.
        // Older browsers ignore these properties safely.
        contentVisibility: "auto",
        contain: "layout paint",
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
          marginBottom: 7
        }}
      >
        <b
          style={{
            fontSize: 20,
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
          gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
          width: "100%",
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
                  minHeight: 38,
                  height: 38,
                  display: "flex",
                  boxSizing: "border-box",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight:
                    col === 8 ? "none" : `1px solid ${ticketTheme.line}`,
                  borderBottom:
                    r === 2 ? "none" : `1px solid ${ticketTheme.line}`,
                  fontWeight: value ? "800" : "normal",
                  fontSize: 16,
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
          marginTop: 7,
          textAlign: "center",
          color: c.accent,
          fontWeight: "800",
          letterSpacing: ".01em"
        }}
      >
        {selected ? "Tap to unselect" : "Tap to select"}
      </div>
    </div>
  );
}

/* Keep ticket DOM stable while live game state updates. This prevents mobile scroll blinking/repainting. */
const TicketGrid = React.memo(TicketGridComponent);


/* =========================================================
   TICKET PACKAGE PRICING
   Single ticket = full price.
   Half Sheet (3) and Full Sheet (6) receive the agreed 11.1111%
   bundle discount. Larger selections automatically use as many
   Full Sheets as possible, then one Half Sheet when applicable,
   then any remaining single tickets.
========================================================= */

const PACKAGE_PRICE_FACTOR = 8 / 9;

function calculateTicketPackagePrice(ticketCount, ticketPrice) {
  const count = Math.max(0, Math.floor(Number(ticketCount) || 0));
  const singlePrice = Math.max(0, Math.round(Number(ticketPrice) || 0));
  const halfSheetPrice = Math.round(singlePrice * 3 * PACKAGE_PRICE_FACTOR);
  const fullSheetPrice = Math.round(singlePrice * 6 * PACKAGE_PRICE_FACTOR);

  const fullSheets = Math.floor(count / 6);
  let remaining = count % 6;
  const halfSheets = remaining >= 3 ? 1 : 0;

  if (halfSheets) {
    remaining -= 3;
  }

  const singleTickets = remaining;
  const total =
    fullSheets * fullSheetPrice +
    halfSheets * halfSheetPrice +
    singleTickets * singlePrice;

  return {
    total,
    singlePrice,
    halfSheetPrice,
    fullSheetPrice,
    fullSheets,
    halfSheets,
    singleTickets
  };
}

/* =========================================================
   PLAYER BOOKING PAGE
========================================================= */

function PlayerBookingPage({
  game,
  onVoiceEnable
}) {
  const themeUI = getThemeUI(game.theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const nextSectionStyle = (extra = {}) =>
    getThemedSectionStyle(themeUI, extra);
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

  const pricing = calculateTicketPackagePrice(
    selected.length,
    game.ticket_price
  );

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

  // Keep the ticket selector compact on phones and low-end Android devices.
  // The first 15 tickets render initially; the rest are revealed on demand.
  const [
    showAllTickets,
    setShowAllTickets
  ] = useState(false);

  const [
    showBookingTicketList,
    setShowBookingTicketList
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

  const INITIAL_TICKET_COUNT = 15;

  const visibleTickets =
    showAllTickets
      ? tickets
      : tickets.slice(
          0,
          Math.min(
            INITIAL_TICKET_COUNT,
            tickets.length
          )
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
    // The booking button is also the player voice-activation gesture.
    // This happens synchronously from the button tap before any await,
    // allowing mobile browsers to authorize speech for the live game.
    if (typeof onVoiceEnable === "function") {
      onVoiceEnable();
    }

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

      // Clear only this submission. Existing bookings do not lock this player
      // out of making another booking for any still-available ticket.
      setSelected([]);

      await loadUnavailableTickets();

      // Open WhatsApp with an approval request. No host phone number is
      // hard-coded; WhatsApp lets the player choose the host/contact.
      const bookingPricing = calculateTicketPackagePrice(
        sortedTickets.length,
        game.ticket_price
      );

      const pricingParts = [];
      if (bookingPricing.fullSheets > 0) {
        pricingParts.push(
          `${bookingPricing.fullSheets} Full Sheet${bookingPricing.fullSheets > 1 ? "s" : ""} @ \u20B9${bookingPricing.fullSheetPrice}`
        );
      }
      if (bookingPricing.halfSheets > 0) {
        pricingParts.push(
          `${bookingPricing.halfSheets} Half Sheet${bookingPricing.halfSheets > 1 ? "s" : ""} @ \u20B9${bookingPricing.halfSheetPrice}`
        );
      }
      if (bookingPricing.singleTickets > 0) {
        pricingParts.push(
          `${bookingPricing.singleTickets} Single Ticket${bookingPricing.singleTickets > 1 ? "s" : ""} @ \u20B9${bookingPricing.singlePrice}`
        );
      }

      const whatsappMessage =
        `Hello, I am ${name}. I have requested ticket${
          sortedTickets.length === 1 ? "" : "s"
        } ${sortedTickets
          .map((n) => `#${n}`)
          .join(", ")} for ${game.game_name}.\n\n` +
        `Pricing: ${pricingParts.join(" + ")}\n` +
        `Total Amount: \u20B9${bookingPricing.total}\n\n` +
        `Please approve my booking.`;

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
    <main className={`tl-theme-page tl-theme-${game.theme.toLowerCase()}`} style={themedPageStyle}>
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

        <section className="tl-theme-section"
          style={
            nextSectionStyle()
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

        <section className="tl-theme-section"
          style={
            nextSectionStyle()
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
            {visibleTickets.map(
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

          {tickets.length > INITIAL_TICKET_COUNT && (
            <button
              type="button"
              onClick={() =>
                setShowAllTickets((current) => !current)
              }
              style={{
                width: "100%",
                marginTop: 14,
                minHeight: 48,
                borderRadius: 13,
                border: `1px solid ${themeUI.colors.accent}66`,
                background: showAllTickets
                  ? "rgba(255,255,255,.10)"
                  : `linear-gradient(135deg, ${themeUI.colors.accent}, ${themeUI.colors.secondary})`,
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: 0.3,
                cursor: "pointer",
                boxShadow: showAllTickets
                  ? "none"
                  : `0 8px 20px ${themeUI.colors.secondary}30`
              }}
            >
              {showAllTickets
                ? "SHOW LESS"
                : `SHOW MORE (${tickets.length - visibleTickets.length} MORE)`}
            </button>
          )}

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

            {selected.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  padding: "12px 13px",
                  borderRadius: 10,
                  background: "var(--theme-panel-bg, #f8fafc)",
                  color: "var(--theme-panel-text, #0f172a)",
                  border: "1px solid var(--theme-accent, #cbd5e1)66"
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 15
                  }}
                >
                  Estimated Total: {"\u20B9"}{pricing.total}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    opacity: 0.85
                  }}
                >
                  {pricing.fullSheets > 0 &&
                    `${pricing.fullSheets} Full Sheet${pricing.fullSheets > 1 ? "s" : ""}`}
                  {pricing.fullSheets > 0 && pricing.halfSheets > 0 ? " + " : ""}
                  {pricing.halfSheets > 0 &&
                    `${pricing.halfSheets} Half Sheet${pricing.halfSheets > 1 ? "s" : ""}`}
                  {(pricing.fullSheets > 0 || pricing.halfSheets > 0) && pricing.singleTickets > 0 ? " + " : ""}
                  {pricing.singleTickets > 0 &&
                    `${pricing.singleTickets} Single Ticket${pricing.singleTickets > 1 ? "s" : ""}`}
                </div>
              </div>
            )}

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <h2 style={{ margin: 0 }}>
              All 3x9 Tambola Tickets
            </h2>
            <button
              type="button"
              onClick={() =>
                setShowBookingTicketList((current) => !current)
              }
              aria-expanded={showBookingTicketList}
              style={{
                ...themedSecondaryButton,
                minHeight: 42,
                whiteSpace: "nowrap"
              }}
            >
              {showBookingTicketList ? "SHOW LESS" : "SHOW MORE"}
            </button>
          </div>

          {showBookingTicketList && (
            <>
              <div
                style={{
                  display:
                    "grid",
                  gap: 18
                }}
              >
            {visibleTickets.map(
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

              {tickets.length > INITIAL_TICKET_COUNT && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAllTickets((current) => !current)
                  }
                  aria-expanded={showAllTickets}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    minHeight: 48,
                    borderRadius: 13,
                    border: `1px solid ${themeUI.colors.accent}66`,
                    background: showAllTickets
                      ? "rgba(255,255,255,.10)"
                      : `linear-gradient(135deg, ${themeUI.colors.accent}, ${themeUI.colors.secondary})`,
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: 0.3,
                    cursor: "pointer",
                    boxShadow: showAllTickets
                      ? "none"
                      : `0 8px 20px ${themeUI.colors.secondary}30`
                  }}
                >
                  {showAllTickets
                    ? "SHOW LESS"
                    : `SHOW MORE (${tickets.length - visibleTickets.length} MORE)`}
                </button>
              )}
            </>
          )}
        </section>

        <section
          style={nextSectionStyle({
            marginTop: 20
          })}
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
                } \u2014 \u20B9${pricing.total}`}
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


function ThemeCurrentNumberVisual({ theme, number, themeUI }) {
  const value = number || "-";
  const c = themeUI.colors;

  if (theme === "Classic") {
    return (
      <div
        style={{
          position: "relative",
          width: 300,
          height: 190,
          margin: "18px auto 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 18,
            top: 28,
            width: 70,
            height: 108,
            borderRadius: 9,
            background: "linear-gradient(145deg,#fff8e7,#e8dcc2)",
            border: `2px solid ${c.accent}`,
            boxShadow: "0 10px 22px rgba(0,0,0,.38)",
            transform: "rotate(-13deg)",
            color: "#5b1111",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 25,
            lineHeight: 1.05
          }}
        >
          <span>A</span>
          <span style={{ fontSize: 32 }}>&#9824;</span>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 18,
            top: 28,
            width: 70,
            height: 108,
            borderRadius: 9,
            background: "linear-gradient(145deg,#fff8e7,#e8dcc2)",
            border: `2px solid ${c.accent}`,
            boxShadow: "0 10px 22px rgba(0,0,0,.38)",
            transform: "rotate(13deg)",
            color: "#8b1e1e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 25,
            lineHeight: 1.05
          }}
        >
          <span>K</span>
          <span style={{ fontSize: 32 }}>&#9829;</span>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: 168,
            height: 168,
            borderRadius: "50%",
            background: `
              radial-gradient(circle,#15110c 0 47%,#f7e8c0 48% 51%,transparent 52%),
              repeating-conic-gradient(from 0deg,#b52b22 0deg 18deg,#f7e8c0 18deg 30deg,#b52b22 30deg 48deg)
            `,
            border: `3px solid ${c.accent}`,
            boxShadow: `0 0 28px ${c.secondary}66,0 14px 30px rgba(0,0,0,.42)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%,#3b3326,#090806 72%)",
              border: "2px solid #d6b45b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff3c9",
              fontSize: 68,
              fontWeight: 900,
              textShadow: "0 2px 8px rgba(0,0,0,.65)"
            }}
          >
            {value}
          </div>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 12,
              left: 0,
              right: 0,
              textAlign: "center",
              color: "#fff0b5",
              fontSize: 16
            }}
          >
            &#9824; &#9829; &#9830; &#9827;
          </span>
        </div>
      </div>
    );
  }

  if (theme === "Royal") {
    return (
      <div
        style={{
          width: 300,
          height: 190,
          margin: "18px auto 12px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 5,
            fontSize: 38,
            color: c.accent,
            textShadow: `0 0 18px ${c.accent}66`
          }}
        >
          &#9819;
        </div>
        <div
          style={{
            width: 150,
            height: 150,
            transform: "rotate(45deg)",
            borderRadius: 28,
            background: `linear-gradient(145deg,${c.secondary},${c.background})`,
            border: `3px solid ${c.accent}`,
            boxShadow: `0 0 30px ${c.secondary}55,0 14px 30px rgba(0,0,0,.38)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              transform: "rotate(-45deg)",
              borderRadius: 18,
              border: `2px solid ${c.accent}`,
              background: `linear-gradient(145deg,${c.surface2},${c.background})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: c.text,
              fontSize: 62,
              fontWeight: 900,
              textShadow: `0 2px 10px ${c.secondary}`
            }}
          >
            {value}
          </div>
        </div>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 42,
            bottom: 20,
            color: c.accent,
            fontSize: 22
          }}
        >
          &#9670;
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 42,
            bottom: 20,
            color: c.accent,
            fontSize: 22
          }}
        >
          &#9670;
        </span>
      </div>
    );
  }

  if (theme === "Party") {
    return (
      <div
        style={{
          width: 310,
          height: 190,
          margin: "18px auto 12px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {[
          { left: 18, top: 25, color: "#ec4899", rotate: -16 },
          { right: 20, top: 18, color: "#22d3ee", rotate: 15 },
          { left: 54, bottom: 5, color: "#facc15", rotate: 9 },
          { right: 52, bottom: 7, color: "#8b5cf6", rotate: -9 }
        ].map((balloon, index) => (
          <div
            key={`party-balloon-${index}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              ...balloon,
              width: 52,
              height: 68,
              borderRadius: "50% 50% 46% 46%",
              background: balloon.color,
              boxShadow: `0 8px 18px ${balloon.color}55`,
              transform: `rotate(${balloon.rotate}deg)`
            }}
          />
        ))}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: 148,
            height: 148,
            borderRadius: "32% 68% 58% 42% / 42% 38% 62% 58%",
            background: `linear-gradient(135deg,${c.secondary},${c.accent})`,
            border: `4px solid ${c.accent}`,
            boxShadow: `0 0 28px ${c.accent}66,0 14px 28px rgba(0,0,0,.28)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 64,
            fontWeight: 900
          }}
        >
          {value}
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            left: 105,
            color: "#facc15",
            fontSize: 25
          }}
        >
          &#10022; &#10022;
        </div>
      </div>
    );
  }

  if (theme === "Bollywood") {
    return (
      <div
        style={{
          width: 320,
          height: 190,
          margin: "18px auto 12px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "18px 8px",
            borderRadius: 18,
            background: `linear-gradient(145deg,${c.background},${c.secondary})`,
            border: `3px solid ${c.accent}`,
            boxShadow: `0 0 28px ${c.accent}44,0 14px 28px rgba(0,0,0,.35)`
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            left: 24,
            right: 24,
            display: "flex",
            justifyContent: "space-between",
            color: c.accent,
            fontSize: 18,
            letterSpacing: 5
          }}
        >
          &#9679; &#9679; &#9679; &#9679; &#9679; &#9679; &#9679; &#9679;
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 24,
            top: 70,
            color: c.accent,
            fontSize: 32
          }}
        >
          &#9733;
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 24,
            top: 70,
            color: c.accent,
            fontSize: 32
          }}
        >
          &#9733;
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 2,
            minWidth: 130,
            padding: "18px 30px",
            borderRadius: 12,
            background: `linear-gradient(135deg,${c.accent},${c.secondary})`,
            border: "3px solid #fff3cf",
            boxShadow: "0 8px 24px rgba(0,0,0,.38)",
            color: "#fffaf0",
            fontSize: 66,
            fontWeight: 900,
            textAlign: "center",
            textShadow: "0 3px 10px rgba(0,0,0,.45)"
          }}
        >
          {value}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            left: 35,
            right: 35,
            height: 8,
            borderRadius: 8,
            background: `linear-gradient(90deg,transparent,${c.accent},transparent)`
          }}
        />
      </div>
    );
  }

  if (theme === "Neon") {
    return (
      <div
        style={{
          width: 300,
          height: 190,
          margin: "18px auto 12px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 170,
            height: 170,
            border: `2px solid ${c.accent}`,
            transform: "rotate(45deg)",
            boxShadow: `0 0 22px ${c.accent}66, inset 0 0 22px ${c.accent}22`,
            background: `linear-gradient(135deg,${c.secondary}22,transparent)`
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 205,
            height: 110,
            borderTop: `2px solid ${c.secondary}`,
            borderBottom: `2px solid ${c.secondary}`,
            transform: "skewX(-20deg)",
            opacity: .7
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: 145,
            height: 120,
            clipPath: "polygon(15% 0,85% 0,100% 50%,85% 100%,15% 100%,0 50%)",
            background: `linear-gradient(135deg,${c.secondary},${c.background})`,
            border: `2px solid ${c.accent}`,
            boxShadow: `0 0 30px ${c.secondary}77`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f5fbff",
            fontSize: 64,
            fontWeight: 900,
            textShadow: `0 0 14px ${c.accent}`
          }}
        >
          {value}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 12,
            color: c.accent,
            fontSize: 14,
            letterSpacing: 5,
            textShadow: `0 0 10px ${c.accent}`
          }}
        >
          N E O N
        </div>
      </div>
    );
  }

  // Elegant
  return (
    <div
      style={{
        width: 310,
        height: 185,
        margin: "18px auto 12px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 250,
          height: 140,
          border: `1px solid ${c.accent}99`,
          background: `linear-gradient(145deg,${c.surface2},${c.background}cc)`,
          boxShadow: `0 14px 30px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.55)`,
          transform: "rotate(-2deg)"
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: 160,
          height: 118,
          border: `2px solid ${c.accent}`,
          background: `linear-gradient(145deg,${c.surface2},${c.background})`,
          boxShadow: `0 10px 25px rgba(0,0,0,.20), 0 0 18px ${c.accent}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: c.text,
          fontSize: 62,
          fontWeight: 800,
          letterSpacing: ".02em"
        }}
      >
        {value}
      </div>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 5,
          left: 55,
          color: c.accent,
          fontSize: 18
        }}
      >
        &#10022;
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 5,
          right: 55,
          color: c.accent,
          fontSize: 18
        }}
      >
        &#10022;
      </span>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 5,
          width: 190,
          height: 1,
          background: `linear-gradient(90deg,transparent,${c.accent},transparent)`
        }}
      />
    </div>
  );
}

function LiveGamePage({ game, playerVoiceEnabled, onTogglePlayerVoice }) {
  const themeUI = getThemeUI(game.theme);
  const themedPageStyle = { ...pageStyle, ...themeUI.page };
  const themedCardStyle = { ...cardStyle, ...themeUI.card };
  const nextSectionStyle = (extra = {}) =>
    getThemedSectionStyle(themeUI, extra);
  const themedInputStyle = { ...inputStyle, ...themeUI.input };
  const themedPrimaryButton = { ...primaryButton, ...themeUI.primary };
  const themedSecondaryButton = { ...secondaryButton, ...themeUI.secondary };
  const [calledNumbers, setCalledNumbers] = useState(
    Array.isArray(game.called_numbers) ? game.called_numbers : []
  );
  const [showCalledNumberBoard, setShowCalledNumberBoard] = useState(true);
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

    const speakMessage = (message) => {
      if (!("speechSynthesis" in window)) {
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(message);

        const presetId = loadVoicePreset(liveGame.id);
        const voices = getAvailableSpeechVoices();
        applySpeechVoice(utterance, presetId, voices);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Could not announce game end:", err);
      }
    };

    if (!finalAnnouncementSpokenRef.current) {
      finalAnnouncementSpokenRef.current = true;

      finalSummaryTimerRef.current = window.setTimeout(() => {
        if (!("speechSynthesis" in window)) {
          speakMessage(
            "All prizes have been claimed! No prizes remaining."
          );

          finalSummaryTimerRef.current = window.setTimeout(() => {
            speakMessage(
              "And that's the game! Thank you everyone for joining us, and we hope you enjoyed the game. See you in the next game!"
            );

            finalSummaryTimerRef.current = window.setTimeout(() => {
              setViewFinishedLive(false);
              setShowFinalResults(true);
              finalSummaryTimerRef.current = null;
            }, 3000);
          }, 2000);

          return;
        }

        try {
          window.speechSynthesis.cancel();

          const voices = getAvailableSpeechVoices();

          const first = new SpeechSynthesisUtterance(
            "All prizes have been claimed! No prizes remaining."
          );

          const presetId = loadVoicePreset(liveGame.id);
          applySpeechVoice(first, presetId, voices);

          const speakClosing = () => {
            const closing = new SpeechSynthesisUtterance(
              "And that's the game! Thank you everyone for joining us, and we hope you enjoyed the game. See you in the next game!"
            );

            applySpeechVoice(closing, presetId, voices);

            const showSummary = () => {
              finalSummaryTimerRef.current = window.setTimeout(() => {
                setViewFinishedLive(false);
                setShowFinalResults(true);
                finalSummaryTimerRef.current = null;
              }, 3000);
            };

            closing.onend = showSummary;
            closing.onerror = showSummary;
            window.speechSynthesis.speak(closing);
          };

          const pauseThenClose = () => {
            finalSummaryTimerRef.current = window.setTimeout(
              speakClosing,
              2000
            );
          };

          first.onend = pauseThenClose;
          first.onerror = pauseThenClose;
          window.speechSynthesis.speak(first);
        } catch (err) {
          console.error("Could not announce game end:", err);
          finalSummaryTimerRef.current = window.setTimeout(() => {
            setViewFinishedLive(false);
            setShowFinalResults(true);
            finalSummaryTimerRef.current = null;
          }, 3000);
        }
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
      <main className={`tl-theme-page tl-theme-${liveGame.theme.toLowerCase()}`} style={themedPageStyle}>
        <ThemeHero
          theme={liveGame.theme}
          title="Game complete"
          subtitle="The final results keep the same theme as the live event."
          compact
        />
        <div style={{ maxWidth: 800, margin: "40px auto" }}>
          <section style={{ ...themedCardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 44 }} aria-hidden="true">&#127942;</div>
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
                    background: "var(--theme-prize-bg)",
                    color: "var(--theme-accent)",
                    border: "var(--theme-panel-border)",
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
                          border: "var(--theme-panel-border, 1px solid #e2e8f0)"
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>
                          {prize.name || `Prize ${prizeIndex + 1}`}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            color: prize.locked ? "var(--theme-accent)" : "var(--theme-muted, #64748b)",
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

          <section className="tl-theme-section" style={nextSectionStyle()}>
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
                      background: prize.locked
                        ? `linear-gradient(135deg, ${themeUI.colors.secondary}24, ${themeUI.colors.surface2})`
                        : themeUI.colors.surface2,
                      color: themeUI.colors.text,
                      border: `1px solid ${prize.locked ? themeUI.colors.accent : themeUI.colors.secondary}66`
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

          <section className="tl-theme-section" style={nextSectionStyle()}>
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
                        padding: 13,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${themeUI.colors.surface2}, ${themeUI.colors.background})`,
                        border: `1px solid ${themeUI.colors.accent}88`,
                        color: themeUI.colors.text,
                        boxShadow: `0 0 18px ${themeUI.colors.secondary}18`
                      }}
                    >
                      <b style={{ color: themeUI.colors.text }}>{winner.prizeName}</b>
                      <div
                        style={{
                          marginTop: 5,
                          color: themeUI.colors.text,
                          fontWeight: 700
                        }}
                      >
                        {winner.playerName || "Player"} - Ticket #{winner.ticketNumber}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          color: themeUI.colors.accent,
                          fontWeight: 900
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
    <main className={`tl-theme-page tl-theme-${liveGame.theme.toLowerCase()}`} style={themedPageStyle}>
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
              background: "var(--theme-status-live)",
              color: "#ffffff",
              fontWeight: "bold"
            }}
          >
            LIVE GAME
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

        {/* 1. CURRENT NUMBER - THEME-SPECIFIC DISPLAY */}
        <section data-live-section="1-current-number" style={{ ...themedCardStyle, textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <h2 style={{ margin: 0 }}>Current Number</h2>
            <button
              type="button"
              onClick={onTogglePlayerVoice}
              aria-label={playerVoiceEnabled ? "Mute voice announcements" : "Turn on voice announcements"}
              title={playerVoiceEnabled ? "Mute voice announcements" : "Turn on voice announcements"}
              style={{
                width: 30,
                height: 30,
                padding: 0,
                borderRadius: "50%",
                border: `1px solid ${themeUI.colors.accent}88`,
                background: playerVoiceEnabled
                  ? `${themeUI.colors.secondary}22`
                  : `${themeUI.colors.surface2}`,
                color: playerVoiceEnabled ? themeUI.colors.accent : themeUI.colors.muted,
                fontSize: 16,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              {playerVoiceEnabled ? <span aria-hidden="true">&#128266;</span> : <span aria-hidden="true">&#128263;</span>}
            </button>
          </div>

          <ThemeCurrentNumberVisual
            theme={liveGame.theme || "Classic"}
            number={lastCalled}
            themeUI={themeUI}
          />

          <div style={{ color: themeUI.colors.muted, fontWeight: "bold" }}>
            Total Called: {calledNumbers.length}/90
          </div>
        </section>

        {/* 2. CALLED NUMBER BOARD */}
        <section
          data-live-section="2-called-number-board"
          style={{
            ...themedCardStyle,
            background: themeUI.colors.surface,
            color: themeUI.colors.text,
            border: `1px solid ${themeUI.colors.accent}66`
          }}
        >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <div style={{ color: "var(--theme-muted, #64748b)", fontWeight: "bold" }}>
                {calledNumbers.length}/90 called
              </div>
              <button
                type="button"
                onClick={() =>
                  setShowCalledNumberBoard((current) => !current)
                }
                aria-expanded={showCalledNumberBoard}
                style={{
                  ...themedSecondaryButton,
                  minHeight: 42,
                  whiteSpace: "nowrap"
                }}
              >
                {showCalledNumberBoard ? "COLLAPSE BOARD" : "EXPAND BOARD"}
              </button>
            </div>
          </div>

          {showCalledNumberBoard && (
            <>
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
                      ? `2px solid ${themeUI.colors.accent}`
                      : `1px solid ${themeUI.colors.secondary}66`,
                    background: isCalled
                      ? `linear-gradient(145deg, ${themeUI.colors.secondary}, ${themeUI.colors.background})`
                      : themeUI.colors.surface2,
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: 16,
                    boxShadow: isLast
                      ? `0 0 0 3px ${themeUI.colors.accent}, 0 0 22px ${themeUI.colors.secondary}66`
                      : `0 0 0 1px ${themeUI.colors.secondary}18 inset`,
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
                  gap: 18,
                  flexWrap: "wrap",
                  marginTop: 16,
                  color: themeUI.colors.muted,
                  fontSize: 13,
                  fontWeight: 800
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: themeUI.colors.secondary,
                      border: `1px solid ${themeUI.colors.accent}`,
                      display: "inline-block"
                    }}
                  />
                  Called
                </span>

                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: themeUI.colors.secondary,
                      border: `3px solid ${themeUI.colors.accent}`,
                      display: "inline-block"
                    }}
                  />
                  Last called
                </span>
              </div>
            </>
          )}
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
                      ? `2px solid ${themeUI.colors.accent}`
                      : `1px solid ${themeUI.colors.secondary}55`,
                    background: index === 0
                      ? `${themeUI.colors.secondary}25`
                      : "var(--theme-surface2, #111827)",
                    color: "var(--theme-panel-text, #f8fafc)",
                    textAlign: "center",
                    boxShadow: index === 0
                      ? `0 0 18px ${themeUI.colors.secondary}30`
                      : "none"
                  }}
                >
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: "bold",
                      color: index === 0
                        ? themeUI.colors.accent
                        : "var(--theme-panel-text, #f8fafc)"
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
            <p style={{ color: "var(--theme-muted, #94a3b8)", lineHeight: 1.5 }}>
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
        <div data-live-section="5-prizes"><LivePrizeList game={liveGame} theme={liveGame.theme} /></div>

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
              Search / Clear
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
                background: `${themeUI.colors.secondary}20`,
                color: themeUI.colors.accent,
                border: `1px solid ${themeUI.colors.secondary}55`,
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
                background: "var(--theme-surface2, #111827)",
                border: "1px solid var(--theme-accent, #60a5fa)66",
                color: "var(--theme-panel-text, #f8fafc)"
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
                  color: "var(--theme-accent, #60a5fa)",
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

function LivePrizeList({ game, theme = "Classic" }) {
  const prizes = Array.isArray(game?.selected_prizes)
    ? game.selected_prizes
    : [];
  const themeUI = getThemeUI(theme);
  const c = themeUI.colors;

  return (
    <section
      style={{
        ...cardStyle,
        ...themeUI.card,
        background: themeUI.visual.cardBackground,
        color: c.text,
        border: `1px solid ${c.accent}66`,
        marginBottom: 18
      }}
    >
      <h2 style={{ marginTop: 0 }}>Prizes & Winners</h2>

      {prizes.length === 0 ? (
        <p style={{ color: c.muted }}>
          No prizes have been configured for this game.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {prizes.map((prize, index) => {
            const winners = Array.isArray(prize?.winners)
              ? prize.winners
              : [];
            const locked = Boolean(prize?.locked);

            return (
              <div
                key={`${prize?.name || "prize"}-${index}`}
                style={{
                  padding: 14,
                  borderRadius: "var(--theme-button-radius, 10px)",
                  background: locked
                    ? `linear-gradient(135deg, ${c.secondary}35, ${c.surface2}), ${themeUI.visual.prizeBackground}`
                    : themeUI.visual.prizeBackground,
                  border: `1px solid ${locked ? c.accent : c.secondary}88`,
                  color: c.text,
                  boxShadow: locked
                    ? `0 0 22px ${c.secondary}30`
                    : `0 8px 20px rgba(0,0,0,.20)`
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
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      {prize?.name || `Prize ${index + 1}`}
                    </div>

                    {prize?.description && (
                      <div
                        style={{
                          color: c.muted,
                          fontSize: 13,
                          marginTop: 4,
                          lineHeight: 1.4
                        }}
                      >
                        {prize.description}
                      </div>
                    )}

                    <div
                      style={{
                        color: c.accent,
                        fontWeight: 900,
                        marginTop: 5
                      }}
                    >
                      INR {Number(prize?.amount || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "7px 11px",
                      borderRadius: 999,
                      background: locked
                        ? `linear-gradient(135deg, ${c.secondary}, ${c.background})`
                        : `${c.secondary}20`,
                      color: locked ? "#fff" : c.secondary,
                      border: `1px solid ${locked ? c.accent : c.secondary}88`,
                      fontWeight: 900,
                      fontSize: 12,
                      letterSpacing: ".03em",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {locked ? "WON" : "OPEN"}
                  </div>
                </div>

                {locked && winners.length > 0 ? (
                  <div style={{ marginTop: 11, display: "grid", gap: 7 }}>
                    {winners.map((winner, winnerIndex) => (
                      <div
                        key={`${winner?.bookingId || winnerIndex}-${winner?.ticketNumber || "ticket"}`}
                        style={{
                          padding: "10px 11px",
                          borderRadius: "var(--theme-input-radius, 8px)",
                          background: `${c.secondary}16`,
                          border: `1px solid ${c.accent}55`,
                          color: c.text
                        }}
                      >
                        <b>{winner?.playerName || "Player"}</b>
                        <span style={{ color: c.muted }}>
                          {" "} - Ticket #{winner?.ticketNumber || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 10,
                      color: c.muted,
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    Waiting for a winner
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
  const nextSectionStyle = (extra = {}) =>
    getThemedSectionStyle(themeUI, extra);
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
    expandedBookingIds,
    setExpandedBookingIds
  ] = useState(() => new Set());

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
    voicePreset,
    setVoicePreset
  ] = useState(() => loadVoicePreset(game.id));

  const [
    speechVoices,
    setSpeechVoices
  ] = useState(() => getAvailableSpeechVoices());

  useEffect(() => {
    const refreshVoices = () => setSpeechVoices(getAvailableSpeechVoices());
    refreshVoices();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
      }
    };
  }, []);

  useEffect(() => {
    setVoicePreset(loadVoicePreset(game.id));
  }, [game.id]);

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
      // Initialise the prize draft when opening a different game.
      // Do NOT reset it whenever the parent recreates game.selected_prizes;
      // doing that makes an amount disappear as soon as the host moves
      // to another prize input.
      setEditablePrizes(
        Array.isArray(game.selected_prizes)
          ? game.selected_prizes.map((prize) => ({ ...prize }))
          : []
      );
    },
    [game.id]
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

  const totalTicketLimit = Math.max(
    0,
    Number(
      game.ticket_limit ??
      game.total_tickets ??
      game.ticket_count ??
      0
    ) || 0
  );

  const ticketsSold = accepted.reduce(
    (total, booking) =>
      total +
      (
        Array.isArray(booking.ticket_numbers)
          ? booking.ticket_numbers.length
          : Number(booking.ticket_count) || 0
      ),
    0
  );

  const ticketsRemaining = Math.max(
    0,
    totalTicketLimit - ticketsSold
  );

  /*
   * Total amount generated from actual approved ticket sales.
   *
   * Each accepted booking is priced using the same package-pricing rules
   * used when the player selects tickets (single / half-sheet / full-sheet).
   * Cancelled/rejected and pending bookings generate no sales amount.
   */
  const totalSalesAmount = accepted.reduce(
    (total, booking) => {
      const ticketCount = Array.isArray(
        booking.ticket_numbers
      )
        ? booking.ticket_numbers.length
        : Number(booking.ticket_count) || 0;

      return (
        total +
        calculateTicketPackagePrice(
          ticketCount,
          game.ticket_price
        ).total
      );
    },
    0
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
      /*
       * Ticket approval must be checked against the CURRENT database state.
       *
       * Players can submit overlapping pending requests (for example:
       * Player 1 -> #1,#2,#3
       * Player 2 -> #4,#5,#1
       *
       * The old code changed the booking status directly, which meant the
       * second approval could also mark #1 as accepted. Before accepting a
       * booking, we now re-read the booking and every other accepted booking
       * for this game and refuse the approval if any ticket is already owned.
       */
      if (status === "accepted") {
        const {
          data: currentBooking,
          error: currentBookingError
        } = await supabase
          .from("ticket_bookings")
          .select(
            "id, game_id, player_name, ticket_numbers, status"
          )
          .eq(
            "id",
            bookingId
          )
          .maybeSingle();

        if (currentBookingError) {
          throw currentBookingError;
        }

        if (!currentBooking) {
          throw new Error("Booking could not be found.");
        }

        if (
          String(currentBooking.status || "").toLowerCase() !==
          "pending"
        ) {
          await loadBookings();
          return;
        }

        const requestedTickets = [
          ...new Set(
            (
              Array.isArray(currentBooking.ticket_numbers)
                ? currentBooking.ticket_numbers
                : []
            )
              .map((number) => Number(number))
              .filter(
                (number) =>
                  Number.isInteger(number) &&
                  number >= 1
              )
          )
        ];

        if (!requestedTickets.length) {
          throw new Error(
            "This booking does not contain any valid ticket numbers."
          );
        }

        const {
          data: acceptedBookings,
          error: acceptedBookingsError
        } = await supabase
          .from("ticket_bookings")
          .select(
            "id, player_name, ticket_numbers, status"
          )
          .eq(
            "game_id",
            currentBooking.game_id
          )
          .eq(
            "status",
            "accepted"
          );

        if (acceptedBookingsError) {
          throw acceptedBookingsError;
        }

        const acceptedTicketOwners = {};

        (
          acceptedBookings || []
        ).forEach((acceptedBooking) => {
          const numbers = Array.isArray(
            acceptedBooking.ticket_numbers
          )
            ? acceptedBooking.ticket_numbers
            : [];

          numbers.forEach((number) => {
            const n = Number(number);

            if (
              Number.isInteger(n) &&
              n >= 1
            ) {
              acceptedTicketOwners[n] = {
                bookingId: acceptedBooking.id,
                playerName:
                  acceptedBooking.player_name ||
                  "Another player"
              };
            }
          });
        });

        const conflictingTickets =
          requestedTickets.filter(
            (number) =>
              acceptedTicketOwners[number]
          );

        if (conflictingTickets.length) {
          const conflictText =
            conflictingTickets
              .map((number) => {
                const owner =
                  acceptedTicketOwners[number];

                return `#${number} (${owner.playerName})`;
              })
              .join(", ");

          alert(
            `Cannot approve this booking because ${conflictText} ${
              conflictingTickets.length === 1
                ? "is"
                : "are"
            } already booked by another player. The booking remains pending.`
          );

          await loadBookings();
          return;
        }

        /*
         * Only change a booking that is still pending. This prevents a stale
         * host screen from changing an already-processed booking.
         */
        const {
          data: updatedRows,
          error: updateError
        } = await supabase
          .from("ticket_bookings")
          .update({
            status: "accepted"
          })
          .eq(
            "id",
            bookingId
          )
          .eq(
            "status",
            "pending"
          )
          .select(
            "id, game_id, player_name, ticket_numbers, status"
          );

        if (updateError) {
          throw updateError;
        }

        if (
          !updatedRows ||
          !updatedRows.length
        ) {
          await loadBookings();
          return;
        }

        /*
         * Re-check immediately after approval. This protects against the
         * normal sequential case where another host action accepted one of
         * these tickets between our initial read and update.
         *
         * If an overlap is detected, the booking is returned to pending
         * rather than leaving duplicate ownership in the UI.
         */
        const {
          data: acceptedAfterUpdate,
          error: acceptedAfterUpdateError
        } = await supabase
          .from("ticket_bookings")
          .select(
            "id, player_name, ticket_numbers, status"
          )
          .eq(
            "game_id",
            currentBooking.game_id
          )
          .eq(
            "status",
            "accepted"
          );

        if (acceptedAfterUpdateError) {
          throw acceptedAfterUpdateError;
        }

        const ownersAfterUpdate = {};

        (
          acceptedAfterUpdate || []
        ).forEach((acceptedBooking) => {
          const numbers = Array.isArray(
            acceptedBooking.ticket_numbers
          )
            ? acceptedBooking.ticket_numbers
            : [];

          numbers.forEach((number) => {
            const n = Number(number);

            if (
              Number.isInteger(n) &&
              n >= 1
            ) {
              if (
                !ownersAfterUpdate[n] ||
                String(acceptedBooking.id) <
                  String(ownersAfterUpdate[n].bookingId)
              ) {
                ownersAfterUpdate[n] = {
                  bookingId: acceptedBooking.id,
                  playerName:
                    acceptedBooking.player_name ||
                    "Player"
                };
              }
            }
          });
        });

        const postUpdateConflicts =
          requestedTickets.filter(
            (number) =>
              ownersAfterUpdate[number] &&
              String(
                ownersAfterUpdate[number].bookingId
              ) !== String(bookingId)
          );

        if (postUpdateConflicts.length) {
          await supabase
            .from("ticket_bookings")
            .update({
              status: "pending"
            })
            .eq(
              "id",
              bookingId
            )
            .eq(
              "status",
              "accepted"
            );

          alert(
            `This booking could not be approved because ${
              postUpdateConflicts.length === 1
                ? "a requested ticket"
                : "requested tickets"
            } ${
              postUpdateConflicts
                .map((number) => `#${number}`)
                .join(", ")
            } ${
              postUpdateConflicts.length === 1
                ? "is"
                : "are"
            } already owned by another approved booking. The booking remains pending.`
          );
        }

        await loadBookings();
        return;
      }

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
          )
          .eq(
            "status",
            "pending"
          );

      if (error) {
        throw error;
      }

      await loadBookings();
    } catch (err) {
      console.error(
        "Could not update booking:",
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


  async function cancelAcceptedBooking(bookingId) {
    const confirmed = window.confirm(
      "Cancel this approved ticket? The ticket will become available for players to book again."
    );

    if (!confirmed) {
      return;
    }

    setActionId(bookingId);

    try {
      const {
        data: currentBooking,
        error: currentBookingError
      } = await supabase
        .from("ticket_bookings")
        .select(
          "id, game_id, player_name, ticket_numbers, status"
        )
        .eq(
          "id",
          bookingId
        )
        .maybeSingle();

      if (currentBookingError) {
        throw currentBookingError;
      }

      if (!currentBooking) {
        await loadBookings();
        return;
      }

      /*
       * Only cancel a booking that is currently accepted.
       * The conditional status check prevents a stale host screen from
       * cancelling a booking that has already been processed elsewhere.
       *
       * The existing "rejected" status is used as the released/cancelled
       * state. Player availability only blocks pending and accepted rows,
       * so these ticket numbers immediately become bookable again.
       */
      const {
        data: updatedRows,
        error: updateError
      } = await supabase
        .from("ticket_bookings")
        .update({
          status: "rejected"
        })
        .eq(
          "id",
          bookingId
        )
        .eq(
          "status",
          "accepted"
        )
        .select(
          "id, game_id, player_name, ticket_numbers, status"
        );

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows || !updatedRows.length) {
        await loadBookings();
        return;
      }

      await loadBookings();
    } catch (err) {
      console.error(
        "Could not cancel approved booking:",
        err
      );

      alert(
        err?.message ||
        "Could not cancel the approved ticket."
      );
    } finally {
      setActionId(null);
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

      const totalPrizePool = updatedPrizes.reduce(
        (total, prize) =>
          total + (Number(prize.amount) || 0),
        0
      );

      if (totalPrizePool > totalSalesAmount) {
        setGameError(
          `Total prize amount (INR ${totalPrizePool.toLocaleString("en-IN")}) cannot be more than total ticket sales (INR ${totalSalesAmount.toLocaleString("en-IN")}).`
        );
        setSavingPrizes(false);
        return false;
      }

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
      setShareMessage(
        "Prize amounts saved. These amounts are now the winner prizes. The Prize Amount Poster is ready to generate."
      );
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

  async function generateAndSharePoster(
    sourceGame,
    showPrizeAmounts,
    successMessage,
    savedMessage
  ) {
    if (posterCreating) {
      return;
    }

    setPosterCreating(true);
    setShareMessage("");

    try {
      const posterGame = {
        ...sourceGame,
        selected_prizes: Array.isArray(sourceGame.selected_prizes)
          ? sourceGame.selected_prizes.map((prize) => ({ ...prize }))
          : []
      };

      const poster = await createGamePoster(
        posterGame,
        { showPrizeAmounts }
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

        setShareMessage(successMessage);
        return;
      }

      try {
        const posterUrl =
          URL.createObjectURL(poster);
        const downloadLink =
          document.createElement("a");

        downloadLink.href = posterUrl;
        downloadLink.download = poster.name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        window.setTimeout(
          () => URL.revokeObjectURL(posterUrl),
          1000
        );

        setShareMessage(savedMessage);
      } catch (downloadError) {
        console.error(
          "Could not prepare poster download:",
          downloadError
        );

        setShareMessage(
          "Could not share or save the poster."
        );
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error(
        "Could not create/share poster:",
        error
      );

      setShareMessage(
        "The poster could not be created or shared. Please try again."
      );
    } finally {
      setPosterCreating(false);
    }
  }

  // First poster: always shows the selected prize names only.
  // It deliberately does not display any prize amounts.
  async function shareGame() {
    if (posterCreating || savingPrizes) {
      return;
    }

    await generateAndSharePoster(
      savedPrizeGame || game,
      false,
      "Prize-list poster ready to share. Prize amounts are not shown.",
      "Prize-list poster saved. Share the poster file in WhatsApp."
    );
  }

  // Second poster: available only after the host successfully saves the
  // prize amounts. The saved amounts are the actual winner prize values.
  async function sharePrizeAmountPoster() {
    if (
      posterCreating ||
      savingPrizes ||
      !savedPrizeGame
    ) {
      return;
    }

    await generateAndSharePoster(
      savedPrizeGame,
      true,
      "Prize-amount poster ready to share. These amounts are the winner prizes.",
      "Prize-amount poster saved. Share the poster file in WhatsApp."
    );
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
      applySpeechVoice(utterance, voicePreset, speechVoices);

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
      speakWinnerAnnouncement(events, voicePreset, speechVoices);
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
      className={`tl-theme-page tl-theme-${game.theme.toLowerCase()}`}
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
            ...themedCardStyle,
            border:
              isLive
                ? `2px solid ${themeUI.colors.secondary}`
                : isEnded
                ? `2px solid ${themeUI.colors.accent}88`
                : `2px solid ${themeUI.colors.accent}`
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
                  ? "var(--theme-status-live)"
                  : isEnded
                  ? "var(--theme-status-ended)"
                  : "var(--theme-status-upcoming)",
              color: "#ffffff",
              fontWeight:
                "bold",
              fontSize:
                18
            }}
          >
            {isLive
              ? "GAME LIVE"
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

        <section className="tl-theme-section"
          style={
            nextSectionStyle()
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
          data-host-section="prize-amounts"
          style={nextSectionStyle({
            display: "block",
            visibility: "visible",
            minHeight: 220,
            position: "relative",
            zIndex: 2
          })}
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
            Ticket sales are shown below. Enter the prize amounts according to the money generated from approved ticket sales. The total prize pool cannot exceed ticket sales.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 10,
              marginBottom: 14
            }}
          >
            <InfoBox
              title="Total Ticket Sales"
              value={`INR ${totalSalesAmount.toLocaleString("en-IN")}`}
            />

            <InfoBox
              title="Prize Pool Entered"
              value={`INR ${editablePrizes.reduce((total, prize) => total + (Number(prize.amount) || 0), 0).toLocaleString("en-IN")}`}
            />
          </div>

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

        <section className="tl-theme-section"
          style={
            nextSectionStyle()
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
            The first poster shows the game details and the selected
            prize list only. Prize amounts are intentionally hidden.
            The game link is shown here separately for sharing.
          </p>

          <p
            style={{
              color: "#166534",
              fontWeight: "bold",
              marginTop: 0
            }}
          >
            After ticket sales are approved, enter the winner prize
            amounts above and save them. A second poster will then
            become available with the actual prize amounts.
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
                ? "Copied"
                : "Copy Link"}
            </button>

            <button
              type="button"
              onClick={shareGame}
              disabled={
                posterCreating ||
                savingPrizes
              }
              style={{
                ...themedPrimaryButton,
                opacity:
                  posterCreating ||
                  savingPrizes
                    ? 0.6
                    : 1
              }}
            >
              {posterCreating
                ? "CREATING POSTER..."
                : "GENERATE PRIZE LIST POSTER"}
            </button>

            {savedPrizeGame && (
              <button
                type="button"
                onClick={sharePrizeAmountPoster}
                disabled={
                  posterCreating ||
                  savingPrizes
                }
                style={{
                  ...themedPrimaryButton,
                  opacity:
                    posterCreating ||
                    savingPrizes
                      ? 0.6
                      : 1
                }}
              >
                {posterCreating
                  ? "CREATING POSTER..."
                  : "GENERATE PRIZE AMOUNT POSTER"}
              </button>
            )}
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
          className="tl-theme-section"
          style={
            nextSectionStyle()
          }
        >
          <h2>
            Ticket Sales
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: 10
            }}
          >
            <StatusBox
              title="Tickets Sold"
              value={ticketsSold}
            />

            <StatusBox
              title="Tickets Remaining"
              value={
                totalTicketLimit > 0
                  ? ticketsRemaining
                  : "â€”"
              }
            />

            <StatusBox
              title="Total Tickets"
              value={
                totalTicketLimit > 0
                  ? totalTicketLimit
                  : "â€”"
              }
            />

            <StatusBox
              title="Amount Generated"
              value={`INR ${totalSalesAmount.toLocaleString("en-IN")}`}
            />
          </div>

          {totalTicketLimit > 0 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color:
                  "var(--theme-panel-muted, #64748b)"
              }}
            >
              {ticketsSold} of {totalTicketLimit} tickets sold
            </div>
          )}
        </section>

        <section className="tl-theme-section"
          style={
            nextSectionStyle()
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

        <section className="tl-theme-section"
          style={
            nextSectionStyle()
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
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap"
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <InfoBox
                              title="Player Name"
                              value={
                                booking.player_name ||
                                "-"
                              }
                            />
                          </div>

                          <button
                            type="button"
                            aria-expanded={expandedBookingIds.has(
                              String(booking.id)
                            )}
                            onClick={() => {
                              setExpandedBookingIds(
                                (previous) => {
                                  const next = new Set(previous);
                                  const key = String(booking.id);

                                  if (next.has(key)) {
                                    next.delete(key);
                                  } else {
                                    next.add(key);
                                  }

                                  return next;
                                }
                              );
                            }}
                            style={{
                              ...themedSecondaryButton,
                              minHeight: 42,
                              padding: "8px 14px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {expandedBookingIds.has(
                              String(booking.id)
                            )
                              ? "SHOW LESS"
                              : "SHOW MORE"}
                          </button>
                        </div>

                        {expandedBookingIds.has(
                          String(booking.id)
                        ) && (
                          <>
                            <InfoBox
                              title="Ticket Numbers"
                              value={(() => {
                                const ticketList =
                                  Array.isArray(
                                    booking.ticket_numbers
                                  )
                                    ? booking.ticket_numbers.map(Number).filter(
                                        (number) => Number.isFinite(number)
                                      )
                                    : [];

                                return ticketList.length
                                  ? ticketList.join(", ")
                                  : "-";
                              })()}
                            />

                            <InfoBox
                              title="Ticket Count"
                              value={
                                Array.isArray(
                                  booking.ticket_numbers
                                )
                                  ? booking.ticket_numbers.length
                                  : 0
                              }
                            />

                            <InfoBox
                              title="Status"
                              value={status.toUpperCase()}
                            />
                          </>
                        )}
                      </div>

                      {expandedBookingIds.has(
                        String(booking.id)
                      ) &&
                        status ===
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
                            APPROVE
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
                            REJECT
                          </button>
                        </div>
                      )}

                      {expandedBookingIds.has(
                        String(booking.id)
                      ) &&
                        status ===
                          "accepted" && (
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
                            type="button"
                            disabled={
                              actionId ===
                              booking.id
                            }
                            onClick={() =>
                              cancelAcceptedBooking(
                                booking.id
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
                            {actionId ===
                            booking.id
                              ? "CANCELLING..."
                              : "CANCEL TICKET"}
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
          style={nextSectionStyle({
            border:
              isLive
                ? "2px solid #22c55e"
                : "1px solid #e5e7eb"
          })}
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
                ? "GAME IS LIVE"
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
            style={nextSectionStyle({
              border:
                "2px solid #22c55e"
            })}
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
                {autoCall ? "STOP AUTO CALL" : "AUTO CALL"}
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
                {autoCallPaused ? "RESUME AUTO CALL" : "PAUSE AUTO CALL"}
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
                {callingNumber ? "CALLING..." : "CALL NEXT"}
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
                <span>Caller Style</span>
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
                  <option value="fun">English Rhyming</option>
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
                <span>Voice Over</span>
                <select
                  value={voicePreset}
                  onChange={(e) => {
                    const next = e.target.value;
                    setVoicePreset(next);
                    saveVoicePreset(game.id, next);
                  }}
                  disabled={callingNumber}
                  style={{
                    maxWidth: "58%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "var(--theme-panel-bg, #fff)",
                    color: "var(--theme-panel-text, #0f172a)",
                    fontWeight: "bold"
                  }}
                >
                  {VOICE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  try {
                    if (!("speechSynthesis" in window)) return;
                    window.speechSynthesis.cancel();
                    const preview = new SpeechSynthesisUtterance(
                      "Answer to life, number 42!"
                    );
                    applySpeechVoice(preview, voicePreset, speechVoices);
                    window.speechSynthesis.speak(preview);
                  } catch (err) {
                    console.error("Could not preview voice:", err);
                  }
                }}
                disabled={callingNumber || !("speechSynthesis" in window)}
                style={{
                  ...themedSecondaryButton,
                  width: "100%",
                  opacity: callingNumber ? 0.55 : 1
                }}
              >
                PREVIEW VOICE
              </button>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "var(--theme-muted-text, #64748b)"
                }}
              >
                Voice settings are saved for this game on the host device.
                The Deep Cinema Announcer gives a deep, authoritative Indian-cinema feel; it does not imitate a real person.
              </div>
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
                ? "AUTO CALL PAUSED"
                : autoCall
                ? `AUTO CALL ACTIVE - every ${callIntervalSeconds} seconds`
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
                WINNER ANNOUNCED - PRIZE AUTOMATICALLY LOCKED
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
                background: "var(--theme-panel-bg, #0f172a)",
                 color: "var(--theme-panel-text, #f8fafc)",
                 border: "1px solid var(--theme-accent, #60a5fa)55",
                 borderRadius: "var(--theme-card-radius, 18px)",
                 padding: "var(--theme-card-padding, 24px)",
                 boxShadow: "0 25px 70px rgba(0,0,0,0.45), 0 0 35px var(--theme-glow, #60a5fa)22",
                 backdropFilter: "blur(16px)",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: 54 }} aria-hidden="true">&#127942;</div>
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
                      background: themeUI.colors.surface2,
                      border: `2px solid ${themeUI.colors.accent}`
                    }}
                  >
                    <div
                      style={{
                        color: themeUI.colors.accent,
                        fontWeight: "bold",
                        fontSize: 20
                      }}
                    >
                      {event.prizeName} WON!
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
                            {winner.playerName} - Ticket #{winner.ticketNumber}
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
                WINNER POSTED - PRIZE LOCKED
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
          style={nextSectionStyle({
            marginTop: 16
          })}
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
        border: "var(--theme-panel-border, 1px solid #cbd5e1)",
        borderRadius: "var(--theme-input-radius, 14px)",
        background: "var(--theme-panel-bg, #f8fafc)",
        color: "var(--theme-panel-text, #0f172a)",
        boxShadow: "var(--theme-panel-shadow, 0 8px 20px rgba(0,0,0,.12) inset)"
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
          "var(--theme-panel-border, 1px solid #e5e7eb)",
        borderRadius:
          "var(--theme-button-radius, 10px)",
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

  const [
    playerVoiceEnabled,
    setPlayerVoiceEnabled
  ] = useState(false);

  function enablePlayerVoiceFromBooking() {
    if (playerVoiceEnabled) return;

    speakPlayerAnnouncementQueue([
      "Voice announcements enabled. Get ready for the next number."
    ]);
    setPlayerVoiceEnabled(true);
  }

  function togglePlayerVoice() {
    if (playerVoiceEnabled) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayerVoiceEnabled(false);
      return;
    }

    speakPlayerAnnouncementQueue(["Voice announcements on."]);
    setPlayerVoiceEnabled(true);
  }

  const playerAnnouncementStateRef = useRef({
    gameId: null,
    calledNumbers: [],
    winnerKeys: new Set()
  });

  const playerVoiceEnabledRef = useRef(false);
  const playerFinalAnnouncementRef = useRef({
    gameId: null,
    scheduled: false,
    timer: null
  });

  useEffect(() => {
    playerVoiceEnabledRef.current = playerVoiceEnabled;
  }, [playerVoiceEnabled]);

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
     PLAYER VOICE ANNOUNCEMENTS
     Speech must run on the player's own device. The host only
     publishes game state; each player speaks the new event locally.
  ------------------------------------------------------- */
  useEffect(() => {
    if (!playerCode || !playerGame?.id) {
      return undefined;
    }

    const currentCalledNumbers = Array.isArray(playerGame.called_numbers)
      ? playerGame.called_numbers
      : [];
    const currentWinnerKeys = getPlayerWinnerKeys(playerGame);
    const state = playerAnnouncementStateRef.current;

    // Establish a baseline without replaying old calls/winners when a player
    // first opens the live game or refreshes the page.
    if (state.gameId !== playerGame.id) {
      playerAnnouncementStateRef.current = {
        gameId: playerGame.id,
        calledNumbers: [...currentCalledNumbers],
        winnerKeys: currentWinnerKeys
      };
      return undefined;
    }

    const previousCalled = state.calledNumbers || [];
    const newNumbers = currentCalledNumbers.filter(
      (number) => !previousCalled.includes(number)
    );
    const newWinnerEvents = getNewPlayerWinnerEvents(
      playerGame,
      state.winnerKeys || new Set()
    );

    playerAnnouncementStateRef.current = {
      gameId: playerGame.id,
      calledNumbers: [...currentCalledNumbers],
      winnerKeys: currentWinnerKeys
    };

    if (!playerVoiceEnabled) {
      return undefined;
    }

    const announcementQueue = [];

    newNumbers.forEach((number) => {
      announcementQueue.push(getPlayerEnglishCallerPhrase(number));
    });

    getWinnerAnnouncementParts(newWinnerEvents).forEach((text) => {
      announcementQueue.push(text);
    });

    if (announcementQueue.length) {
      speakPlayerAnnouncementQueue(announcementQueue);
    }

    return undefined;
  }, [playerCode, playerGame, playerVoiceEnabled]);

  /* -------------------------------------------------------
     PLAYER FINAL GAME VOICE ANNOUNCEMENT
     When the host finishes the final prize, the game becomes
     "ended". Wait about 3 seconds, announce that all prizes
     are claimed, pause briefly, then give the closing message.
     This is spoken once per player and respects the player's
     voice on/off control.
  ------------------------------------------------------- */
  useEffect(() => {
    if (!playerCode || !playerGame?.id) {
      return undefined;
    }

    const state = playerFinalAnnouncementRef.current;

    if (state.gameId !== playerGame.id) {
      if (state.timer) {
        window.clearTimeout(state.timer);
      }

      playerFinalAnnouncementRef.current = {
        gameId: playerGame.id,
        scheduled: false,
        timer: null
      };
    }

    const currentState = playerFinalAnnouncementRef.current;

    if (playerGame.status !== "ended") {
      return undefined;
    }

    if (!playerVoiceEnabled) {
      if (currentState.timer) {
        window.clearTimeout(currentState.timer);
        currentState.timer = null;
        currentState.scheduled = false;
      }
      return undefined;
    }

    if (currentState.scheduled) {
      return undefined;
    }

    currentState.scheduled = true;

    currentState.timer = window.setTimeout(() => {
      currentState.timer = null;

      if (!playerVoiceEnabledRef.current || !("speechSynthesis" in window)) {
        currentState.scheduled = false;
        return;
      }

      try {
        const voices = getAvailableSpeechVoices();
        window.speechSynthesis.cancel();

        const first = new SpeechSynthesisUtterance(
          "All prizes have been claimed! No prizes remaining."
        );
        applySpeechVoice(first, DEFAULT_VOICE_PRESET_ID, voices);

        const speakClosingMessage = () => {
          if (!playerVoiceEnabledRef.current) {
            return;
          }

          const closing = new SpeechSynthesisUtterance(
            "And that's the game! Thank you everyone for joining us, and we hope you enjoyed the game. See you in the next game!"
          );
          applySpeechVoice(closing, DEFAULT_VOICE_PRESET_ID, voices);
          window.speechSynthesis.speak(closing);
        };

        const pauseThenClose = () => {
          window.setTimeout(speakClosingMessage, 2000);
        };

        first.onend = pauseThenClose;
        first.onerror = pauseThenClose;
        window.speechSynthesis.speak(first);
      } catch (err) {
        console.error("Could not announce player game end:", err);
        currentState.scheduled = false;
      }
    }, 3000);

    return undefined;
  }, [playerCode, playerGame?.id, playerGame?.status, playerVoiceEnabled]);

  useEffect(() => {
    return () => {
      const state = playerFinalAnnouncementRef.current;
      if (state.timer) {
        window.clearTimeout(state.timer);
        state.timer = null;
      }
    };
  }, []);

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
          playerVoiceEnabled={playerVoiceEnabled}
          onTogglePlayerVoice={togglePlayerVoice}
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
          playerVoiceEnabled={playerVoiceEnabled}
          onTogglePlayerVoice={togglePlayerVoice}
        />
      );
    }

    return (
      <PlayerBookingPage
        game={
          playerGame
        }
        onVoiceEnable={enablePlayerVoiceFromBooking}
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

/* =========================================================
   FULL-SCREEN MOBILE BASE
   Removes the browser's default body gutter so the themed
   background reaches both edges of the viewport.
   Safe-area padding remains handled by pageStyle above.
========================================================= */
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  html,
  body,
  #root {
    margin: 0;
    padding: 0;
    width: 100%;
    min-width: 100%;
    min-height: 100%;
  }

  html {
    background: #000;
  }

  body {
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;
document.head.appendChild(globalStyle);

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