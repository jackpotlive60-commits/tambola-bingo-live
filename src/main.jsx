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
].map((name) => ({ name, amount: "" }));

/* =========================================================
   HELPERS
========================================================= */

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function getGameCodeFromUrl() {
  return new URLSearchParams(window.location.search).get("game");
}

function makeTicket(number) {
  /*
    Deterministic 3x9 ticket.
    Same ticket number always produces
    the same ticket on the player page.
  */

  const seed = number * 7919;

  const nums = [];

  for (let i = 1; i <= 90; i++) nums.push(i);

  let value = seed;

  function random() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  }

  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  const columns = Array.from({ length: 9 }, () => []);

  for (const n of nums) {
    const col = Math.min(8, Math.floor(n / 10));
    if (columns[col].length < 3) columns[col].push(n);
  }

  const ticket = Array.from({ length: 3 }, () =>
    Array(9).fill(null)
  );

  for (let c = 0; c < 9; c++) {
    const col = columns[c].slice(0, 3);

    col.forEach((n, r) => {
      ticket[r][c] = n;
    });
  }

  /* Ensure each row has 5 numbers */
  for (let r = 0; r < 3; r++) {
    let count = ticket[r].filter(Boolean).length;

    while (count < 5) {
      const empty = [];

      for (let c = 0; c < 9; c++) {
        if (!ticket[r][c]) empty.push(c);
      }

      if (!empty.length) break;

      const c =
        empty[Math.floor(random() * empty.length)];

      const min = c * 10 + (c === 0 ? 1 : 0);
      const max = c === 8 ? 90 : c * 10 + 9;

      let n = min + Math.floor(random() * (max - min + 1));

      if (
        ticket.some((row) => row.includes(n))
      ) {
        continue;
      }

      ticket[r][c] = n;
      count++;
    }
  }

  return ticket;
}

/* =========================================================
   STYLES
========================================================= */

const page = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 18,
  boxSizing: "border-box",
  fontFamily: "Arial, Helvetica, sans-serif"
};

const wrap = {
  maxWidth: 900,
  margin: "0 auto"
};

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 3px 12px rgba(0,0,0,.05)"
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  fontSize: 16
};

const blueButton = {
  border: 0,
  borderRadius: 9,
  padding: "12px 18px",
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 15,
  cursor: "pointer"
};

const whiteButton = {
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "11px 17px",
  background: "#fff",
  color: "#111827",
  fontWeight: "bold",
  fontSize: 14,
  cursor: "pointer"
};

/* =========================================================
   CREATE GAME
========================================================= */

