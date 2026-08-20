import React, {
  useEffect,
  useMemo,
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
      `₹${
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
          } — ₹${
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

function TicketGrid({
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
          ? "✓ Tap to unselect"
          : "Tap to select"}
      </div>
    </div>
  );
}

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
  ] = useState("");

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

    const bookingData = {
      game_id:
        game.id,
      player_name:
        name,
      ticket_numbers:
        sortedTickets,
      status:
        "pending"
    };

    try {
      const {
        data,
        error
      } =
        await supabase
          .from(
            "ticket_bookings"
          )
          .insert(
            bookingData
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      savePlayerBooking(
        game.id,
        {
          bookingId:
            data?.id ||
            null,
          playerName:
            name,
          ticketNumbers:
            sortedTickets
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
              value={`₹${
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
            All 3×9 Tambola Tickets
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
            position:
              "sticky",
            bottom: 10,
            zIndex:
              10
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
            onChange={(e) =>
              setPlayerName(
                e.target.value
              )
            }
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

function LiveGamePage({
  game
}) {
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
    liveGame,
    setLiveGame
  ] = useState(
    game
  );

  const [
    playerBooking,
    setPlayerBooking
  ] = useState(
    () =>
      getPlayerBooking(
        game.id
      )
  );

  useEffect(
    () => {
      setLiveGame(
        game
      );

      setCalledNumbers(
        Array.isArray(
          game.called_numbers
        )
          ? game.called_numbers
          : []
      );

      setPlayerBooking(
        getPlayerBooking(
          game.id
        )
      );
    },
    [
      game
    ]
  );

  useEffect(
    () => {
      async function refreshGame() {
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
          setLiveGame(
            data
          );

          setCalledNumbers(
            Array.isArray(
              data.called_numbers
            )
              ? data.called_numbers
              : []
          );
        }
      }

      refreshGame();

      const channel =
        supabase
          .channel(
            `live-game-${game.id}`
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
            (payload) => {
              const updated =
                payload.new;

              setLiveGame(
                updated
              );

              setCalledNumbers(
                Array.isArray(
                  updated.called_numbers
                )
                  ? updated.called_numbers
                  : []
              );
            }
          )
          .subscribe();

      const interval =
        setInterval(
          refreshGame,
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
    },
    [
      game.id
    ]
  );

  const tickets =
    playerBooking?.ticketNumbers ||
    [];

  const lastCalled =
    calledNumbers.length
      ? calledNumbers[
          calledNumbers.length -
            1
        ]
      : null;

  if (
    liveGame.status ===
    "ended"
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
              700,
            margin:
              "60px auto"
          }}
        >
          <section
            style={{
              ...cardStyle,
              textAlign:
                "center"
            }}
          >
            <h1>
              GAME ENDED
            </h1>

            <p
              style={{
                color:
                  "#64748b",
                fontSize:
                  18
              }}
            >
              Thank you for playing
              TambolaLive.
            </p>

            <div
              style={{
                marginTop:
                  20,
                padding:
                  20,
                borderRadius:
                  14,
                background:
                  "#f8fafc"
              }}
            >
              <b>
                Total Numbers Called
              </b>

              <div
                style={{
                  fontSize:
                    35,
                  fontWeight:
                    "bold",
                  marginTop:
                    8
                }}
              >
                {
                  calledNumbers.length
                }
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      style={
        pageStyle
      }
    >
      <div
        style={{
          maxWidth:
            1050,
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
              liveGame.game_name
            }
          </h1>

          <div
            style={{
              display:
                "inline-block",
              padding:
                "8px 18px",
              borderRadius:
                30,
              background:
                "#dcfce7",
              color:
                "#166534",
              fontWeight:
                "bold"
            }}
          >
            ● LIVE GAME
          </div>
        </div>

        <section
          style={{
            ...cardStyle,
            textAlign:
              "center"
          }}
        >
          <div
            style={{
              color:
                "#64748b",
              fontWeight:
                "bold"
            }}
          >
            LAST CALLED NUMBER
          </div>

          <div
            style={{
              width:
                150,
              height:
                150,
              margin:
                "15px auto",
              borderRadius:
                "50%",
              background:
                "#2563eb",
              color:
                "#fff",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontSize:
                58,
              fontWeight:
                "bold",
              boxShadow:
                "0 10px 30px rgba(37,99,235,.25)"
            }}
          >
            {
              lastCalled ||
              "—"
            }
          </div>

          <div
            style={{
              color:
                "#64748b"
            }}
          >
            Numbers called:
            {" "}
            {
              calledNumbers.length
            }
            / 90
          </div>
        </section>

        {playerBooking && (
          <section
            style={
              cardStyle
            }
          >
            <h2>
              Your Tickets
            </h2>

            <p
              style={{
                color:
                  "#64748b"
              }}
            >
              Player:
              {" "}
              <b>
                {
                  playerBooking.playerName
                }
              </b>
            </p>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(250px,1fr))",
                gap:
                  16
              }}
            >
              {tickets.map(
                (
                  ticketNumber
                ) => (
                  <TicketGrid
                    key={
                      ticketNumber
                    }
                    ticket={{
                      number:
                        ticketNumber,
                      grid:
                        makeTicket(
                          liveGame.game_code,
                          ticketNumber
                        )
                    }}
                    selected={
                      false
                    }
                    calledNumbers={
                      calledNumbers
                    }
                    onSelect={() => {}}
                  />
                )
              )}
            </div>
          </section>
        )}

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Called Numbers
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(10,minmax(0,1fr))",
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
                  <div
                    key={
                      number
                    }
                    style={{
                      padding:
                        "11px 4px",
                      textAlign:
                        "center",
                      borderRadius:
                        8,
                      border:
                        called
                          ? "2px solid #2563eb"
                          : "1px solid #e2e8f0",
                      background:
                        called
                          ? "#2563eb"
                          : "#fff",
                      color:
                        called
                          ? "#fff"
                          : "#64748b",
                      fontWeight:
                        "bold"
                    }}
                  >
                    {
                      number
                    }
                  </div>
                );
              }
            )}
          </div>
        </section>

        <div
          style={{
            textAlign:
              "center",
            color:
              "#64748b",
            padding:
              "10px 0 30px"
          }}
        >
          Stay on this page.
          The game board will
          update automatically
          when the host calls
          a number.
        </div>
      </div>
    </main>
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
      const {
        data,
        error
      } =
        await supabase
          .from("games")
          .update({
            status: "live"
          })
          .eq(
            "id",
            game.id
          )
          .select("*")
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (
        !data ||
        data.status !== "live"
      ) {
        throw new Error(
          "The game status could not be saved as LIVE. Please check the games table permissions in Supabase."
        );
      }

      saveHostGame(data);
      onGameUpdated(data);

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
`🎟️ ${game.game_name}

📅 ${game.game_date || "-"}
⏰ ${game.game_time || "-"}
🎫 Ticket Price: ₹${game.ticket_price || 0}

🎟️ Game Code: ${game.game_code}

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

  async function toggleCalledNumber(
    number
  ) {
    if (
      game.status !==
      "live"
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
              ? "● GAME LIVE"
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
              value={`₹${
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
                ? "✓ Copied"
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
                : "🎨 Share Game + Poster"}
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
                            ✓ APPROVE
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
                            ✕ REJECT
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
                ? "✓ GAME IS LIVE"
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
                  : "—"}
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

        <section
          style={
            cardStyle
          }
        >
          <h2>
            Prizes
          </h2>

          {prizes.length ===
          0 ? (
            <p>
              No prizes selected.
            </p>
          ) : (
            prizes.map(
              (
                prize,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    padding:
                      "12px 0",
                    borderBottom:
                      "1px solid #e5e7eb"
                  }}
                >
                  <b>
                    {
                      prize.name
                    }
                  </b>

                  <span>
                    ₹
                    {
                      prize.amount
                    }
                  </span>
                </div>
              )
            )
          )}
        </section>

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
                const incomingGame =
                  payload.new;

                // Never let a stale realtime event
                // move an already-live host game
                // backwards to "upcoming".
                if (
                  game?.status === "live" &&
                  incomingGame.status ===
                    "upcoming"
                ) {
                  return;
                }

                setGame(
                  incomingGame
                );

                saveHostGame(
                  incomingGame
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
              // Never overwrite a locally confirmed LIVE game
              // with an older/stale UPCOMING response.
              if (
                !(
                  game?.status === "live" &&
                  data.status ===
                    "upcoming"
                )
              ) {
                setGame(
                  data
                );

                saveHostGame(
                  data
                );
              }
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

      setPlayerGame(
        data ||
          null
      );
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
