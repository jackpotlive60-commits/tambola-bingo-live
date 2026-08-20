import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================
   BASIC HELPERS
========================= */

const GAME_KEY = "tambolalive_host_game";

function getGameCode() {
  return new URLSearchParams(window.location.search).get("game");
}

function saveGame(game) {
  localStorage.setItem(GAME_KEY, JSON.stringify(game));
}

function loadGame() {
  try {
    return JSON.parse(localStorage.getItem(GAME_KEY));
  } catch {
    return null;
  }
}

/* =========================
   STYLES
========================= */

const page = {
  minHeight: "100vh",
  background: "#f4f6fa",
  padding: "18px 12px",
  fontFamily: "Arial, sans-serif",
  boxSizing: "border-box"
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
  boxShadow: "0 2px 10px rgba(0,0,0,.06)",
  border: "1px solid #e5e7eb"
};

const button = {
  border: 0,
  borderRadius: 9,
  padding: "11px 16px",
  fontWeight: "bold",
  cursor: "pointer"
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: 13,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  fontSize: 16
};

/* =========================
   DETERMINISTIC RANDOM
========================= */

function seededRandom(seed) {
  let x = seed >>> 0;

  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/* =========================
   TAMBOLA TICKET GENERATOR
========================= */

function makeTicket(seed) {
  const random = seededRandom(seed);

  /*
    Column ranges:
    1-9, 10-19, ... 80-90
  */
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

  /*
    Create 3 rows with exactly
    5 occupied cells each.
  */
  let positions;

  for (;;) {
    const rows = [[], [], []];

    for (let r = 0; r < 3; r++) {
      while (rows[r].length < 5) {
        const c = Math.floor(random() * 9);

        if (!rows[r].includes(c)) {
          rows[r].push(c);
        }
      }

      rows[r].sort((a, b) => a - b);
    }

    const counts = Array(9).fill(0);

    rows.forEach(row =>
      row.forEach(c => counts[c]++)
    );

    if (counts.every(c => c >= 1 && c <= 3)) {
      positions = rows;
      break;
    }
  }

  const grid = Array.from(
    { length: 3 },
    () => Array(9).fill(null)
  );

  /*
    Fill each column with sorted numbers.
  */
  for (let c = 0; c < 9; c++) {
    const rowIndexes = [];

    for (let r = 0; r < 3; r++) {
      if (positions[r].includes(c)) {
        rowIndexes.push(r);
      }
    }

    const [min, max] = ranges[c];
    const numbers = [];

    while (numbers.length < rowIndexes.length) {
      const n =
        min +
        Math.floor(random() * (max - min + 1));

      if (!numbers.includes(n)) {
        numbers.push(n);
      }
    }

    numbers.sort((a, b) => a - b);

    rowIndexes.forEach((r, i) => {
      grid[r][c] = numbers[i];
    });
  }

  return grid;
}

function makeTickets(gameCode, limit) {
  const count = Math.min(
    Math.max(Number(limit) || 100, 1),
    100
  );

  let seed = 0;

  for (const char of gameCode) {
    seed =
      ((seed << 5) - seed + char.charCodeAt(0)) |
      0;
  }

  return Array.from(
    { length: count },
    (_, i) => ({
      number: i + 1,
      grid: makeTicket(
        seed + i * 99991
      )
    })
  );
}

/* =========================
   PLAYER PAGE
========================= */

function PlayerBookingPage({ game }) {
  const ticketCount = Math.min(
    Number(game.ticket_limit) || 100,
    100
  );

  const tickets = useMemo(
    () =>
      makeTickets(
        game.game_code,
        ticketCount
      ),
    [game.game_code, ticketCount]
  );

  const [selected, setSelected] =
    useState([]);

  const [playerName, setPlayerName] =
    useState("");

  function toggleTicket(number) {
    setSelected(current =>
      current.includes(number)
        ? current.filter(n => n !== number)
        : [...current, number]
    );
  }

  function selectAll() {
    setSelected(
      tickets.map(ticket => ticket.number)
    );
  }

  function clearSelection() {
    setSelected([]);
  }

  function bookTickets() {
    if (!playerName.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!selected.length) {
      alert("Please select at least one ticket.");
      return;
    }

    /*
      Booking database connection will be
      added after the exact booking table
      structure is confirmed.
    */
    alert(
      `Selected tickets: ${selected
        .sort((a, b) => a - b)
        .map(n => `#${n}`)
        .join(", ")}\n\nPlayer: ${playerName}`
    );
  }

  return (
    <main style={page}>
      <div
        style={{
          maxWidth: 850,
          margin: "0 auto"
        }}
      >
        {/* HEADER */}

        <section style={card}>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 30
            }}
          >
            {game.game_name}
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10
            }}
          >
            <Info
              title="Game Code"
              value={game.game_code}
            />

            <Info
              title="Date"
              value={game.game_date || "-"}
            />

            <Info
              title="Time"
              value={game.game_time || "-"}
            />

            <Info
              title="Ticket Price"
              value={`₹${game.ticket_price || 0}`}
            />
          </div>
        </section>

        {/* TICKET NUMBERS */}

        <section style={card}>
          <h2 style={{ marginTop: 0 }}>
            Select Tickets
          </h2>

          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap"
            }}
          >
            {tickets.map(ticket => {
              const active =
                selected.includes(ticket.number);

              return (
                <button
                  key={ticket.number}
                  onClick={() =>
                    toggleTicket(ticket.number)
                  }
                  style={{
                    ...button,
                    minWidth: 55,
                    padding: "11px 10px",
                    background: active
                      ? "#2563eb"
                      : "#fff",
                    color: active
                      ? "#fff"
                      : "#111827",
                    border: active
                      ? "1px solid #2563eb"
                      : "1px solid #cbd5e1"
                  }}
                >
                  #{ticket.number}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap"
            }}
          >
            <button
              onClick={selectAll}
              style={{
                ...button,
                background: "#111827",
                color: "#fff"
              }}
            >
              Select All
            </button>

            <button
              onClick={clearSelection}
              style={{
                ...button,
                background: "#fff",
                border: "1px solid #cbd5e1"
              }}
            >
              Clear
            </button>
          </div>

          <p
            style={{
              color: "#64748b",
              marginBottom: 0
            }}
          >
            Selected:{" "}
            <b>{selected.length}</b> ticket
            {selected.length === 1 ? "" : "s"}
          </p>
        </section>

        {/* ALL TICKETS */}

        {tickets.map(ticket => {
          const active =
            selected.includes(ticket.number);

          return (
            <section
              key={ticket.number}
              style={{
                ...card,
                border: active
                  ? "3px solid #2563eb"
                  : "1px solid #e5e7eb"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginBottom: 12
                }}
              >
                <h2
                  style={{
                    margin: 0
                  }}
                >
                  Ticket #{ticket.number}
                </h2>

                <button
                  onClick={() =>
                    toggleTicket(ticket.number)
                  }
                  style={{
                    ...button,
                    background: active
                      ? "#2563eb"
                      : "#fff",
                    color: active
                      ? "#fff"
                      : "#111827",
                    border: active
                      ? "1px solid #2563eb"
                      : "1px solid #cbd5e1"
                  }}
                >
                  {active
                    ? "✓ Selected"
                    : "Select"}
                </button>
              </div>

              <div
                style={{
                  overflowX: "auto"
                }}
              >
                <div
                  style={{
                    minWidth: 540,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(9, 1fr)",
                    border:
                      "3px solid #111827",
                    borderRadius: 10,
                    overflow: "hidden"
                  }}
                >
                  {ticket.grid.flatMap(
                    (row, r) =>
                      row.map((value, c) => (
                        <div
                          key={`${r}-${c}`}
                          style={{
                            height: 58,
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            fontSize: 21,
                            fontWeight: value
                              ? "bold"
                              : "normal",
                            background: value
                              ? "#fff"
                              : "#f1f5f9",
                            borderRight:
                              c === 8
                                ? "none"
                                : "1px solid #1f2937",
                            borderBottom:
                              r === 2
                                ? "none"
                                : "1px solid #1f2937"
                          }}
                        >
                          {value || ""}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {/* BOOKING */}

        <section style={card}>
          <h2
            style={{
              marginTop: 0
            }}
          >
            Book Selected Tickets
          </h2>

          <p>
            Tickets selected:{" "}
            <b>
              {selected.length
                ? selected
                    .sort((a, b) => a - b)
                    .map(n => `#${n}`)
                    .join(", ")
                : "None"}
            </b>
          </p>

          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: 7
            }}
          >
            Player Name
          </label>

          <input
            value={playerName}
            onChange={e =>
              setPlayerName(e.target.value)
            }
            placeholder="Enter your name"
            style={input}
          />

          <button
            onClick={bookTickets}
            style={{
              ...button,
              width: "100%",
              marginTop: 12,
              background: "#2563eb",
              color: "#fff",
              fontSize: 17,
              padding: 15
            }}
          >
            BOOK SELECTED TICKETS
          </button>
        </section>
      </div>
    </main>
  );
}