function CreateGamePage({ onCreated }) {
  const [gameName, setGameName] =
    useState(DEFAULT_GAME_NAME);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [limit, setLimit] = useState(100);
  const [price, setPrice] = useState(20);
  const [theme, setTheme] = useState("Classic");

  const [prizes, setPrizes] =
    useState(DEFAULT_PRIZES);

  const [customPrize, setCustomPrize] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] = useState("");

  function updatePrize(i, amount) {
    setPrizes((old) =>
      old.map((p, index) =>
        index === i ? { ...p, amount } : p
      )
    );
  }

  function addPrize() {
    const name = customPrize.trim();

    if (!name) return;

    setPrizes((old) => [
      ...old,
      { name, amount: "" }
    ]);

    setCustomPrize("");
  }

  function removePrize(i) {
    setPrizes((old) =>
      old.filter((_, index) => index !== i)
    );
  }

  async function createGame(e) {
    e.preventDefault();

    if (creating) return;

    setCreating(true);
    setError("");

    try {
      let code = generateGameCode();

      for (;;) {
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
            p.amount !== null &&
            p.amount !== undefined
        )
        .map((p) => ({
          name: p.name,
          amount: Number(p.amount)
        }));

      const newGame = {
        host_name: "Host",
        game_name:
          gameName.trim() || DEFAULT_GAME_NAME,
        status: "upcoming",
        ticket_limit: Number(limit),
        ticket_price: Number(price),
        call_interval_seconds: 5,
        game_date: date || null,
        game_time: time || null,
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
    <main style={page}>
      <div style={wrap}>
        <header
          style={{
            textAlign: "center",
            marginBottom: 25
          }}
        >
          <h1>TAMBOLA LIVE</h1>
          <p style={{ color: "#64748b" }}>
            Host Create Game
          </p>
        </header>

        <form onSubmit={createGame}>
          <section style={card}>
            <h2>Create New Game</h2>

            <label>
              <b>Game Name</b>
            </label>

            <input
              value={gameName}
              onChange={(e) =>
                setGameName(e.target.value)
              }
              style={{ ...input, marginTop: 7 }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(200px,1fr))",
                gap: 14,
                marginTop: 15
              }}
            >
              <div>
                <b>Date</b>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                  style={{
                    ...input,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <b>Time</b>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) =>
                    setTime(e.target.value)
                  }
                  style={{
                    ...input,
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
                  value={limit}
                  onChange={(e) =>
                    setLimit(e.target.value)
                  }
                  style={{
                    ...input,
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
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  style={{
                    ...input,
                    marginTop: 7
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 15 }}>
              <b>Game Theme</b>

              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value)
                }
                style={{
                  ...input,
                  marginTop: 7
                }}
              >
                {THEMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </section>

          <section style={card}>
            <h2>Prizes</h2>

            {prizes.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 130px auto",
                  gap: 8,
                  marginBottom: 9,
                  alignItems: "center"
                }}
              >
                <b>{p.name}</b>

                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={p.amount}
                  onChange={(e) =>
                    updatePrize(
                      i,
                      e.target.value
                    )
                  }
                  style={input}
                />

                <button
                  type="button"
                  onClick={() =>
                    removePrize(i)
                  }
                  style={whiteButton}
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
                  setCustomPrize(
                    e.target.value
                  )
                }
                style={input}
              />

              <button
                type="button"
                onClick={addPrize}
                style={whiteButton}
              >
                + Add
              </button>
            </div>
          </section>

          {error && (
            <div
              style={{
                ...card,
                color: "#b91c1c",
                background: "#fef2f2"
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...blueButton,
              width: "100%",
              fontSize: 17,
              padding: 15,
              opacity: creating ? 0.6 : 1
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
  const [status, setStatus] =
    useState(game.status || "upcoming");

  const [copied, setCopied] =
    useState(false);

  const [called, setCalled] =
    useState(
      Array.isArray(game.called_numbers)
        ? game.called_numbers
        : []
    );

  const [current, setCurrent] =
    useState(null);

  const [bookings, setBookings] =
    useState([]);

  const prizes = Array.isArray(
    game.selected_prizes
  )
    ? game.selected_prizes
    : [];

  const invite =
    `${window.location.origin}/?game=${game.game_code}`;

  async function copyLink() {
    await navigator.clipboard.writeText(invite);
    setCopied(true);

    setTimeout(
      () => setCopied(false),
      1500
    );
  }

  async function updateStatus(next) {
    const { error } =
      await supabase
        .from("games")
        .update({ status: next })
        .eq("id", game.id);

    if (!error) setStatus(next);
  }

  async function callNumber() {
    if (status !== "live") return;

    const remaining = [];

    for (let n = 1; n <= 90; n++) {
      if (!called.includes(n)) {
        remaining.push(n);
      }
    }

    if (!remaining.length) return;

    const n =
      remaining[
        Math.floor(
          Math.random() *
            remaining.length
        )
      ];

    const next = [...called, n];

    setCalled(next);
    setCurrent(n);

    await supabase
      .from("games")
      .update({
        called_numbers: next
      })
      .eq("id", game.id);
  }

  async function loadBookings() {
    /*
      Reads bookings if the bookings table
      exists. If it is not created yet,
      the rest of the host page still works.
    */

    const { data } =
      await supabase
        .from("bookings")
        .select("*")
        .eq("game_id", game.id)
        .order("created_at", {
          ascending: false
        });

    if (data) setBookings(data);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <main style={page}>
      <div style={wrap}>
        <header
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1>{game.game_name}</h1>

          <p style={{ color: "#64748b" }}>
            Host Control Centre
          </p>

          <div
            style={{
              display: "inline-block",
              padding: "7px 13px",
              borderRadius: 20,
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: "bold"
            }}
          >
            GAME CODE: {game.game_code}
          </div>
        </header>

        <section style={card}>
          <h2>Game Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(170px,1fr))",
              gap: 10
            }}
          >
            <Info
              title="Game Name"
              value={game.game_name}
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

            <Info
              title="Ticket Limit"
              value={game.ticket_limit || 0}
            />

            <Info
              title="Theme"
              value={game.theme || "Classic"}
            />

            <Info
              title="Status"
              value={String(status).toUpperCase()}
            />
          </div>
        </section>

        <section style={card}>
          <h2>Share Game</h2>

          <input
            readOnly
            value={invite}
            style={input}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap"
            }}
          >
            <button
              onClick={copyLink}
              style={whiteButton}
            >
              {copied
                ? "✓ Copied"
                : "Copy Player Link"}
            </button>

            <button
              onClick={() =>
                navigator.share
                  ? navigator.share({
                      title:
                        game.game_name,
                      text:
                        `Join ${game.game_name}`,
                      url: invite
                    })
                  : copyLink()
              }
              style={blueButton}
            >
              Share Game
            </button>
          </div>
        </section>

        <section style={card}>
          <h2>Current Number</h2>

          <div
            style={{
              fontSize: 70,
              fontWeight: "bold",
              textAlign: "center",
              padding: 15
            }}
          >
            {current || "-"}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap"
            }}
          >
            {status !== "live" ? (
              <button
                onClick={() =>
                  updateStatus("live")
                }
                style={blueButton}
              >
                START GAME
              </button>
            ) : (
              <button
                onClick={callNumber}
                style={blueButton}
              >
                CALL NEXT NUMBER
              </button>
            )}

            <button
              onClick={() =>
                updateStatus("ended")
              }
              style={whiteButton}
            >
              END GAME
            </button>
          </div>
        </section>

        <section style={card}>
          <h2>Numbers 1–90</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(10,1fr)",
              gap: 5
            }}
          >
            {Array.from(
              { length: 90 },
              (_, i) => i + 1
            ).map((n) => (
              <div
                key={n}
                style={{
                  padding: "8px 2px",
                  textAlign: "center",
                  borderRadius: 6,
                  background:
                    called.includes(n)
                      ? "#2563eb"
                      : "#f1f5f9",
                  color:
                    called.includes(n)
                      ? "#fff"
                      : "#111827",
                  fontWeight: "bold"
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <h2>Called Numbers</h2>

          <p>
            {called.length
              ? called.join(" • ")
              : "No numbers called yet."}
          </p>
        </section>

        <section style={card}>
          <h2>Ticket Bookings</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 8
            }}
          >
            <Info
              title="Pending"
              value={
                bookings.filter(
                  (b) =>
                    b.status === "pending"
                ).length
              }
            />

            <Info
              title="Approved"
              value={
                bookings.filter(
                  (b) =>
                    b.status === "approved"
                ).length
              }
            />

            <Info
              title="Rejected"
              value={
                bookings.filter(
                  (b) =>
                    b.status === "rejected"
                ).length
              }
            />
          </div>

          {bookings.map((b) => (
            <div
              key={b.id}
              style={{
                marginTop: 10,
                padding: 12,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 9
              }}
            >
              <b>
                {b.player_name ||
                  "Player"}
              </b>

              <div>
                Ticket #{b.ticket_number}
              </div>

              <div>
                Status:{" "}
                {b.status || "pending"}
              </div>
            </div>
          ))}
        </section>

        <section style={card}>
          <h2>Prize Winners</h2>

          {prizes.map((p, i) => (
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
              <b>{p.name}</b>
              <span>₹{p.amount}</span>
            </div>
          ))}
        </section>

        <button
          onClick={onNewGame}
          style={{
            ...whiteButton,
            width: "100%"
          }}
        >
          CREATE ANOTHER GAME
        </button>
      </div>
    </main>
  );
}

/* =========================================================
   PLAYER BOOKING PAGE
========================================================= */

function PlayerBookingPage({ game }) {
  const limit = Math.max(
    1,
    Number(game.ticket_limit || 100)
  );

  const [selected, setSelected] =
    useState(1);

  const [name, setName] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [booking, setBooking] =
    useState(false);

  const tickets = useMemo(
    () =>
      Array.from(
        { length: limit },
        (_, i) => ({
          number: i + 1,
          grid: makeTicket(i + 1)
        })
      ),
    [limit]
  );

  function selectTicket(n) {
    setSelected(n);

    document
      .getElementById(
        `ticket-${n}`
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
  }

  async function bookTicket(n) {
    const playerName =
      name.trim();

    if (!playerName) {
      setMessage(
        "Please enter your name."
      );
      return;
    }

    setBooking(true);
    setMessage("");

    try {
      const { error } =
        await supabase
          .from("bookings")
          .insert({
            game_id: game.id,
            ticket_number: n,
            player_name: playerName,
            status: "pending"
          });

      if (error) throw error;

      setMessage(
        `Ticket #${n} booking sent to the host for approval.`
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Booking could not be submitted."
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <main style={page}>
      <div style={wrap}>
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

          <p style={{ color: "#64748b" }}>
            Player Ticket Booking
          </p>
        </header>

        <section style={card}>
          <h2>Game Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
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

            <Info
              title="Status"
              value={String(
                game.status || "upcoming"
              ).toUpperCase()}
            />
          </div>
        </section>

        {/* =================================================
            ALL TICKET NUMBERS AT TOP
        ================================================= */}

        <section style={card}>
          <h2>Select Ticket</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(65px,1fr))",
              gap: 8
            }}
          >
            {Array.from(
              { length: limit },
              (_, i) => i + 1
            ).map((n) => (
              <button
                key={n}
                onClick={() =>
                  selectTicket(n)
                }
                style={{
                  padding: "12px 5px",
                  borderRadius: 9,
                  border:
                    selected === n
                      ? "2px solid #2563eb"
                      : "1px solid #cbd5e1",
                  background:
                    selected === n
                      ? "#2563eb"
                      : "#fff",
                  color:
                    selected === n
                      ? "#fff"
                      : "#111827",
                  fontWeight: "bold",
                  fontSize: 15
                }}
              >
                #{n}
              </button>
            ))}
          </div>
        </section>

        {/* =================================================
            ALL ACTUAL 3x9 TICKETS BELOW
        ================================================= */}

        <section style={card}>
          <h2>
            All Tambola Tickets
          </h2>

          <p
            style={{
              color: "#64748b"
            }}
          >
            Select a ticket number above,
            or scroll through all tickets
            below.
          </p>

          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.number}
              ticket={ticket}
              selected={
                selected ===
                ticket.number
              }
              playerName={name}
              setPlayerName={setName}
              onSelect={() =>
                selectTicket(
                  ticket.number
                )
              }
              onBook={() =>
                bookTicket(
                  ticket.number
                )
              }
              booking={booking}
            />
          ))}
        </section>

        {message && (
          <section
            style={{
              ...card,
              background:
                message.includes(
                  "sent"
                )
                  ? "#ecfdf5"
                  : "#fff7ed",
              color:
                message.includes(
                  "sent"
                )
                  ? "#047857"
                  : "#9a3412"
            }}
          >
            <b>{message}</b>
          </section>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   TICKET CARD
========================================================= */

function TicketCard({
  ticket,
  selected,
  playerName,
  setPlayerName,
  onSelect,
  onBook,
  booking
}) {
  return (
    <div
      id={`ticket-${ticket.number}`}
      style={{
        ...card,
        border: selected
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
          marginBottom: 14
        }}
      >
        <h2 style={{ margin: 0 }}>
          Ticket #{ticket.number}
        </h2>

        <button
          onClick={onSelect}
          style={
            selected
              ? blueButton
              : whiteButton
          }
        >
          {selected
            ? "Selected"
            : "Select"}
        </button>
      </div>

      {/* ACTUAL 3 x 9 TAMBOLA TICKET */}

      <div
        style={{
          overflowX: "auto"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(9,1fr)",
            minWidth: 450,
            border:
              "2px solid #111827",
            borderRadius: 8,
            overflow: "hidden"
          }}
        >
          {ticket.grid.map(
            (row, r) =>
              row.map((num, c) => (
                <div
                  key={`${r}-${c}`}
                  style={{
                    minHeight: 48,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    border:
                      "1px solid #cbd5e1",
                    background:
                      num
                        ? "#fff"
                        : "#f1f5f9",
                    fontSize: 18,
                    fontWeight:
                      num
                        ? "bold"
                        : "normal"
                  }}
                >
                  {num || ""}
                </div>
              ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <label>
          <b>Player Name</b>
        </label>

        <input
          value={playerName}
          onChange={(e) =>
            setPlayerName(
              e.target.value
            )
          }
          placeholder="Enter your name"
          style={{
            ...input,
            marginTop: 7
          }}
        />

        <button
          onClick={onBook}
          disabled={booking}
          style={{
            ...blueButton,
            width: "100%",
            marginTop: 10,
            opacity: booking ? 0.6 : 1
          }}
        >
          {booking
            ? "BOOKING..."
            : `BOOK TICKET #${ticket.number}`}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENT
========================================================= */

function Info({ title, value }) {
  return (
    <div
      style={{
        padding: 13,
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

/* =========================================================
   APP ROUTING
========================================================= */

function App() {
  /*
    VERY IMPORTANT:

    ?game=XXXXXX ALWAYS means PLAYER.

    No ?game= means HOST CREATE PAGE.

    We DO NOT read localStorage here.
    Therefore refreshing "/" can NEVER
    accidentally send the user to the
    old Host Control Centre.
  */

  const gameCode =
    getGameCodeFromUrl();

  const [hostGame, setHostGame] =
    useState(null);

  const [playerGame, setPlayerGame] =
    useState(null);

  const [loadingPlayer, setLoadingPlayer] =
    useState(Boolean(gameCode));

  const [playerError, setPlayerError] =
    useState("");

  /* PLAYER ROUTE */

  useEffect(() => {
    if (!gameCode) {
      setLoadingPlayer(false);
      return;
    }

    let active = true;

    async function loadGame() {
      setLoadingPlayer(true);
      setPlayerError("");

      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameCode)
          .maybeSingle();

      if (!active) return;

      if (error) {
        setPlayerError(
          error.message
        );
      } else if (!data) {
        setPlayerError(
          "Game not found."
        );
      } else {
        setPlayerGame(data);
      }

      setLoadingPlayer(false);
    }

    loadGame();

    return () => {
      active = false;
    };
  }, [gameCode]);

  /* =======================================================
     PLAYER PAGE
  ======================================================= */

  if (gameCode) {
    if (loadingPlayer) {
      return (
        <main
          style={{
            ...page,
            display: "flex",
            justifyContent:
              "center",
            alignItems:
              "center"
          }}
        >
          <h2>
            Loading game...
          </h2>
        </main>
      );
    }

    if (playerError) {
      return (
        <main style={page}>
          <div style={wrap}>
            <section style={card}>
              <h2>
                Game unavailable
              </h2>

              <p>
                {playerError}
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

  /* =======================================================
     HOST ROUTE
  ======================================================= */

  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={() =>
          setHostGame(null)
        }
      />
    );
  }

  return (
    <CreateGamePage
      onCreated={(game) =>
        setHostGame(game)
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
