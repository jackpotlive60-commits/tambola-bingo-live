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
      localStorage.removeItem(GAME_KEY);
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
      localStorage.getItem(GAME_KEY);

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

  /*
    Each row gets exactly 5 numbers.
    Every column gets at least 1 number.
  */

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

  /*
    Guaranteed fallback.
  */

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
  padding: "13px 18px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer"
};

const secondaryButton = {
  padding: "11px 16px",
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
  const [gameName, setGameName] =
    useState(DEFAULT_GAME_NAME);

  const [gameDate, setGameDate] =
    useState("");

  const [gameTime, setGameTime] =
    useState("");

  const [ticketLimit, setTicketLimit] =
    useState(100);

  const [ticketPrice, setTicketPrice] =
    useState(20);

  const [theme, setTheme] =
    useState("Classic");

  const [prizes, setPrizes] =
    useState(DEFAULT_PRIZES);

  const [customPrize, setCustomPrize] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

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

  function removePrize(index) {
    setPrizes(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );
  }

  async function createGame(e) {
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
            .from("games")
            .select("id")
            .eq(
              "game_code",
              code
            )
            .limit(1);

        if (error) {
          throw error;
        }

        if (!data?.length) {
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
          .map((p) => ({
            name: p.name,
            amount:
              Number(p.amount)
          }));

      const newGame = {
        host_name: "Host",

        game_name:
          gameName.trim() ||
          DEFAULT_GAME_NAME,

        status: "upcoming",

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
          Number(ticketPrice) || 0,

        call_interval_seconds: 5,

        game_date:
          gameDate || null,

        game_time:
          gameTime || null,

        theme,

        game_code: code,

        invite_enabled: true,

        selected_prizes:
          selectedPrizes,

        called_numbers: []
      };

      const {
        data,
        error
      } =
        await supabase
          .from("games")
          .insert(
            newGame
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      saveHostGame(data);

      onCreated(data);

    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Could not create game."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 25
          }}
        >
          <h1>
            TAMBOLA LIVE
          </h1>

          <p
            style={{
              color: "#64748b"
            }}
          >
            Host Create Game
          </p>
        </div>

        <form
          onSubmit={createGame}
        >
          <section
            style={cardStyle}
          >
            <h2>
              Create New Game
            </h2>

            <b>
              Game Name
            </b>

            <input
              value={gameName}
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
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(210px,1fr))",
                gap: 14,
                marginTop: 16
              }}
            >
              <div>
                <b>Date</b>

                <input
                  type="date"
                  required
                  value={gameDate}
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
                <b>Time</b>

                <input
                  type="time"
                  required
                  value={gameTime}
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
                  value={ticketLimit}
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
                  value={ticketPrice}
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
                marginTop: 16
              }}
            >
              <b>
                Game Theme
              </b>

              <select
                value={theme}
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
            style={cardStyle}
          >
            <h2>
              Prizes
            </h2>

            {prizes.map(
              (p, index) => (
                <div
                  key={`${p.name}-${index}`}
                  style={{
                    display: "grid",
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
                    {p.name}
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
                display: "flex",
                gap: 8,
                marginTop: 15
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
                {error}
              </p>
            </section>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
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
   ACTUAL 3 × 9 TICKET
========================================================= */

function TicketGrid({
  ticket,
  selected,
  onSelect
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        border:
          selected
            ? "4px solid #2563eb"
            : "2px solid #111827",
        borderRadius: 14,
        padding: 12,
        background:
          selected
            ? "#eff6ff"
            : "#fff",
        cursor: "pointer",
        boxShadow:
          selected
            ? "0 0 0 3px rgba(37,99,235,.12)"
            : "none",
        transition:
          "all .15s ease"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom: 10
        }}
      >
        <b
          style={{
            fontSize: 21
          }}
        >
          Ticket #{ticket.number}
        </b>

        <span
          style={{
            padding:
              "6px 10px",
            borderRadius: 8,
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
          display: "grid",
          gridTemplateColumns:
            "repeat(9, minmax(28px,1fr))",
          border:
            "2px solid #111827",
          overflow:
            "hidden",
          borderRadius: 8,
          background:
            "#fff"
        }}
      >
        {ticket.grid.flatMap(
          (row, r) =>
            row.map(
              (value, c) => (
                <div
                  key={`${r}-${c}`}
                  style={{
                    minHeight: 48,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRight:
                      c === 8
                        ? "none"
                        : "1px solid #94a3b8",
                    borderBottom:
                      r === 2
                        ? "none"
                        : "1px solid #94a3b8",
                    fontWeight:
                      value
                        ? "bold"
                        : "normal",
                    fontSize: 17,
                    background:
                      value
                        ? "#fff"
                        : "#f8fafc"
                  }}
                >
                  {value || ""}
                </div>
              )
            )
        )}
      </div>

      <div
        style={{
          marginTop: 9,
          textAlign: "center",
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
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(
        game.ticket_limit
      ) || 100
    )
  );

  const [selected, setSelected] =
    useState([]);

  const [playerName, setPlayerName] =
    useState("");

  const [booking, setBooking] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("info");

  const tickets = useMemo(() => {
    return Array.from(
      { length: limit },
      (_, i) => ({
        number: i + 1,
        grid: makeTicket(
          game.game_code,
          i + 1
        )
      })
    );
  }, [
    game.game_code,
    limit
  ]);

  function toggleTicket(
    number
  ) {
    setSelected(
      (current) => {
        if (
          current.includes(
            number
          )
        ) {
          return current.filter(
            (n) =>
              n !== number
          );
        }

        return [
          ...current,
          number
        ].sort(
          (a, b) => a - b
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
      setMessageType("error");

      setMessage(
        "Please enter your name."
      );

      return;
    }

    if (!selected.length) {
      setMessageType("error");

      setMessage(
        "Please select at least one ticket."
      );

      return;
    }

    setBooking(true);
    setMessage("");

    const sortedTickets =
      [...selected].sort(
        (a, b) => a - b
      );

    const bookingData = {
      game_id: game.id,
      player_name: name,
      ticket_numbers:
        sortedTickets,
      status: "pending"
    };

    try {
      const {
        error
      } =
        await supabase
          .from(
            "ticket_bookings"
          )
          .insert(
            bookingData
          );

      if (error) {
        throw error;
      }

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

    } catch (err) {
      console.error(err);

      setMessageType(
        "error"
      );

      setMessage(
        err?.message ||
          "Could not submit booking."
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 950,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>
            {game.game_name}
          </h1>

          <p
            style={{
              color:
                "#64748b",
              fontSize: 17
            }}
          >
            Player Ticket Booking
          </p>
        </div>

        <section
          style={cardStyle}
        >
          <h2>
            Game Details
          </h2>

          <div
            style={{
              display: "grid",
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
          style={cardStyle}
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
            Select one or more
            tickets. You can select
            multiple tickets before
            booking.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(5, minmax(0,1fr))",
              gap: 10
            }}
          >
            {tickets.map(
              (ticket) => {
                const active =
                  selected.includes(
                    ticket.number
                  );

                return (
                  <button
                    key={
                      ticket.number
                    }
                    type="button"
                    onClick={() =>
                      toggleTicket(
                        ticket.number
                      )
                    }
                    style={{
                      minHeight: 55,
                      border:
                        active
                          ? "3px solid #2563eb"
                          : "1px solid #cbd5e1",
                      borderRadius:
                        11,
                      background:
                        active
                          ? "#2563eb"
                          : "#fff",
                      color:
                        active
                          ? "#fff"
                          : "#111827",
                      fontWeight:
                        "bold",
                      fontSize: 17,
                      cursor:
                        "pointer"
                    }}
                  >
                    #{ticket.number}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 15,
              borderRadius: 11,
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0"
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
                gap: 10,
                flexWrap:
                  "wrap"
              }}
            >
              <div>
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
                    padding:
                      "7px 11px"
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                color:
                  "#2563eb",
                fontWeight:
                  "bold"
              }}
            >
              {selected.length} ticket
              {selected.length ===
              1
                ? ""
                : "s"} selected
            </div>
          </div>
        </section>

        <section
          style={cardStyle}
        >
          <h2>
            All 3×9 Tambola Tickets
          </h2>

          <p
            style={{
              color:
                "#64748b"
            }}
          >
            All tickets are shown
            below. Tap any ticket to
            select or unselect it.
          </p>

          <div
            style={{
              display: "grid",
              gap: 18
            }}
          >
            {tickets.map(
              (ticket) => (
                <TicketGrid
                  key={
                    ticket.number
                  }
                  ticket={
                    ticket
                  }
                  selected={selected.includes(
                    ticket.number
                  )}
                  onSelect={() =>
                    toggleTicket(
                      ticket.number
                    )
                  }
                />
              )
            )}
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            position:
              "sticky",
            bottom: 10,
            zIndex: 10
          }}
        >
          <h2>
            Booking Details
          </h2>

          <label>
            <b>
              Player Name
            </b>
          </label>

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
              marginTop: 8
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
              width: "100%",
              marginTop: 14,
              fontSize: 18,
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
                "#64748b",
              marginBottom:
                0
            }}
          >
            Your booking will
            remain pending until
            the host approves it.
          </p>

          {message && (
            <div
              style={{
                marginTop: 14,
                padding: 13,
                borderRadius: 10,
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
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   HOST CONTROL CENTRE
========================================================= */

function HostControlPage({
  game,
  onNewGame
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
  ] = useState(true);

  const [
    actionId,
    setActionId
  ] = useState(null);

  const [
    copied,
    setCopied
  ] = useState(false);

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

  async function loadBookings() {
    setLoadingBookings(true);

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
              ascending: false
            }
          );

      if (error) {
        throw error;
      }

      setBookings(
        data || []
      );
    } catch (err) {
      console.error(err);

      setBookings([]);
    } finally {
      setLoadingBookings(
        false
      );
    }
  }

  useEffect(() => {
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
            schema: "public",
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
  }, [game.id]);

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
      console.error(err);

      alert(
        err?.message ||
          "Could not update booking."
      );
    } finally {
      setActionId(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setCopied(true);

      setTimeout(
        () =>
          setCopied(false),
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
    const message =
`🎟️ ${game.game_name}

📅 ${game.game_date || "-"}
⏰ ${game.game_time || "-"}
🎫 Ticket Price: ₹${game.ticket_price || 0}

Join Game:
${inviteUrl}`;

    if (
      navigator.share
    ) {
      try {
        await navigator.share(
          {
            title:
              game.game_name,
            text:
              message,
            url:
              inviteUrl
          }
        );
      } catch {}
    } else {
      await copyLink();
    }
  }

  async function toggleCalledNumber(
    number
  ) {
    const exists =
      calledNumbers.includes(
        number
      );

    const next =
      exists
        ? calledNumbers.filter(
            (n) =>
              n !== number
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

    saveHostGame({
      ...game,
      called_numbers:
        next
    });

    try {
      const {
        error
      } =
        await supabase
          .from("games")
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
      console.error(err);
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

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            marginBottom: 20
          }}
        >
          <h1>
            {game.game_name}
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
          style={cardStyle}
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

          <div
            style={{
              marginTop: 15,
              padding: 14,
              borderRadius: 10,
              background:
                "#fff7ed",
              border:
                "1px solid #f59e0b"
            }}
          >
            <b>
              Game Status
            </b>

            <div
              style={{
                marginTop: 5,
                fontSize: 20,
                fontWeight:
                  "bold"
              }}
            >
              {String(
                game.status ||
                  "upcoming"
              ).toUpperCase()}
            </div>
          </div>
        </section>

        <section
          style={cardStyle}
        >
          <h2>
            Share Game
          </h2>

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
              style={
                primaryButton
              }
            >
              Share Game
            </button>
          </div>
        </section>

        <section
          style={cardStyle}
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
          style={cardStyle}
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
                padding: 20,
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
                gap: 12
              }}
            >
              {bookings.map(
                (booking) => {
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
                          gap: 12
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
                            gap: 10,
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
          style={cardStyle}
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
            Current called numbers:
          </p>

          <div
            style={{
              fontSize: 24,
              fontWeight:
                "bold",
              marginBottom:
                15
            }}
          >
            {calledNumbers.length
              ? calledNumbers.join(
                  ", "
                )
              : "None"}
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
                length: 90
              },
              (_, i) =>
                i + 1
            ).map((number) => {
              const called =
                calledNumbers.includes(
                  number
                );

              return (
                <button
                  key={number}
                  type="button"
                  onClick={() =>
                    toggleCalledNumber(
                      number
                    )
                  }
                  style={{
                    padding:
                      "9px 3px",
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
                  {number}
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={cardStyle}
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
                    {prize.name}
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

        <section
          style={cardStyle}
        >
          <h2>
            Game Control
          </h2>

          <div
            style={{
              display:
                "flex",
              gap: 10,
              flexWrap:
                "wrap"
            }}
          >
            <button
              disabled
              style={{
                ...primaryButton,
                opacity: 0.5
              }}
            >
              START GAME
            </button>

            <button
              disabled
              style={{
                ...secondaryButton,
                opacity: 0.5
              }}
            >
              END GAME
            </button>
          </div>
        </section>

        <button
          onClick={
            onNewGame
          }
          style={{
            ...secondaryButton,
            width: "100%"
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
        padding: 14,
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background:
          "#f8fafc"
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize: 13,
          marginBottom: 5
        }}
      >
        {title}
      </div>

      <b>
        {value}
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
        padding: 14,
        textAlign:
          "center",
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background:
          "#f8fafc"
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize: 13
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight:
            "bold",
          marginTop: 5
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   APP ROUTING
========================================================= */

function App() {
  /*
    Read the URL once when App starts.

    This is important because:
    https://your-site.vercel.app/?game=ABC123

    must always behave as a PLAYER URL.
  */

  const [
    playerCode
  ] = useState(
    () => getGameFromUrl()
  );

  /*
    Restore host game from localStorage.
  */

  const [
    game,
    setGame
  ] = useState(
    () => getSavedHostGame()
  );

  const [
    playerGame,
    setPlayerGame
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  /*
    Load player game when URL contains
    ?game=XXXXXX
  */

  useEffect(() => {
    if (playerCode) {
      loadPlayerGame(
        playerCode
      );
      return;
    }

    /*
      Normal website.

      Host game is restored from
      localStorage automatically.
    */

    setLoading(false);
  }, [playerCode]);

  async function loadPlayerGame(
    code
  ) {
    try {
      const cleanCode =
        String(code)
          .trim()
          .toUpperCase();

      if (!cleanCode) {
        setPlayerGame(null);
        return;
      }

      const {
        data,
        error
      } =
        await supabase
          .from("games")
          .select("*")
          .eq(
            "game_code",
            cleanCode
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      setPlayerGame(
        data || null
      );

    } catch (err) {
      console.error(
        "Could not load player game:",
        err
      );

      setPlayerGame(null);

    } finally {
      setLoading(false);
    }
  }

  function handleCreated(
    newGame
  ) {
    setGame(newGame);

    saveHostGame(newGame);

    /*
      Make sure a previous ?game=
      parameter is removed.
    */

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  function handleNewGame() {
    saveHostGame(null);

    setGame(null);

    setPlayerGame(null);

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
          display: "flex",
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

  /*
    ========================================================
    PLAYER PAGE
    ========================================================
  */

  if (playerCode) {
    if (!playerGame) {
      return (
        <main
          style={pageStyle}
        >
          <div
            style={{
              maxWidth: 600,
              margin:
                "60px auto",
              textAlign:
                "center"
            }}
          >
            <section
              style={cardStyle}
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
                  fontSize: 13
                }}
              >
                Game Code:{" "}
                {playerCode}
              </p>
            </section>
          </div>
        </main>
      );
    }

    return (
      <PlayerBookingPage
        game={playerGame}
      />
    );
  }

  /*
    ========================================================
    HOST CONTROL CENTRE
    ========================================================
  */

  if (game) {
    return (
      <HostControlPage
        game={game}
        onNewGame={
          handleNewGame
        }
      />
    );
  }

  /*
    ========================================================
    NORMAL WEBSITE
    CREATE GAME PAGE
    ========================================================
  */

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
   =========================================================

   THIS WAS MISSING FROM YOUR CODE.

   Without this React never mounts App()
   into index.html.
========================================================= */

const rootElement =
  document.getElementById(
    "root"
  );

if (!rootElement) {
  throw new Error(
    'Could not find the root element. Make sure index.html contains <div id="root"></div>.'
  );
}

const root =
  createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
