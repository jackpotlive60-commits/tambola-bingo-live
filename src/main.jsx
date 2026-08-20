import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

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
].map(name => ({ name, amount: "" }));

const page = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 20,
  boxSizing: "border-box",
  fontFamily: "Arial, sans-serif"
};

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 2px 8px rgba(0,0,0,.05)"
};

const input = {
  width: "100%",
  padding: 11,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxSizing: "border-box",
  fontSize: 15
};

const primary = {
  padding: "12px 20px",
  border: 0,
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer"
};

const secondary = {
  padding: "10px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  fontWeight: "bold",
  cursor: "pointer"
};

/* ================= HELPERS ================= */

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function saveHostGame(game) {
  localStorage.setItem(GAME_KEY, JSON.stringify(game));
}

function loadHostGame() {
  try {
    const x = JSON.parse(localStorage.getItem(GAME_KEY));
    return x?.game_code ? x : null;
  } catch {
    return null;
  }
}

function getGameCode() {
  return new URLSearchParams(window.location.search).get("game");
}

/* ================= TAMBOLA TICKET ================= */

function random(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function makeTicket(ticketNumber) {
  const patterns = [
    [
      [0,1,3,5,7],
      [0,2,4,6,8],
      [1,2,3,4,6]
    ],
    [
      [0,2,4,6,8],
      [1,3,4,5,7],
      [0,1,2,5,7]
    ],
    [
      [0,1,4,6,8],
      [0,2,3,5,7],
      [1,2,4,5,6]
    ]
  ];

  const rows =
    patterns[ticketNumber % patterns.length];

  const grid = Array.from(
    { length: 3 },
    () => Array(9).fill(null)
  );

  for (let col = 0; col < 9; col++) {
    const rowIndexes = rows
      .map((r, i) => r.includes(col) ? i : null)
      .filter(x => x !== null);

    let min = col === 0 ? 1 : col * 10;
    let max = col === 8 ? 90 : col * 10 + 9;

    let nums = [];

    for (let n = min; n <= max; n++) nums.push(n);

    nums.sort(
      () => random(ticketNumber * 100 + col + Math.random()) - 0.5
    );

    nums = nums.slice(0, rowIndexes.length);
    nums.sort((a, b) => a - b);

    rowIndexes.forEach((row, i) => {
      grid[row][col] = nums[i];
    });
  }

  return grid;
}

async function ensureTickets(gameId) {
  const { data, error } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("game_id", gameId);

  if (error) throw error;

  const existing = new Set(
    (data || []).map(x => x.ticket_number)
  );

  const missing = [];

  for (let i = 1; i <= 100; i++) {
    if (!existing.has(i)) {
      missing.push({
        game_id: gameId,
        ticket_number: i,
        ticket_data: makeTicket(i),
        status: "available"
      });
    }
  }

  if (missing.length) {
    await supabase
      .from("tickets")
      .upsert(missing, {
        onConflict: "game_id,ticket_number",
        ignoreDuplicates: true
      });
  }
}

/* ================= CREATE GAME ================= */

function CreateGamePage({ onCreated }) {
  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME);
  const [gameDate, setGameDate] = useState("");
  const [gameTime, setGameTime] = useState("");
  const [ticketLimit, setTicketLimit] = useState(100);
  const [ticketPrice, setTicketPrice] = useState(20);
  const [theme, setTheme] = useState("Classic");
  const [prizes, setPrizes] = useState(DEFAULT_PRIZES);
  const [customPrize, setCustomPrize] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  function updatePrize(i, amount) {
    setPrizes(p =>
      p.map((x, n) =>
        n === i ? { ...x, amount } : x
      )
    );
  }

  function addPrize() {
    const name = customPrize.trim();
    if (!name) return;

    setPrizes(p => [...p, { name, amount: "" }]);
    setCustomPrize("");
  }

  async function createGame(e) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      let code = generateGameCode();

      const { data: found } = await supabase
        .from("games")
        .select("id")
        .eq("game_code", code)
        .limit(1);

      if (found?.length) code = generateGameCode();

      const selectedPrizes = prizes
        .filter(p => p.amount !== "")
        .map(p => ({
          name: p.name,
          amount: Number(p.amount)
        }));

      const newGame = {
        host_name: "Host",
        game_name: gameName.trim() || DEFAULT_GAME_NAME,
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

      const { data, error } = await supabase
        .from("games")
        .insert(newGame)
        .select()
        .single();

      if (error) throw error;

      saveHostGame(data);
      onCreated(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not create game.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={page}>
      <div style={{ maxWidth: 760, margin: "auto" }}>
        <h1 style={{ textAlign: "center" }}>TAMBOLA LIVE</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>
          Host Dashboard
        </p>

        <form onSubmit={createGame}>
          <section style={card}>
            <h2>Create New Game</h2>

            <label><b>Game Name</b></label>
            <input
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              style={{ ...input, margin: "7px 0 15px" }}
            />

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 12
            }}>
              <div>
                <b>Date</b>
                <input
                  type="date"
                  value={gameDate}
                  onChange={e => setGameDate(e.target.value)}
                  required
                  style={{ ...input, marginTop: 7 }}
                />
              </div>

              <div>
                <b>Time</b>
                <input
                  type="time"
                  value={gameTime}
                  onChange={e => setGameTime(e.target.value)}
                  required
                  style={{ ...input, marginTop: 7 }}
                />
              </div>

              <div>
                <b>Ticket Limit</b>
                <input
                  type="number"
                  min="1"
                  value={ticketLimit}
                  onChange={e => setTicketLimit(e.target.value)}
                  style={{ ...input, marginTop: 7 }}
                />
              </div>

              <div>
                <b>Ticket Price</b>
                <input
                  type="number"
                  min="0"
                  value={ticketPrice}
                  onChange={e => setTicketPrice(e.target.value)}
                  style={{ ...input, marginTop: 7 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 15 }}>
              <b>Game Theme</b>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                style={{ ...input, marginTop: 7 }}
              >
                {THEMES.map(x => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
          </section>

          <section style={card}>
            <h2>Prizes</h2>

            {prizes.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 130px",
                  gap: 10,
                  marginBottom: 10,
                  alignItems: "center"
                }}
              >
                <b>{p.name}</b>
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={p.amount}
                  onChange={e => updatePrize(i, e.target.value)}
                  style={input}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Customize prize"
                value={customPrize}
                onChange={e => setCustomPrize(e.target.value)}
                style={{ ...input, flex: 1 }}
              />
              <button type="button" onClick={addPrize} style={secondary}>
                + Add
              </button>
            </div>
          </section>

          {error && (
            <div style={{ ...card, color: "#b91c1c" }}>
              {error}
            </div>
          )}

          <button
            disabled={creating}
            style={{ ...primary, width: "100%" }}
          >
            {creating ? "Creating..." : "CREATE GAME"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* ================= HOST PAGE ================= */

function HostControlPage({ game, onNewGame }) {
  const [status, setStatus] = useState(game.status);

  const url =
    `${window.location.origin}/?game=${game.game_code}`;

  const prizes = Array.isArray(game.selected_prizes)
    ? game.selected_prizes
    : [];

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    alert("Game link copied!");
  }

  async function shareGame() {
    const message =
`🎟️ ${game.game_name}

📅 ${game.game_date || "-"}
⏰ ${game.game_time || "-"}
🎫 Ticket Price: ₹${game.ticket_price}

🏆 Prizes
${prizes.map(p => `${p.name}: ₹${p.amount}`).join("\n")}

Join Game:
${url}`;

    if (navigator.share) {
      await navigator.share({
        title: game.game_name,
        text: message,
        url
      });
    } else {
      await navigator.clipboard.writeText(message);
      alert("Game details copied!");
    }
  }

  async function startGame() {
    const { data, error } = await supabase
      .from("games")
      .update({
        status: "live",
        started_at: new Date().toISOString()
      })
      .eq("id", game.id)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setStatus(data.status);
    saveHostGame(data);
  }

  async function endGame() {
    const { data, error } = await supabase
      .from("games")
      .update({
        status: "ended",
        ended_at: new Date().toISOString()
      })
      .eq("id", game.id)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setStatus(data.status);
    saveHostGame(data);
  }

  return (
    <main style={page}>
      <div style={{ maxWidth: 760, margin: "auto" }}>
        <h1>{game.game_name}</h1>
        <p style={{ color: "#64748b" }}>Host Control Page</p>

        <section style={card}>
          <h2>Game Details</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 10
          }}>
            <Info title="Date" value={game.game_date || "-"} />
            <Info title="Time" value={game.game_time || "-"} />
            <Info title="Ticket Price" value={`₹${game.ticket_price}`} />
            <Info title="Ticket Limit" value={game.ticket_limit} />
          </div>

          <div style={{
            marginTop: 15,
            padding: 15,
            borderRadius: 10,
            background: status === "live" ? "#dcfce7" : "#fff7ed"
          }}>
            <b>Status</b>
            <div style={{ fontSize: 20, fontWeight: "bold" }}>
              {String(status).toUpperCase()}
            </div>
          </div>
        </section>

        <section style={card}>
          <h2>Share Game</h2>

          <input
            readOnly
            value={url}
            style={{ ...input, marginBottom: 10 }}
          />

          <button onClick={copyLink} style={secondary}>
            Copy Link
          </button>

          <button
            onClick={shareGame}
            style={{ ...primary, marginLeft: 8 }}
          >
            Share Game
          </button>
        </section>

        <section style={card}>
          <h2>Game Control</h2>

          <button
            onClick={startGame}
            disabled={status !== "upcoming"}
            style={{
              ...primary,
              opacity: status !== "upcoming" ? .5 : 1
            }}
          >
            START GAME
          </button>

          <button
            onClick={endGame}
            disabled={status !== "live"}
            style={{
              ...secondary,
              marginLeft: 8,
              opacity: status !== "live" ? .5 : 1
            }}
          >
            END GAME
          </button>
        </section>

        <section style={card}>
          <h2>Prizes</h2>

          {prizes.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
                borderBottom: "1px solid #eee"
              }}
            >
              <b>{p.name}</b>
              <span>₹{p.amount}</span>
            </div>
          ))}
        </section>

        <button onClick={onNewGame} style={{ ...secondary, width: "100%" }}>
          Create Another Game
        </button>
      </div>
    </main>
  );
}

