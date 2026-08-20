import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================================================
   CONSTANTS
========================================================= */

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
].map(name => ({ name, amount: "" }));

const GAME_KEY = "tambolalive_host_game";

/* =========================================================
   HELPERS
========================================================= */

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function saveHostGame(game) {
  if (!game) {
    localStorage.removeItem(GAME_KEY);
    return;
  }

  localStorage.setItem(GAME_KEY, JSON.stringify(game));
}

function loadHostGame() {
  try {
    const value = localStorage.getItem(GAME_KEY);
    if (!value) return null;

    const game = JSON.parse(value);
    return game?.game_code ? game : null;
  } catch {
    return null;
  }
}

function getGameCodeFromUrl() {
  return new URLSearchParams(window.location.search).get("game");
}

/* =========================================================
   DETERMINISTIC RANDOM
   Same game + ticket number = same ticket
========================================================= */

function seededRandom(seed) {
  let x = seed >>> 0;

  return function () {
    x += 0x6D2B79F5;
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
  const a = [...array];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

/* =========================================================
   TAMBOLA TICKET GENERATOR
========================================================= */

function makeTicket(gameCode, ticketNumber) {
  const random = seededRandom(
    seedFromText(`${gameCode}-${ticketNumber}`)
  );

  /*
    Column ranges:
    1-9
    10-19
    20-29
    ...
    80-90
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
    Start with a valid 3x9 pattern.
    Every row gets exactly 5 numbers.
    Every column gets at least 1 number.
  */

  let positions = [];

  for (let r = 0; r < 3; r++) {
    const row = shuffle(
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      random
    ).slice(0, 5);

    row.forEach(c => positions.push([r, c]));
  }

  /*
    Ensure every column has at least one number.
  */

  const count = Array(9).fill(0);

  positions.forEach(([, c]) => {
    count[c]++;
  });

  for (let c = 0; c < 9; c++) {
    if (count[c] > 0) continue;

    const candidates = positions
      .map(([r, col], index) => ({
        r,
        col,
        index
      }))
      .filter(item => count[item.col] > 1);

    const chosen =
      candidates[
        Math.floor(random() * candidates.length)
      ];

    positions[chosen.index] = [chosen.r, c];

    count[chosen.col]--;
    count[c]++;
  }

  /*
    Remove accidental duplicates.
    If a row gets duplicate column positions,
    rebuild from a simple known-valid pattern.
  */

  const unique = new Set(
    positions.map(([r, c]) => `${r}-${c}`)
  );

  if (unique.size !== 15) {
    positions = [
      [0, 0], [0, 1], [0, 3], [0, 5], [0, 7],
      [1, 1], [1, 2], [1, 4], [1, 6], [1, 8],
      [2, 0], [2, 2], [2, 4], [2, 6], [2, 8]
    ];
  }

  const grid = Array.from(
    { length: 3 },
    () => Array(9).fill(null)
  );

  /*
    Generate numbers for each column.
  */

  for (let c = 0; c < 9; c++) {
    const rows = positions
      .map(([r, col]) => (col === c ? r : null))
      .filter(r => r !== null);

    if (!rows.length) continue;

    const [min, max] = ranges[c];

    const numbers = [];

    for (let n = min; n <= max; n++) {
      numbers.push(n);
    }

    const selected = shuffle(
      numbers,
      random
    ).slice(0, rows.length).sort((a, b) => a - b);

    rows
      .sort((a, b) => a - b)
      .forEach((row, i) => {
        grid[row][c] = selected[i];
      });
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
  padding: "12px",
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

/* =========================================================
   CREATE GAME
========================================================= */

function CreateGamePage({ onGameCreated }) {
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

  function addCustomPrize() {
    const name = customPrize.trim();

    if (!name) return;

    setPrizes(current => [
      ...current,
      { name, amount: "" }
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
      let gameCode = generateGameCode();

      while (true) {
        const { data, error } =
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", gameCode)
            .limit(1);

        if (error) throw error;

        if (!data?.length) break;

        gameCode = generateGameCode();
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
          gameName.trim() || DEFAULT_GAME_NAME,
        status: "upcoming",
        ticket_limit: Number(ticketLimit),
        ticket_price: Number(ticketPrice),
        call_interval_seconds: 5,
        game_date: gameDate || null,
        game_time: gameTime || null,
        theme,
        game_code: gameCode,
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
      onGameCreated(data);

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
      <div style={{ maxWidth: 760, margin: "auto" }}>

        <div style={{
          textAlign: "center",
          marginBottom: 25
        }}>
          <h1>TAMBOLA LIVE</h1>
          <p style={{ color: "#64748b" }}>
            Host Create Game
          </p>
        </div>

        <form onSubmit={createGame}>

          <section style={cardStyle}>
            <h2>Create New Game</h2>

            <label>
              <b>Game Name</b>
            </label>

            <input
              value={gameName}
              onChange={e =>
                setGameName(e.target.value)
              }
              style={{ ...inputStyle, marginTop: 7 }}
            />

            <div style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(210px,1fr))",
              gap: 14,
              marginTop: 16
            }}>

              <div>
                <b>Date</b>
                <input
                  type="date"
                  required
                  value={gameDate}
                  onChange={e =>
                    setGameDate(e.target.value)
                  }
                  style={{ ...inputStyle, marginTop: 7 }}
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
                  style={{ ...inputStyle, marginTop: 7 }}
                />
              </div>

              <div>
                <b>Ticket Limit</b>
                <input
                  type="number"
                  min="1"
                  value={ticketLimit}
                  onChange={e =>
                    setTicketLimit(e.target.value)
                  }
                  style={{ ...inputStyle, marginTop: 7 }}
                />
              </div>

              <div>
                <b>Ticket Price</b>
                <input
                  type="number"
                  min="0"
                  value={ticketPrice}
                  onChange={e =>
                    setTicketPrice(e.target.value)
                  }
                  style={{ ...inputStyle, marginTop: 7 }}
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
                style={{ ...inputStyle, marginTop: 7 }}
              >
                {THEMES.map(t => (
                  <option key={t}>{t}</option>
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

            <div style={{
              display: "flex",
              gap: 8,
              marginTop: 15
            }}>
              <input
                placeholder="Customize prize"
                value={customPrize}
                onChange={e =>
                  setCustomPrize(e.target.value)
                }
                style={inputStyle}
              />

              <button
                type="button"
                onClick={addCustomPrize}
                style={secondaryButton}
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <section style={{
              ...cardStyle,
              background: "#fef2f2",
              color: "#b91c1c"
            }}>
              <b>Could not create game</b>
              <p>{error}</p>
            </section>
          )}

          <button
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

/* =========================================================
   HOST CONTROL CENTRE
========================================================= */

function HostControlPage({ game, onNewGame }) {
  const [bookings, setBookings] =
    useState([]);

  const [loadingBookings, setLoadingBookings] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  const prizes =
    Array.isArray(game.selected_prizes)
      ? game.selected_prizes
      : [];

  async function loadBookings() {
    setLoadingBookings(true);

    try {
      const { data, error } =
        await supabase
          .from("booking_requests")
          .select("*")
          .eq("game_id", game.id)
          .order("created_at", {
            ascending: false
          });

      if (error) throw error;

      setBookings(data || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [game.id]);

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setMessage("Game link copied!");
    setTimeout(() => setMessage(""), 2000);
  }

  async function shareGame() {
    const text =
`🎟️ ${game.game_name}

📅 ${game.game_date || "-"}
⏰ ${game.game_time || "-"}
🎫 Ticket: ₹${game.ticket_price || 0}

Join here:
${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: game.game_name,
          text
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setMessage("Game details copied!");
      setTimeout(() => setMessage(""), 2000);
    }
  }

  async function updateBooking(id, status) {
    const { error } =
      await supabase
        .from("booking_requests")
        .update({ status })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadBookings();
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 850, margin: "auto" }}>

        <div style={{
          textAlign: "center",
          marginBottom: 20
        }}>
          <h1>{game.game_name}</h1>

          <p style={{ color: "#64748b" }}>
            Host Control Centre
          </p>

          <div style={{
            fontSize: 28,
            fontWeight: "bold"
          }}>
            {game.game_code}
          </div>
        </div>

        <section style={cardStyle}>
          <h2>Game Details</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(170px,1fr))",
            gap: 10
          }}>
            <InfoBox
              title="Game Name"
              value={game.game_name}
            />

            <InfoBox
              title="Date"
              value={game.game_date || "-"}
            />

            <InfoBox
              title="Time"
              value={game.game_time || "-"}
            />

            <InfoBox
              title="Status"
              value={String(
                game.status || "upcoming"
              ).toUpperCase()}
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${game.ticket_price || 0}`}
            />

            <InfoBox
              title="Ticket Limit"
              value={game.ticket_limit || 0}
            />

            <InfoBox
              title="Theme"
              value={game.theme || "-"}
            />

            <InfoBox
              title="Call Interval"
              value={`${game.call_interval_seconds || 5}s`}
            />
          </div>
        </section>

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

          <button
            onClick={copyLink}
            style={secondaryButton}
          >
            Copy Link
          </button>

          <button
            onClick={shareGame}
            style={{
              ...primaryButton,
              marginLeft: 8
            }}
          >
            Share Game
          </button>

          {message && (
            <p style={{
              color: "#16a34a",
              fontWeight: "bold"
            }}>
              {message}
            </p>
          )}
        </section>

        <section style={cardStyle}>
          <h2>Ticket Bookings</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3,1fr)",
            gap: 8
          }}>
            <StatusBox
              title="Pending"
              value={bookings.filter(
                b => b.status === "pending"
              ).length}
            />

            <StatusBox
              title="Approved"
              value={bookings.filter(
                b => b.status === "approved"
              ).length}
            />

            <StatusBox
              title="Rejected"
              value={bookings.filter(
                b => b.status === "rejected"
              ).length}
            />
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Player Requests</h2>

          {loadingBookings ? (
            <p>Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No ticket booking requests yet.
            </p>
          ) : (
            bookings.map(booking => (
              <div
                key={booking.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 15,
                  marginBottom: 12
                }}
              >
                <b>
                  {booking.player_name ||
                    "Player"}
                </b>

                <p>
                  Tickets:{" "}
                  <b>
                    {Array.isArray(
                      booking.ticket_numbers
                    )
                      ? booking.ticket_numbers
                          .map(n => `#${n}`)
                          .join(", ")
                      : booking.ticket_number
                        ? `#${booking.ticket_number}`
                        : "-"}
                  </b>
                </p>

                <p>
                  Status:{" "}
                  <b>
                    {String(
                      booking.status ||
                        "pending"
                    ).toUpperCase()}
                  </b>
                </p>

                {booking.status ===
                  "pending" && (
                  <div style={{
                    display: "flex",
                    gap: 8
                  }}>
                    <button
                      onClick={() =>
                        updateBooking(
                          booking.id,
                          "approved"
                        )
                      }
                      style={primaryButton}
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        updateBooking(
                          booking.id,
                          "rejected"
                        )
                      }
                      style={secondaryButton}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        <section style={cardStyle}>
          <h2>Prizes</h2>

          {prizes.length === 0 ? (
            <p>No prizes selected.</p>
          ) : (
            prizes.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  padding: "10px 0",
                  borderBottom:
                    "1px solid #e5e7eb"
                }}
              >
                <b>{p.name}</b>
                <span>₹{p.amount}</span>
              </div>
            ))
          )}
        </section>

        <section style={cardStyle}>
          <h2>Game Control</h2>

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
              marginLeft: 8,
              opacity: .5
            }}
          >
            END GAME
          </button>
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

/* =========================================================
   PLAYER BOOKING PAGE
========================================================= */

function PlayerBookingPage({ game }) {
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

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
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
  }, [game.game_code, limit]);

  function toggleTicket(number) {
    setSelected(current =>
      current.includes(number)
        ? current.filter(n => n !== number)
        : [...current, number].sort(
            (a, b) => a - b
          )
    );
  }

  async function bookTickets() {
    if (!playerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!selected.length) {
      setError(
        "Please select at least one ticket."
      );
      return;
    }

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      /*
        ONE booking request.
        All selected ticket numbers
        are stored together.
      */

      const { error } =
        await supabase
          .from("booking_requests")
          .insert({
            game_id: game.id,
            player_name:
              playerName.trim(),
            ticket_numbers:
              selected,
            status: "pending"
          });

      if (error) throw error;

      setSuccess(
        `Booking request sent for ${selected.length} ticket${
          selected.length > 1 ? "s" : ""
        }: ${selected
          .map(n => `#${n}`)
          .join(", ")}`
      );

      setSelected([]);

    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
        "Could not send booking request."
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={{
        maxWidth: 900,
        margin: "auto"
      }}>

        <div style={{
          textAlign: "center",
          marginBottom: 20
        }}>
          <h1>TAMBOLA LIVE</h1>

          <p style={{
            color: "#64748b"
          }}>
            Player Booking
          </p>
        </div>

        <section style={cardStyle}>
          <h2>{game.game_name}</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(170px,1fr))",
            gap: 10
          }}>
            <InfoBox
              title="Game Code"
              value={game.game_code}
            />

            <InfoBox
              title="Date"
              value={game.game_date || "-"}
            />

            <InfoBox
              title="Time"
              value={game.game_time || "-"}
            />

            <InfoBox
              title="Ticket Price"
              value={`₹${game.ticket_price || 0}`}
            />

            <InfoBox
              title="Status"
              value={String(
                game.status || "upcoming"
              ).toUpperCase()}
            />
          </div>
        </section>

        {/* =================================================
            ALL TICKET NUMBERS
        ================================================= */}

        <section style={cardStyle}>
          <h2>Select Tickets</h2>

          <p style={{
            color: "#64748b"
          }}>
            You can select multiple tickets.
            Selected tickets are highlighted.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5,1fr)",
            gap: 9
          }}>
            {tickets.map(ticket => {
              const isSelected =
                selected.includes(
                  ticket.number
                );

              return (
                <button
                  key={ticket.number}
                  onClick={() =>
                    toggleTicket(
                      ticket.number
                    )
                  }
                  style={{
                    padding: "13px 5px",
                    borderRadius: 9,
                    border:
                      isSelected
                        ? "2px solid #2563eb"
                        : "1px solid #cbd5e1",
                    background:
                      isSelected
                        ? "#2563eb"
                        : "#fff",
                    color:
                      isSelected
                        ? "#fff"
                        : "#111827",
                    fontWeight: "bold",
                    fontSize: 15
                  }}
                >
                  #{ticket.number}
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================
            SELECTED TICKETS
        ================================================= */}

        {selected.length > 0 && (
          <section style={cardStyle}>
            <h2>
              Selected Tickets (
              {selected.length})
            </h2>

            {selected.map(number => {
              const ticket =
                tickets[number - 1];

              return (
                <TicketCard
                  key={number}
                  number={number}
                  grid={ticket.grid}
                  selected
                  onRemove={() =>
                    toggleTicket(number)
                  }
                />
              );
            })}
          </section>
        )}

        {/* =================================================
            PLAYER DETAILS
        ================================================= */}

        <section style={cardStyle}>
          <h2>Booking Details</h2>

          <label>
            <b>Player Name</b>
          </label>

          <input
            value={playerName}
            onChange={e =>
              setPlayerName(e.target.value)
            }
            placeholder="Enter your name"
            style={{
              ...inputStyle,
              marginTop: 8
            }}
          />

          {selected.length > 0 && (
            <p>
              Selected:{" "}
              <b>
                {selected
                  .map(n => `#${n}`)
                  .join(", ")}
              </b>
            </p>
          )}

          {error && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 9,
              background: "#fef2f2",
              color: "#b91c1c"
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 9,
              background: "#ecfdf5",
              color: "#047857",
              fontWeight: "bold"
            }}>
              {success}
            </div>
          )}

          <button
            onClick={bookTickets}
            disabled={
              booking ||
              selected.length === 0
            }
            style={{
              ...primaryButton,
              width: "100%",
              marginTop: 15,
              fontSize: 17,
              opacity:
                booking ||
                selected.length === 0
                  ? .55
                  : 1
            }}
          >
            {booking
              ? "SENDING REQUEST..."
              : "BOOK SELECTED TICKETS"}
          </button>

          <p style={{
            color: "#64748b",
            fontSize: 13,
            textAlign: "center"
          }}>
            Your booking will remain
            pending until the host approves it.
          </p>
        </section>

      </div>
    </main>
  );
}

