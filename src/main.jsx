import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================
   CONSTANTS
========================= */

const GAME_KEY = "tambolalive_host_game";
const DEFAULT_GAME_NAME = "TambolaLive";

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
].map((name) => ({ name, amount: "" }));

/* =========================
   HELPERS
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

function loadHostGame() {
  try {
    const value = localStorage.getItem(GAME_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getGameCode() {
  return new URLSearchParams(window.location.search).get("game");
}

/* =========================
   TAMBOLA GENERATOR
========================= */

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateTicket(ticketNo) {
  const seed = ticketNo * 99991;

  const columns = Array.from({ length: 9 }, (_, col) => {
    const min = col === 0 ? 1 : col * 10;
    const max = col === 8 ? 90 : col * 10 + 9;

    const numbers = [];

    for (let n = min; n <= max; n++) {
      numbers.push(n);
    }

    numbers.sort(
      (a, b) =>
        seededRandom(seed + a * 17) -
        seededRandom(seed + b * 17)
    );

    return numbers;
  });

  /*
    Five numbers in every row = 15 total.
    First choose 5 columns for each row.
  */

  const rowColumns = [
    [],
    [],
    []
  ];

  const available = Array.from({ length: 9 }, (_, i) => i);

  let attempts = 0;

  while (
    rowColumns.some((row) => row.length < 5) &&
    attempts < 100
  ) {
    attempts++;

    for (let row = 0; row < 3; row++) {
      while (rowColumns[row].length < 5) {
        const index = Math.floor(
          seededRandom(
            seed +
              attempts * 37 +
              row * 101 +
              rowColumns[row].length * 13
          ) * available.length
        );

        const col = available[index];

        if (!rowColumns[row].includes(col)) {
          rowColumns[row].push(col);
        }
      }
    }

    const counts = Array(9).fill(0);

    rowColumns.forEach((row) => {
      row.forEach((col) => {
        counts[col]++;
      });
    });

    if (counts.every((count) => count >= 1)) {
      break;
    }

    rowColumns.forEach((row) => {
      while (row.length > 5) row.pop();
    });
  }

  /*
    Guaranteed valid pattern fallback.
  */
  const fallback = [
    [0, 1, 2, 3, 4],
    [1, 4, 5, 6, 7],
    [0, 2, 3, 7, 8]
  ];

  const counts = Array(9).fill(0);

  rowColumns.forEach((row) =>
    row.forEach((col) => counts[col]++)
  );

  const valid = counts.every((count) => count >= 1);

  const pattern = valid ? rowColumns : fallback;

  const grid = Array.from({ length: 3 }, () =>
    Array(9).fill(null)
  );

  pattern.forEach((row, rowIndex) => {
    row.sort((a, b) => a - b);

    row.forEach((col, position) => {
      const numbers = columns[col];

      grid[rowIndex][col] =
        numbers[
          (rowIndex * 2 +
            position +
            ticketNo) %
            numbers.length
        ];
    });
  });

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
  fontFamily: "Arial, sans-serif"
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 2px 8px rgba(0,0,0,.05)"
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxSizing: "border-box",
  fontSize: 15
};

const primaryButton = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer"
};

const secondaryButton = {
  padding: "10px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  fontWeight: "bold",
  cursor: "pointer"
};

/* =========================
   CREATE GAME
========================= */