/* ================= PLAYER PAGE ================= */

function PlayerPage() {
  const code = getGameCode();

  const [game, setGame] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data: gameData, error: gameError } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", code)
          .single();

      if (gameError) throw gameError;

      setGame(gameData);

      await ensureTickets(gameData.id);

      const { data: ticketData, error: ticketError } =
        await supabase
          .from("tickets")
          .select("*")
          .eq("game_id", gameData.id)
          .order("ticket_number");

      if (ticketError) throw ticketError;

      setTickets(ticketData || []);
    } catch (err) {
      console.error(err);
      setError("Could not load this game.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 4000);

    return () => clearInterval(timer);
  }, [code]);

  function toggleTicket(ticket) {
    if (game?.status !== "upcoming") return;
    if (ticket.status !== "available") return;

    setSelected(current =>
      current.includes(ticket.ticket_number)
        ? current.filter(x => x !== ticket.ticket_number)
        : [...current, ticket.ticket_number]
    );
  }

  async function bookTickets() {
    if (!selected.length) {
      alert("Please select at least one ticket.");
      return;
    }

    if (!playerName.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (game?.status !== "upcoming") {
      alert("Booking is closed. The game has started.");
      return;
    }

    setBooking(true);

    try {
      /*
        Check the current game status again
        immediately before booking.
      */
      const { data: freshGame, error: gameError } =
        await supabase
          .from("games")
          .select("status,game_name,game_code")
          .eq("id", game.id)
          .single();

      if (gameError) throw gameError;

      if (freshGame.status !== "upcoming") {
        alert("Booking is closed. The game has started.");
        await load();
        return;
      }

      const { data, error } = await supabase
        .from("tickets")
        .update({
          status: "pending",
          player_name: playerName.trim(),
          booked_at: new Date().toISOString()
        })
        .eq("game_id", game.id)
        .eq("status", "available")
        .in("ticket_number", selected)
        .select();

      if (error) throw error;

      if (!data || data.length !== selected.length) {
        alert("One or more selected tickets were already taken.");
        setSelected([]);
        await load();
        return;
      }

      const numbers = data
        .map(x => `#${x.ticket_number}`)
        .join(", ");

      const message =
`🎟️ TambolaLive Booking

Game: ${game.game_name}
Player: ${playerName.trim()}
Tickets: ${numbers}

Please approve my ticket booking.

Game Code: ${game.game_code}`;

      setSelected([]);

      await load();

      if (navigator.share) {
        try {
          await navigator.share({
            title: "TambolaLive Booking",
            text: message
          });
        } catch {}
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          "_blank"
        );
      }

      alert("Booking sent for host approval.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not book tickets.");
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main style={{
        ...page,
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <h2>Loading game...</h2>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main style={page}>
        <div style={{ ...card, maxWidth: 600, margin: "50px auto" }}>
          <h2>Game not found</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  const closed = game.status !== "upcoming";

  return (
    <main style={page}>
      <div style={{ maxWidth: 900, margin: "auto" }}>

        <div style={{ textAlign: "center" }}>
          <h1>TAMBOLA LIVE</h1>
          <p style={{ color: "#64748b" }}>
            Player Booking
          </p>
        </div>

        <section style={card}>
          <h2>{game.game_name}</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 10
          }}>
            <Info title="Game Code" value={game.game_code} />
            <Info title="Date" value={game.game_date || "-"} />
            <Info title="Time" value={game.game_time || "-"} />
            <Info title="Ticket Price" value={`₹${game.ticket_price}`} />
          </div>

          <div style={{
            marginTop: 15,
            padding: 15,
            borderRadius: 10,
            background: closed ? "#fee2e2" : "#dcfce7"
          }}>
            <b>Game Status</b>
            <div style={{
              fontSize: 20,
              fontWeight: "bold",
              marginTop: 4
            }}>
              {closed
                ? game.status === "live"
                  ? "LIVE — BOOKING CLOSED"
                  : "GAME ENDED"
                : "UPCOMING — BOOKING OPEN"}
            </div>
          </div>
        </section>

        {!closed && (
          <section style={card}>
            <div style={{
              display: "flex",
              gap: 15,
              flexWrap: "wrap",
              fontWeight: "bold"
            }}>
              <span>🟢 Available</span>
              <span>🟠 Pending</span>
              <span>🔴 Booked</span>
            </div>
          </section>
        )}

        <section style={card}>
          <h2>Choose Your Tickets</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(260px,1fr))",
            gap: 15
          }}>
            {tickets.map(ticket => {
              const isSelected =
                selected.includes(ticket.ticket_number);

              const status = ticket.status;

              return (
                <div
                  key={ticket.ticket_number}
                  onClick={() => toggleTicket(ticket)}
                  style={{
                    border: isSelected
                      ? "3px solid #2563eb"
                      : "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: 8,
                    cursor:
                      !closed && status === "available"
                        ? "pointer"
                        : "default",
                    opacity:
                      status === "booked" ? .55 : 1,
                    background:
                      status === "pending"
                        ? "#fff7ed"
                        : status === "booked"
                        ? "#fee2e2"
                        : isSelected
                        ? "#eff6ff"
                        : "#fff"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 7
                  }}>
                    <b>Ticket #{ticket.ticket_number}</b>

                    <span style={{
                      fontSize: 12,
                      fontWeight: "bold"
                    }}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(9,1fr)",
                    border: "1px solid #111"
                  }}>
                    {ticket.ticket_data.map(
                      (row, r) =>
                        row.map((num, c) => (
                          <div
                            key={`${r}-${c}`}
                            style={{
                              height: 30,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRight: "1px solid #999",
                              borderBottom: "1px solid #999",
                              fontSize: 13,
                              fontWeight: num ? "bold" : "normal",
                              background: num ? "#fff" : "#f8fafc"
                            }}
                          >
                            {num || ""}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={card}>
          <h2>Book Selected Tickets</h2>

          <p>
            Selected tickets: <b>{selected.length}</b>
          </p>

          <input
            placeholder="Enter your name"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            disabled={closed}
            style={{
              ...input,
              marginBottom: 10
            }}
          />

          <button
            onClick={bookTickets}
            disabled={closed || booking || !selected.length}
            style={{
              ...primary,
              width: "100%",
              opacity:
                closed || booking || !selected.length
                  ? .5
                  : 1
            }}
          >
            {booking
              ? "BOOKING..."
              : "BOOK SELECTED TICKETS"}
          </button>

          {!closed && (
            <p style={{
              color: "#64748b",
              fontSize: 13
            }}>
              After booking, your tickets will remain
              <b> Pending</b> until the host approves them.
            </p>
          )}
        </section>

      </div>
    </main>
  );
}

/* ================= SMALL COMPONENT ================= */

function Info({ title, value }) {
  return (
    <div style={{
      padding: 12,
      background: "#f8fafc",
      borderRadius: 8,
      border: "1px solid #e5e7eb"
    }}>
      <div style={{
        fontSize: 12,
        color: "#64748b"
      }}>
        {title}
      </div>
      <b>{value}</b>
    </div>
  );
}

/* ================= APP ================= */

function App() {
  const [hostGame, setHostGame] = useState(null);
  const [loading, setLoading] = useState(true);

  const playerMode = !!getGameCode();

  useEffect(() => {
    if (!playerMode) {
      setHostGame(loadHostGame());
    }

    setLoading(false);
  }, [playerMode]);

  if (loading) {
    return <main style={page}><h2>Loading...</h2></main>;
  }

  /*
    IMPORTANT:
    A ?game=XXXX URL always opens
    the PLAYER page, never the host page.
  */
  if (playerMode) {
    return <PlayerPage />;
  }

  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={() => {
          localStorage.removeItem(GAME_KEY);
          setHostGame(null);
        }}
      />
    );
  }

  return (
    <CreateGamePage
      onCreated={setHostGame}
    />
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