/* =========================
   INFO
========================= */

function Info({ title, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 12
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

      <b
        style={{
          display: "block",
          marginTop: 4,
          fontSize: 16
        }}
      >
        {value}
      </b>
    </div>
  );
}

/* =========================
   HOST CREATE PAGE
========================= */

function CreateGame({ onCreated }) {
  const [name, setName] =
    useState("TambolaLive");

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [limit, setLimit] =
    useState(100);

  const [price, setPrice] =
    useState(20);

  const [loading, setLoading] =
    useState(false);

  async function createGame(e) {
    e.preventDefault();

    setLoading(true);

    try {
      let code;

      for (;;) {
        const characters =
          "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        code = "";

        for (let i = 0; i < 6; i++) {
          code +=
            characters[
              Math.floor(
                Math.random() *
                  characters.length
              )
            ];
        }

        const { data } =
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", code)
            .limit(1);

        if (!data?.length) break;
      }

      const game = {
        host_name: "Host",
        game_name:
          name.trim() || "TambolaLive",
        status: "upcoming",
        ticket_limit: Number(limit),
        ticket_price: Number(price),
        call_interval_seconds: 5,
        game_date: date || null,
        game_time: time || null,
        game_code: code,
        invite_enabled: true,
        selected_prizes: [],
        called_numbers: []
      };

      const { data, error } =
        await supabase
          .from("games")
          .insert(game)
          .select()
          .single();

      if (error) throw error;

      saveGame(data);
      onCreated(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={page}>
      <div
        style={{
          maxWidth: 650,
          margin: "0 auto"
        }}
      >
        <section style={card}>
          <h1>TAMBOLA LIVE</h1>

          <p>Host Create Game</p>

          <form onSubmit={createGame}>
            <label>Game Name</label>

            <input
              value={name}
              onChange={e =>
                setName(e.target.value)
              }
              style={{
                ...input,
                margin: "7px 0 15px"
              }}
            />

            <label>Date</label>

            <input
              type="date"
              required
              value={date}
              onChange={e =>
                setDate(e.target.value)
              }
              style={{
                ...input,
                margin: "7px 0 15px"
              }}
            />

            <label>Time</label>

            <input
              type="time"
              required
              value={time}
              onChange={e =>
                setTime(e.target.value)
              }
              style={{
                ...input,
                margin: "7px 0 15px"
              }}
            />

            <label>Ticket Limit</label>

            <input
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={e =>
                setLimit(e.target.value)
              }
              style={{
                ...input,
                margin: "7px 0 15px"
              }}
            />

            <label>Ticket Price</label>

            <input
              type="number"
              min="0"
              value={price}
              onChange={e =>
                setPrice(e.target.value)
              }
              style={{
                ...input,
                margin: "7px 0 20px"
              }}
            />

            <button
              disabled={loading}
              style={{
                ...button,
                width: "100%",
                background: "#2563eb",
                color: "#fff",
                fontSize: 16
              }}
            >
              {loading
                ? "Creating..."
                : "CREATE GAME"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

/* =========================
   HOST PAGE
========================= */

function HostPage({ game, newGame }) {
  const link =
    `${window.location.origin}/?game=${game.game_code}`;

  function copy() {
    navigator.clipboard.writeText(link);
    alert("Game link copied!");
  }

  return (
    <main style={page}>
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto"
        }}
      >
        <section style={card}>
          <h1>{game.game_name}</h1>

          <p>
            Host Control Centre
          </p>

          <Info
            title="Game Code"
            value={game.game_code}
          />

          <br />

          <Info
            title="Date"
            value={game.game_date}
          />

          <br />

          <Info
            title="Time"
            value={game.game_time}
          />

          <br />

          <Info
            title="Ticket Price"
            value={`₹${game.ticket_price}`}
          />

          <br />

          <Info
            title="Ticket Limit"
            value={game.ticket_limit}
          />
        </section>

        <section style={card}>
          <h2>Share Game</h2>

          <input
            readOnly
            value={link}
            style={input}
          />

          <button
            onClick={copy}
            style={{
              ...button,
              marginTop: 10,
              background: "#2563eb",
              color: "#fff"
            }}
          >
            Copy Link
          </button>
        </section>

        <button
          onClick={newGame}
          style={{
            ...button,
            width: "100%",
            background: "#fff",
            border: "1px solid #cbd5e1"
          }}
        >
          Create Another Game
        </button>
      </div>
    </main>
  );
}

/* =========================
   APP
========================= */

function App() {
  const gameCode = getGameCode();

  const [game, setGame] =
    useState(null);

  const [loading, setLoading] =
    useState(Boolean(gameCode));

  /*
    VERY IMPORTANT:
    ?game=XXXX always means PLAYER.
    We do NOT use the host's localStorage
    when a game link is opened.
  */
  useEffect(() => {
    if (!gameCode) {
      setLoading(false);
      setGame(loadGame());
      return;
    }

    async function loadPlayerGame() {
      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameCode)
          .single();

      if (error) {
        console.error(error);
      }

      setGame(data || null);
      setLoading(false);
    }

    loadPlayerGame();
  }, [gameCode]);

  if (loading) {
    return (
      <main
        style={{
          ...page,
          display: "grid",
          placeItems: "center"
        }}
      >
        <h2>Loading game...</h2>
      </main>
    );
  }

  /* PLAYER */

  if (gameCode) {
    if (!game) {
      return (
        <main
          style={{
            ...page,
            display: "grid",
            placeItems: "center"
          }}
        >
          <section style={card}>
            <h2>Game not found</h2>
            <p>
              Please check the game link.
            </p>
          </section>
        </main>
      );
    }

    return (
      <PlayerBookingPage
        game={game}
      />
    );
  }

  /* HOST */

  const savedGame = game;

  if (savedGame) {
    return (
      <HostPage
        game={savedGame}
        newGame={() => {
          localStorage.removeItem(
            GAME_KEY
          );
          setGame(null);
        }}
      />
    );
  }

  return (
    <CreateGame
      onCreated={setGame}
    />
  );
}

/* =========================
   START
========================= */

createRoot(
  document.getElementById("root")
).render(<App />);