function CreateGamePage({ onCreated }) {
  const [gameName, setGameName] =
    useState(DEFAULT_GAME_NAME);

  const [gameDate, setGameDate] = useState("");
  const [gameTime, setGameTime] = useState("");
  const [ticketLimit, setTicketLimit] = useState(100);
  const [ticketPrice, setTicketPrice] = useState(20);
  const [theme, setTheme] = useState("Classic");

  const [prizes, setPrizes] =
    useState(DEFAULT_PRIZES);

  const [customPrize, setCustomPrize] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] = useState("");

  function updatePrize(index, amount) {
    setPrizes((items) =>
      items.map((item, i) =>
        i === index
          ? { ...item, amount }
          : item
      )
    );
  }

  function removePrize(index) {
    setPrizes((items) =>
      items.filter((_, i) => i !== index)
    );
  }

  function addPrize() {
    const name = customPrize.trim();

    if (!name) return;

    setPrizes((items) => [
      ...items,
      { name, amount: "" }
    ]);

    setCustomPrize("");
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
        .filter(
          (p) =>
            p.amount !== "" &&
            p.amount !== null
        )
        .map((p) => ({
          name: p.name,
          amount: Number(p.amount)
        }));

      const newGame = {
        host_name: "Host",
        game_name:
          gameName.trim() ||
          DEFAULT_GAME_NAME,
        status: "upcoming",
        ticket_limit: Number(ticketLimit),
        ticket_price: Number(ticketPrice),
        call_interval_seconds: 5,
        game_date: gameDate || null,
        game_time: gameTime || null,
        theme,
        game_code: code,
        invite_enabled: true,
        selected_prizes: selectedPrizes,
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
        <header
          style={{
            textAlign: "center",
            marginBottom: 25
          }}
        >
          <h1>TAMBOLA LIVE</h1>
          <p>Host Dashboard</p>
        </header>

        <form onSubmit={createGame}>
          <section style={cardStyle}>
            <h2>Create New Game</h2>

            <label>
              <b>Game Name</b>
            </label>

            <input
              value={gameName}
              onChange={(e) =>
                setGameName(e.target.value)
              }
              style={{
                ...inputStyle,
                marginTop: 7,
                marginBottom: 15
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(200px,1fr))",
                gap: 12
              }}
            >
              <div>
                <b>Date</b>
                <input
                  type="date"
                  required
                  value={gameDate}
                  onChange={(e) =>
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
                  onChange={(e) =>
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
                  required
                  value={ticketLimit}
                  onChange={(e) =>
                    setTicketLimit(e.target.value)
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
                  required
                  value={ticketPrice}
                  onChange={(e) =>
                    setTicketPrice(e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 15 }}>
              <b>Theme</b>

              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value)
                }
                style={{
                  ...inputStyle,
                  marginTop: 7
                }}
              >
                {THEMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </section>

          <section style={cardStyle}>
            <h2>Prizes</h2>

            {prizes.map((prize, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 140px auto",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 10
                }}
              >
                <b>{prize.name}</b>

                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={prize.amount}
                  onChange={(e) =>
                    updatePrize(
                      i,
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />

                <button
                  type="button"
                  onClick={() =>
                    removePrize(i)
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
                onChange={(e) =>
                  setCustomPrize(e.target.value)
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
            <div
              style={{
                ...cardStyle,
                color: "#b91c1c",
                background: "#fef2f2"
              }}
            >
              <b>Could not create game</b>
              <p>{error}</p>
            </div>
          )}

          <button
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
              fontSize: 17,
              padding: 15
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
   HOST CONTROL CENTRE
========================= */

function HostControlPage({ game, onNewGame }) {
  const [currentGame, setCurrentGame] =
    useState(game);

  const [copied, setCopied] =
    useState(false);

  const [starting, setStarting] =
    useState(false);

  const [ending, setEnding] =
    useState(false);

  const [bookingStats, setBookingStats] =
    useState({
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
      amount: 0
    });

  const inviteUrl =
    `${window.location.origin}/?game=${currentGame.game_code}`;

  const prizes =
    Array.isArray(
      currentGame.selected_prizes
    )
      ? currentGame.selected_prizes
      : [];

  async function refreshBookings() {
    /*
      This looks for a bookings table if it
      exists. If your booking table has not
      been created yet, the page simply keeps
      the counters at zero.
    */

    try {
      const { data, error } =
        await supabase
          .from("bookings")
          .select("*")
          .eq(
            "game_id",
            currentGame.id
          );

      if (error) {
        console.log(
          "Booking table not ready:",
          error.message
        );

        return;
      }

      const rows = data || [];

      const pending = rows.filter(
        (r) =>
          String(r.status).toLowerCase() ===
          "pending"
      ).length;

      const approvedRows = rows.filter(
        (r) =>
          String(r.status).toLowerCase() ===
          "approved"
      );

      const rejected = rows.filter(
        (r) =>
          String(r.status).toLowerCase() ===
          "rejected"
      ).length;

      const amount = approvedRows.reduce(
        (sum, r) =>
          sum +
          Number(
            r.amount ??
              r.total_amount ??
              r.ticket_price ??
              0
          ),
        0
      );

      setBookingStats({
        pending,
        approved: approvedRows.length,
        rejected,
        total: rows.length,
        amount
      });
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    refreshBookings();

    const channel =
      supabase
        .channel(
          `host-${currentGame.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "games",
            filter:
              `id=eq.${currentGame.id}`
          },
          (payload) => {
            if (payload.new) {
              setCurrentGame(
                payload.new
              );

              saveHostGame(
                payload.new
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGame.id]);

  async function startGame() {
    if (starting) return;

    setStarting(true);

    try {
      const { data, error } =
        await supabase
          .from("games")
          .update({
            status: "live",
            started_at:
              new Date().toISOString()
          })
          .eq("id", currentGame.id)
          .select()
          .single();

      if (error) throw error;

      setCurrentGame(data);
      saveHostGame(data);
    } catch (err) {
      alert(
        err?.message ||
          "Could not start game."
      );
    } finally {
      setStarting(false);
    }
  }

  async function endGame() {
    if (ending) return;

    if (
      !window.confirm(
        "End this game?"
      )
    ) {
      return;
    }

    setEnding(true);

    try {
      const { data, error } =
        await supabase
          .from("games")
          .update({
            status: "ended",
            ended_at:
              new Date().toISOString()
          })
          .eq("id", currentGame.id)
          .select()
          .single();

      if (error) throw error;

      setCurrentGame(data);
      saveHostGame(data);
    } catch (err) {
      alert(
        err?.message ||
          "Could not end game."
      );
    } finally {
      setEnding(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(
      inviteUrl
    );

    setCopied(true);

    setTimeout(
      () => setCopied(false),
      1800
    );
  }

  async function shareGame() {
    const message =
      `${currentGame.game_name}\n\n` +
      `Game Code: ${currentGame.game_code}\n` +
      `Date: ${currentGame.game_date || "-"}\n` +
      `Time: ${currentGame.game_time || "-"}\n` +
      `Ticket Price: ₹${currentGame.ticket_price || 0}\n\n` +
      `Join here:\n${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title:
            currentGame.game_name,
          text: message,
          url: inviteUrl
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(
        message
      );

      alert(
        "Game details copied."
      );
    }
  }

  const status =
    String(
      currentGame.status ||
        "upcoming"
    ).toLowerCase();

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 850,
          margin: "0 auto"
        }}
      >
        <header
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>
            {currentGame.game_name}
          </h1>

          <p>
            Host Control Centre
          </p>
        </header>

        {/* GAME INFORMATION */}

        <section style={cardStyle}>
          <h2>Game Information</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 10
            }}
          >
            <InfoBox
              title="Game Code"
              value={
                currentGame.game_code
              }
            />

            <InfoBox
              title="Date"
              value={
                currentGame.game_date ||
                "-"
              }
            />

            <InfoBox
              title="Time"
              value={
                currentGame.game_time ||
                "-"
              }
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${
                currentGame.ticket_price ||
                0
              }`}
            />

            <InfoBox
              title="Ticket Limit"
              value={
                currentGame.ticket_limit ||
                0
              }
            />

            <InfoBox
              title="Theme"
              value={
                currentGame.theme ||
                "Classic"
              }
            />
          </div>

          <div
            style={{
              marginTop: 15,
              padding: 15,
              borderRadius: 10,
              background:
                status === "live"
                  ? "#dcfce7"
                  : status === "ended"
                  ? "#fee2e2"
                  : "#fff7ed"
            }}
          >
            <b>Game Status</b>

            <div
              style={{
                fontSize: 21,
                fontWeight: "bold",
                marginTop: 4
              }}
            >
              {status.toUpperCase()}
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

        {/* BOOKING SUMMARY */}

        <section style={cardStyle}>
          <h2>Ticket Bookings</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(130px,1fr))",
              gap: 10
            }}
          >
            <StatusBox
              title="Total Tickets"
              value={
                bookingStats.total
              }
            />

            <StatusBox
              title="Pending"
              value={
                bookingStats.pending
              }
            />

            <StatusBox
              title="Approved"
              value={
                bookingStats.approved
              }
            />

            <StatusBox
              title="Rejected"
              value={
                bookingStats.rejected
              }
            />

            <StatusBox
              title="Collected"
              value={`₹${bookingStats.amount}`}
            />
          </div>
        </section>

        {/* PRIZES */}

        <section style={cardStyle}>
          <h2>Prizes</h2>

          {prizes.length === 0 ? (
            <p>No prizes selected.</p>
          ) : (
            prizes.map((prize, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  padding: "11px 0",
                  borderBottom:
                    "1px solid #e5e7eb"
                }}
              >
                <b>{prize.name}</b>
                <span>
                  ₹{prize.amount}
                </span>
              </div>
            ))
          )}
        </section>

        {/* GAME CONTROL */}

        <section style={cardStyle}>
          <h2>Game Control</h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <button
              disabled={
                starting ||
                status === "live" ||
                status === "ended"
              }
              onClick={startGame}
              style={{
                ...primaryButton,
                opacity:
                  status === "live" ||
                  status === "ended"
                    ? 0.5
                    : 1
              }}
            >
              {starting
                ? "STARTING..."
                : "START GAME"}
            </button>

            <button
              disabled={
                ending ||
                status !== "live"
              }
              onClick={endGame}
              style={{
                ...secondaryButton,
                opacity:
                  status !== "live"
                    ? 0.5
                    : 1
              }}
            >
              {ending
                ? "ENDING..."
                : "END GAME"}
            </button>
          </div>

          {status === "live" && (
            <p
              style={{
                color: "#15803d",
                fontWeight: "bold"
              }}
            >
              Game is LIVE. New ticket
              booking will be blocked
              on the player page.
            </p>
          )}
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
   PLAYER PAGE
========================= */

function PlayerPage({ gameCode }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] =
    useState([]);

  useEffect(() => {
    let channel;

    async function loadGame() {
      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameCode)
          .single();

      if (error) {
        setError(
          "Game not found."
        );
        setLoading(false);
        return;
      }

      setGame(data);
      setLoading(false);

      channel =
        supabase
          .channel(
            `player-${data.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "games",
              filter:
                `id=eq.${data.id}`
            },
            (payload) => {
              if (payload.new) {
                setGame(
                  payload.new
                );
              }
            }
          )
          .subscribe();
    }

    loadGame();

    return () => {
      if (channel) {
        supabase.removeChannel(
          channel
        );
      }
    };
  }, [gameCode]);

  const ticketLimit =
    Number(
      game?.ticket_limit || 100
    );

  const ticketNumbers = useMemo(
    () =>
      Array.from(
        { length: ticketLimit },
        (_, i) => i + 1
      ),
    [ticketLimit]
  );

  function toggleTicket(number) {
    if (
      String(game?.status).toLowerCase() ===
      "live"
    ) {
      return;
    }

    if (
      String(game?.status).toLowerCase() ===
      "ended"
    ) {
      return;
    }

    setSelected((current) =>
      current.includes(number)
        ? current.filter(
            (n) => n !== number
          )
        : [...current, number]
    );
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          Loading player page...
        </div>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h2>Game Not Found</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  const status =
    String(
      game.status || "upcoming"
    ).toLowerCase();

  const bookingClosed =
    status === "live" ||
    status === "ended";

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto"
        }}
      >
        <header
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>TAMBOLA LIVE</h1>
          <h2>
            {game.game_name}
          </h2>

          <p>
            Game Code:{" "}
            <b>{game.game_code}</b>
          </p>
        </header>

        {/* GAME DETAILS */}

        <section style={cardStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10
            }}
          >
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
              title="Status"
              value={
                status.toUpperCase()
              }
            />
          </div>
        </section>

        {/* TICKET NUMBERS */}

        <section style={cardStyle}>
          <h2>
            Select Tickets
          </h2>

          {bookingClosed && (
            <div
              style={{
                padding: 14,
                marginBottom: 15,
                borderRadius: 10,
                background:
                  "#fee2e2",
                color: "#b91c1c",
                fontWeight: "bold"
              }}
            >
              Ticket booking is closed.
              The game has already started
              or ended.
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(58px,1fr))",
              gap: 7
            }}
          >
            {ticketNumbers.map(
              (number) => {
                const active =
                  selected.includes(
                    number
                  );

                return (
                  <button
                    key={number}
                    disabled={
                      bookingClosed
                    }
                    onClick={() =>
                      toggleTicket(
                        number
                      )
                    }
                    style={{
                      padding:
                        "10px 4px",
                      borderRadius: 8,
                      border:
                        active
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                      background:
                        active
                          ? "#dbeafe"
                          : "#fff",
                      color:
                        active
                          ? "#1d4ed8"
                          : "#111827",
                      fontWeight:
                        "bold",
                      cursor:
                        bookingClosed
                          ? "not-allowed"
                          : "pointer"
                    }}
                  >
                    #{number}
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* ACTUAL TICKETS */}

        <section style={cardStyle}>
          <h2>
            Selected Tickets
          </h2>

          {selected.length === 0 ? (
            <p
              style={{
                color: "#64748b"
              }}
            >
              Select a ticket number
              above to view the actual
              3×9 Tambola ticket.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 20
              }}
            >
              {selected.map(
                (ticketNumber) => (
                  <TambolaTicket
                    key={ticketNumber}
                    ticketNumber={
                      ticketNumber
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* =========================
   TAMBOLA TICKET
========================= */

function TambolaTicket({
  ticketNumber
}) {
  const grid =
    useMemo(
      () =>
        generateTicket(
          ticketNumber
        ),
      [ticketNumber]
    );

  return (
    <div
      style={{
        border:
          "2px solid #111827",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff"
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          fontWeight: "bold",
          background: "#f1f5f9"
        }}
      >
        Ticket #{ticketNumber}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(9,1fr)"
        }}
      >
        {grid.flatMap(
          (row, rowIndex) =>
            row.map(
              (number, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    minHeight: 42,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderTop:
                      "1px solid #111827",
                    borderRight:
                      colIndex === 8
                        ? "none"
                        : "1px solid #111827",
                    fontWeight:
                      number
                        ? "bold"
                        : "normal",
                    fontSize: 16
                  }}
                >
                  {number || ""}
                </div>
              )
            )
        )}
      </div>
    </div>
  );
}

/* =========================
   SMALL COMPONENTS
========================= */

function InfoBox({ title, value }) {
  return (
    <div
      style={{
        padding: 13,
        border:
          "1px solid #e5e7eb",
        borderRadius: 9,
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          marginBottom: 5
        }}
      >
        {title}
      </div>

      <b>{value}</b>
    </div>
  );
}

function StatusBox({ title, value }) {
  return (
    <div
      style={{
        padding: 14,
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        textAlign: "center",
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12
        }}
      >
        {title}
      </div>

      <strong
        style={{
          display: "block",
          fontSize: 22,
          marginTop: 5
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================
   APP
========================= */

function App() {
  const [hostGame, setHostGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const gameCode =
    getGameCode();

  useEffect(() => {
    const saved =
      loadHostGame();

    if (saved) {
      setHostGame(saved);
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main style={pageStyle}>
        <h2>Loading...</h2>
      </main>
    );
  }

  /*
    IMPORTANT:
    ?game=XXXX always means
    PLAYER PAGE.

    It must never open the host
    dashboard.
  */

  if (gameCode) {
    return (
      <PlayerPage
        gameCode={gameCode}
      />
    );
  }

  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={() => {
          saveHostGame(null);
          setHostGame(null);
        }}
      />
    );
  }

  return (
    <CreateGamePage
      onCreated={(game) => {
        saveHostGame(game);
        setHostGame(game);
      }}
    />
  );
}

/* =========================
   START
========================= */

createRoot(
  document.getElementById("root")
).render(<App />);