/* =========================================================
   TICKET CARD
========================================================= */

function TicketCard({
  number,
  grid,
  selected,
  onRemove
}) {
  return (
    <div style={{
      border: selected
        ? "3px solid #2563eb"
        : "1px solid #cbd5e1",
      borderRadius: 14,
      padding: 15,
      marginBottom: 16,
      background: "#fff"
    }}>

      <div style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems: "center",
        marginBottom: 12
      }}>
        <h2 style={{ margin: 0 }}>
          Ticket #{number}
        </h2>

        <button
          onClick={onRemove}
          style={{
            ...secondaryButton,
            color: "#2563eb"
          }}
        >
          Selected ✓
        </button>
      </div>

      <TambolaGrid grid={grid} />
    </div>
  );
}

/* =========================================================
   3x9 TAMBOLA GRID
========================================================= */

function TambolaGrid({ grid }) {
  return (
    <div style={{
      border: "2px solid #111827",
      borderRadius: 8,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns:
        "repeat(9,1fr)",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {grid.flatMap((row, r) =>
        row.map((value, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRight:
                c === 8
                  ? "none"
                  : "1px solid #94a3b8",
              borderBottom:
                r === 2
                  ? "none"
                  : "1px solid #94a3b8",
              background:
                value
                  ? "#fff"
                  : "#f1f5f9",
              fontWeight: "bold",
              fontSize: 18
            }}
          >
            {value || ""}
          </div>
        ))
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function InfoBox({ title, value }) {
  return (
    <div style={{
      padding: 14,
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      background: "#f8fafc"
    }}>
      <div style={{
        color: "#64748b",
        fontSize: 13,
        marginBottom: 5
      }}>
        {title}
      </div>

      <b>{value}</b>
    </div>
  );
}

function StatusBox({ title, value }) {
  return (
    <div style={{
      padding: 14,
      textAlign: "center",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      background: "#f8fafc"
    }}>
      <div style={{
        color: "#64748b",
        fontSize: 13
      }}>
        {title}
      </div>

      <div style={{
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 5
      }}>
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   APP ROUTING
========================================================= */

function App() {
  const [hostGame, setHostGame] =
    useState(null);

  const [playerGame, setPlayerGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function start() {
      /*
        IMPORTANT:
        Check ?game FIRST.

        This prevents a player link from
        opening the host dashboard because
        a host game exists in localStorage.
      */

      const code =
        getGameCodeFromUrl();

      if (code) {
        try {
          const { data, error } =
            await supabase
              .from("games")
              .select("*")
              .eq(
                "game_code",
                code.toUpperCase()
              )
              .maybeSingle();

          if (error) throw error;

          if (!data) {
            setError(
              "Game not found."
            );
          } else {
            setPlayerGame(data);
          }

        } catch (err) {
          console.error(err);
          setError(
            "Could not load this game."
          );
        }

        setLoading(false);
        return;
      }

      /*
        No ?game= means this is the
        host side.
      */

      const saved =
        loadHostGame();

      if (saved) {
        setHostGame(saved);
      }

      setLoading(false);
    }

    start();
  }, []);

  function handleGameCreated(game) {
    saveHostGame(game);
    setHostGame(game);
  }

  function handleNewGame() {
    saveHostGame(null);
    setHostGame(null);

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  if (loading) {
    return (
      <main style={{
        ...pageStyle,
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <h2>Loading...</h2>
      </main>
    );
  }

  /*
    PLAYER HAS PRIORITY WHEN ?game EXISTS
  */

  if (getGameCodeFromUrl()) {
    if (error) {
      return (
        <main style={pageStyle}>
          <div style={{
            ...cardStyle,
            maxWidth: 600,
            margin: "50px auto",
            textAlign: "center"
          }}>
            <h2>Game Not Found</h2>
            <p>{error}</p>
          </div>
        </main>
      );
    }

    if (!playerGame) {
      return (
        <main style={pageStyle}>
          <div style={{
            ...cardStyle,
            maxWidth: 600,
            margin: "50px auto",
            textAlign: "center"
          }}>
            <h2>Loading Game...</h2>
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
    HOST SIDE
  */

  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={handleNewGame}
      />
    );
  }

  return (
    <CreateGamePage
      onGameCreated={
        handleGameCreated
      }
    />
  );
}

/* =========================================================
   START APP
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App />
);
