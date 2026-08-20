import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

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
].map(name => ({ name, amount: "" }));

/* =========================
   BASIC HELPERS
========================= */

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function saveHostGame(game) {
  if (game) {
    localStorage.setItem(GAME_KEY, JSON.stringify(game));
  } else {
    localStorage.removeItem(GAME_KEY);
  }
}

function getGameFromUrl() {
  return new URLSearchParams(window.location.search).get("game");
}

/* =========================
   TICKET GENERATOR
========================= */

function seededRandom(seed) {
  let x = seed >>> 0;

  return () => {
    x += 0x6d2b79f5;

    let t = x;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromText(text) {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffle(array, random) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

/*
  Creates a proper 3 × 9 Tambola ticket.

  Every row = 5 numbers
  Total = 15 numbers
  Every column has at least 1 number
*/
function makeTicket(gameCode, ticketNumber) {
  const random = seededRandom(
    seedFromText(`${gameCode}-${ticketNumber}`)
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

  for (let attempt = 0; attempt < 100; attempt++) {
    const rows = [
      shuffle([0,1,2,3,4,5,6,7,8], random).slice(0,5),
      shuffle([0,1,2,3,4,5,6,7,8], random).slice(0,5),
      shuffle([0,1,2,3,4,5,6,7,8], random).slice(0,5)
    ];

    const cells = [
      ...rows[0].map(c => [0,c]),
      ...rows[1].map(c => [1,c]),
      ...rows[2].map(c => [2,c])
    ];

    const counts = Array(9).fill(0);

    cells.forEach(([, c]) => counts[c]++);

    if (counts.every(c => c >= 1)) {
      pattern = cells;
      break;
    }
  }

  /*
    Guaranteed valid fallback.
  */
  if (!pattern) {
    pattern = [
      [0,0],[0,1],[0,3],[0,5],[0,7],
      [1,1],[1,2],[1,4],[1,6],[1,8],
      [2,0],[2,2],[2,4],[2,6],[2,8]
    ];
  }

  const grid = Array.from(
    { length: 3 },
    () => Array(9).fill(null)
  );

  for (let column = 0; column < 9; column++) {
    const rows = pattern
      .filter(([, c]) => c === column)
      .map(([r]) => r)
      .sort((a,b) => a-b);

    if (!rows.length) continue;

    const [min, max] = ranges[column];

    const numbers = [];

    for (let n = min; n <= max; n++) {
      numbers.push(n);
    }

    const selected = shuffle(
      numbers,
      random
    )
      .slice(0, rows.length)
      .sort((a,b) => a-b);

    rows.forEach((row, index) => {
      grid[row][column] = selected[index];
    });
  }

  return grid;
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 20,
  boxSizing: "border-box",
  fontFamily: "Arial, Helvetica, sans-serif"
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 3px 10px rgba(0,0,0,.05)"
};

const inputStyle = {
  width: "100%",
  padding: 12,
  border: "1px solid #cbd5e1",
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
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "#fff",
  color: "#111827",
  fontWeight: "bold",
  cursor: "pointer"
};

/* =========================
   CREATE GAME
========================= */

function CreateGamePage({ onCreated }) {
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

  function updatePrize(index, amount) {
    setPrizes(current =>
      current.map((p, i) =>
        i === index
          ? { ...p, amount }
          : p
      )
    );
  }

  function addPrize() {
    const name = customPrize.trim();

    if (!name) return;

    setPrizes(current => [
      ...current,
      {
        name,
        amount: ""
      }
    ]);

    setCustomPrize("");
  }

  function removePrize(index) {
    setPrizes(current =>
      current.filter((_, i) => i !== index)
    );
  }

  async function createGame(e) {
    e.preventDefault();

    if (creating) return;

    setCreating(true);
    setError("");

    try {
      let code = generateGameCode();

      while (true) {
        const { data, error } =
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", code)
            .limit(1);

        if (error) throw error;

        if (!data?.length) break;

        code = generateGameCode();
      }

      const selectedPrizes = prizes
        .filter(p => p.amount !== "")
        .map(p => ({
          name: p.name,
          amount: Number(p.amount)
        }));

      const newGame = {
        host_name: "Host",

        game_name:
          gameName.trim() ||
          DEFAULT_GAME_NAME,

        status: "upcoming",

        ticket_limit:
          Number(ticketLimit),

        ticket_price:
          Number(ticketPrice),

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

      const { data, error } =
        await supabase
          .from("games")
          .insert(newGame)
          .select()
          .single();

      if (error) throw error;

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
          <h1>TAMBOLA LIVE</h1>

          <p style={{ color: "#64748b" }}>
            Host Create Game
          </p>
        </div>

        <form onSubmit={createGame}>

          <section style={cardStyle}>
            <h2>Create New Game</h2>

            <b>Game Name</b>

            <input
              value={gameName}
              onChange={e =>
                setGameName(e.target.value)
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
                  onChange={e =>
                    setGameDate(e.target.value)
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
                  onChange={e =>
                    setGameTime(e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>Ticket Limit</b>

                <input
                  type="number"
                  min="1"
                  value={ticketLimit}
                  onChange={e =>
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
                <b>Ticket Price</b>

                <input
                  type="number"
                  min="0"
                  value={ticketPrice}
                  onChange={e =>
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

            <div style={{ marginTop: 16 }}>
              <b>Game Theme</b>

              <select
                value={theme}
                onChange={e =>
                  setTheme(e.target.value)
                }
                style={{
                  ...inputStyle,
                  marginTop: 7
                }}
              >
                {THEMES.map(t => (
                  <option
                    key={t}
                    value={t}
                  >
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section style={cardStyle}>
            <h2>Prizes</h2>

            {prizes.map((p, index) => (
              <div
                key={`${p.name}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 130px auto",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 10
                }}
              >
                <b>{p.name}</b>

                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={p.amount}
                  onChange={e =>
                    updatePrize(
                      index,
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />

                <button
                  type="button"
                  onClick={() =>
                    removePrize(index)
                  }
                  style={secondaryButton}
                >
                  Remove
                </button>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 15
              }}
            >
              <input
                placeholder="Customize prize"
                value={customPrize}
                onChange={e =>
                  setCustomPrize(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

              <button
                type="button"
                onClick={addPrize}
                style={secondaryButton}
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <section
              style={{
                ...cardStyle,
                background: "#fef2f2",
                border:
                  "1px solid #ef4444",
                color: "#b91c1c"
              }}
            >
              <b>Could not create game</b>

              <p>{error}</p>
            </section>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
              opacity: creating ? .6 : 1
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

/* =========================
   TICKET DISPLAY
========================= */

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
            ? "3px solid #2563eb"
            : "1px solid #cbd5e1",
        borderRadius: 14,
        padding: 14,
        background: selected
          ? "#eff6ff"
          : "#fff",
        cursor: "pointer"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 10
        }}
      >
        <b
          style={{
            fontSize: 20
          }}
        >
          Ticket #{ticket.number}
        </b>

        {selected && (
          <span
            style={{
              background: "#2563eb",
              color: "#fff",
              padding:
                "7px 12px",
              borderRadius: 8,
              fontWeight: "bold"
            }}
          >
            Selected
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(9,1fr)",
          border:
            "2px solid #111827",
          overflow: "hidden",
          borderRadius: 8
        }}
      >
        {ticket.grid.flatMap(
          (row, r) =>
            row.map((value, c) => (
              <div
                key={`${r}-${c}`}
                style={{
                  minHeight: 42,
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRight:
                    c === 8
                      ? "none"
                      : "1px solid #cbd5e1",
                  borderBottom:
                    r === 2
                      ? "none"
                      : "1px solid #cbd5e1",
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
            ))
        )}
      </div>
    </div>
  );
}

/* =========================
   PLAYER PAGE
========================= */

function PlayerBookingPage({
  game
}) {
  const limit = Math.min(
    Number(game.ticket_limit) || 100,
    100
  );

  const [selected, setSelected] =
    useState([]);

  const [playerName, setPlayerName] =
    useState("");

  const [booking, setBooking] =
    useState(false);

  const [message, setMessage] =
    useState("");

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

  function toggleTicket(number) {
    setSelected(current =>
      current.includes(number)
        ? current.filter(
            n => n !== number
          )
        : [...current, number]
    );
  }

  async function bookTickets() {
    const name =
      playerName.trim();

    if (!name) {
      setMessage(
        "Please enter your name."
      );
      return;
    }

    if (!selected.length) {
      setMessage(
        "Please select at least one ticket."
      );
      return;
    }

    setBooking(true);
    setMessage("");

    /*
      Keep all selected tickets
      together in one booking.
    */
    const bookingData = {
      game_id: game.id,
      game_code: game.game_code,
      player_name: name,
      ticket_numbers:
        [...selected].sort(
          (a,b) => a-b
        ),
      status: "pending"
    };

    try {
      /*
        Try the booking table used by
        the application.
      */
      const { error } =
        await supabase
          .from("ticket_bookings")
          .insert(bookingData);

      if (error) throw error;

      setMessage(
        `Booking submitted for ticket${
          selected.length > 1 ? "s" : ""
        } ${[...selected]
          .sort((a,b) => a-b)
          .map(n => `#${n}`)
          .join(", ")}. Waiting for host approval.`
      );

      setSelected([]);

    } catch (err) {
      console.error(err);

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
          maxWidth: 900,
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
              color: "#64748b"
            }}
          >
            Player Ticket Booking
          </p>
        </div>

        <section style={cardStyle}>
          <h2>Game Details</h2>

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
              value={game.game_code}
            />

            <InfoBox
              title="Date"
              value={
                game.game_date || "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time || "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${
                game.ticket_price || 0
              }`}
            />
          </div>
        </section>

        {/* TICKET NUMBER SELECTOR */}
        <section style={cardStyle}>
          <h2>
            Select Tickets
          </h2>

          <p
            style={{
              color: "#64748b"
            }}
          >
            You can select multiple
            tickets.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(5,1fr)",
              gap: 10
            }}
          >
            {tickets.map(ticket => {
              const active =
                selected.includes(
                  ticket.number
                );

              return (
                <button
                  key={ticket.number}
                  type="button"
                  onClick={() =>
                    toggleTicket(
                      ticket.number
                    )
                  }
                  style={{
                    padding: "13px 5px",
                    borderRadius: 10,
                    border:
                      active
                        ? "2px solid #2563eb"
                        : "1px solid #cbd5e1",
                    background:
                      active
                        ? "#2563eb"
                        : "#fff",
                    color:
                      active
                        ? "#fff"
                        : "#111827",
                    fontWeight: "bold",
                    fontSize: 16,
                    cursor: "pointer"
                  }}
                >
                  #{ticket.number}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 15,
              padding: 12,
              borderRadius: 10,
              background: "#f8fafc"
            }}
          >
            <b>
              Selected:
            </b>{" "}
            {selected.length
              ? [...selected]
                  .sort(
                    (a,b) => a-b
                  )
                  .map(
                    n => `#${n}`
                  )
                  .join(", ")
              : "None"}
          </div>
        </section>

        {/* ACTUAL SELECTED TICKETS */}
        <section style={cardStyle}>
          <h2>
            Selected Tickets
          </h2>

          {!selected.length ? (
            <p
              style={{
                color: "#64748b"
              }}
            >
              Select one or more ticket
              numbers above to see the
              actual 3×9 Tambola tickets
              here.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18
              }}
            >
              {[...selected]
                .sort(
                  (a,b) => a-b
                )
                .map(number => {
                  const ticket =
                    tickets.find(
                      t =>
                        t.number ===
                        number
                    );

                  return (
                    <TicketGrid
                      key={number}
                      ticket={ticket}
                      selected={true}
                      onSelect={() =>
                        toggleTicket(
                          number
                        )
                      }
                    />
                  );
                })}
            </div>
          )}
        </section>

        {/* ONE BOOKING BUTTON */}
        <section style={cardStyle}>
          <h2>
            Booking Details
          </h2>

          <label>
            <b>Player Name</b>
          </label>

          <input
            value={playerName}
            onChange={e =>
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
            onClick={bookTickets}
            disabled={
              booking ||
              !selected.length
            }
            style={{
              ...primaryButton,
              width: "100%",
              marginTop: 14,
              opacity:
                booking ||
                !selected.length
                  ? .55
                  : 1
            }}
          >
            {booking
              ? "SUBMITTING..."
              : "BOOK SELECTED TICKETS"}
          </button>

          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              marginBottom: 0
            }}
          >
            Your booking will remain
            pending until the host
            approves it.
          </p>

          {message && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                background:
                  "#eff6ff",
                color: "#1d4ed8",
                textAlign: "center",
                fontWeight: "bold"
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

/* =========================
   HOST CONTROL CENTRE
========================= */

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

  const [copied, setCopied] =
    useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setCopied(true);

      setTimeout(
        () => setCopied(false),
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

    if (navigator.share) {
      try {
        await navigator.share({
          title: game.game_name,
          text: message,
          url: inviteUrl
        });
      } catch {}
      return;
    }

    await copyLink();
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 850,
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
              color: "#64748b"
            }}
          >
            Host Control Centre
          </p>
        </div>

        {/* GAME DETAILS */}
        <section style={cardStyle}>
          <h2>Game Details</h2>

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
              value={game.game_code}
            />

            <InfoBox
              title="Date"
              value={
                game.game_date || "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                game.game_time || "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${
                game.ticket_price || 0
              }`}
            />

            <InfoBox
              title="Ticket Limit"
              value={
                game.ticket_limit || 0
              }
            />

            <InfoBox
              title="Theme"
              value={
                game.theme || "Classic"
              }
            />
          </div>

          <div
            style={{
              marginTop: 15,
              padding: 14,
              borderRadius: 10,
              background: "#fff7ed",
              border:
                "1px solid #f59e0b"
            }}
          >
            <b>Game Status</b>

            <div
              style={{
                marginTop: 5,
                fontSize: 20,
                fontWeight: "bold"
              }}
            >
              {String(
                game.status ||
                "upcoming"
              ).toUpperCase()}
            </div>
          </div>
        </section>

        {/* SHARE */}
        <section style={cardStyle}>
          <h2>Share Game</h2>

          <input
            readOnly
            value={inviteUrl}
            style={{
              ...inputStyle,
              marginBottom: 10
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap"
            }}
          >
            <button
              onClick={copyLink}
              style={secondaryButton}
            >
              {copied
                ? "✓ Copied"
                : "Copy Link"}
            </button>

            <button
              onClick={shareGame}
              style={primaryButton}
            >
              Share Game
            </button>
          </div>
        </section>

        {/* BOOKING CONTROL */}
        <section style={cardStyle}>
          <h2>
            Ticket Bookings
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 10
            }}
          >
            <StatusBox
              title="Pending"
              value="0"
            />

            <StatusBox
              title="Accepted"
              value="0"
            />

            <StatusBox
              title="Rejected"
              value="0"
            />
          </div>

          <p
            style={{
              color: "#64748b"
            }}
          >
            Player booking approvals
            will appear here.
          </p>
        </section>

        {/* PRIZES */}
        <section style={cardStyle}>
          <h2>Prizes</h2>

          {prizes.length === 0 ? (
            <p>
              No prizes selected.
            </p>
          ) : (
            prizes.map(
              (prize, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    padding: "12px 0",
                    borderBottom:
                      "1px solid #e5e7eb"
                  }}
                >
                  <b>
                    {prize.name}
                  </b>

                  <span>
                    ₹{prize.amount}
                  </span>
                </div>
              )
            )
          )}
        </section>

        {/* LIVE GAME CONTROL */}
        <section style={cardStyle}>
          <h2>
            Game Control
          </h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <button
              disabled
              style={{
                ...primaryButton,
                opacity: .5
              }}
            >
              START GAME
            </button>

            <button
              disabled
              style={{
                ...secondaryButton,
                opacity: .5
              }}
            >
              END GAME
            </button>
          </div>
        </section>

        <button
          onClick={onNewGame}
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

/* =========================
   SMALL COMPONENTS
========================= */

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
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 13,
          marginBottom: 5
        }}
      >
        {title}
      </div>

      <b>{value}</b>
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
        textAlign: "center",
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 13
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 5
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================
   APP ROUTING
========================= */

function App() {
  const [game, setGame] =
    useState(null);

  const [playerGame, setPlayerGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const code =
      getGameFromUrl();

    /*
      VERY IMPORTANT:

      ?game=XXXXXX = PLAYER PAGE

      No ?game = HOST CREATE PAGE

      This prevents the player link
      from accidentally opening the
      host dashboard.
    */
    if (code) {
      loadPlayerGame(code);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadPlayerGame(code) {
    try {
      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", code)
          .limit(1)
          .single();

      if (error) throw error;

      setPlayerGame(data);

    } catch (err) {
      console.error(err);
      setPlayerGame(null);
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(newGame) {
    setGame(newGame);

    /*
      Keep host control inside the
      current session only.
    */
    saveHostGame(newGame);
  }

  function handleNewGame() {
    saveHostGame(null);
    setGame(null);

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
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <h2>Loading...</h2>
      </main>
    );
  }

  /*
    PLAYER ROUTE
  */
  if (getGameFromUrl()) {
    if (!playerGame) {
      return (
        <main style={pageStyle}>
          <div
            style={{
              maxWidth: 600,
              margin: "60px auto",
              textAlign: "center"
            }}
          >
            <section style={cardStyle}>
              <h2>
                Game Not Found
              </h2>

              <p>
                This game link is invalid
                or the game no longer
                exists.
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
    HOST CONTROL ONLY AFTER
    CREATING A GAME IN THIS SESSION.
  */
  if (game) {
    return (
      <HostControlPage
        game={game}
        onNewGame={handleNewGame}
      />
    );
  }

  /*
    NORMAL WEBSITE = CREATE GAME
  */
  return (
    <CreateGamePage
      onCreated={handleCreated}
    />
  );
}

createRoot(
  document.getElementById("root")
).render(
  <App />
);
