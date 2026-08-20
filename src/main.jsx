import React, { useEffect, useState } from "react";
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
].map((name) => ({
  name,
  amount: ""
}));

const GAME_KEY = "tambolalive_host_game";

/* =========================================================
   HELPERS
========================================================= */

function generateGameCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 6; i++) {
    result +=
      characters[
        Math.floor(Math.random() * characters.length)
      ];
  }

  return result;
}

function saveHostGame(game) {
  if (!game) {
    localStorage.removeItem(GAME_KEY);
    return;
  }

  localStorage.setItem(
    GAME_KEY,
    JSON.stringify(game)
  );
}

function loadHostGame() {
  try {
    const saved =
      localStorage.getItem(GAME_KEY);

    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);

    return parsed?.game_code
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getGameCodeFromUrl() {
  return new URLSearchParams(
    window.location.search
  ).get("game");
}

/* =========================================================
   COMMON STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "20px",
  boxSizing: "border-box",
  fontFamily: "Arial, Helvetica, sans-serif"
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontSize: "15px"
};

const primaryButton = {
  padding: "12px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer"
};

const secondaryButton = {
  padding: "10px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#111827",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer"
};

/* =========================================================
   CREATE GAME PAGE
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
    setPrizes((current) =>
      current.map((prize, i) =>
        i === index
          ? { ...prize, amount }
          : prize
      )
    );
  }

  function addCustomPrize() {
    const cleanName =
      customPrize.trim();

    if (!cleanName) return;

    setPrizes((current) => [
      ...current,
      {
        name: cleanName,
        amount: ""
      }
    ]);

    setCustomPrize("");
  }

  function removePrize(index) {
    setPrizes((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  async function createGame(event) {
    event.preventDefault();

    if (creating) return;

    setCreating(true);
    setError("");

    try {
      let gameCode =
        generateGameCode();

      let codeAvailable = false;

      while (!codeAvailable) {
        const { data, error } =
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", gameCode)
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
          codeAvailable = true;
        } else {
          gameCode = generateGameCode();
        }
      }

      const selectedPrizes =
        prizes
          .filter(
            (prize) =>
              prize.amount !== "" &&
              prize.amount !== null &&
              prize.amount !== undefined
          )
          .map((prize) => ({
            name: prize.name,
            amount: Number(prize.amount)
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

        game_code:
          gameCode,

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

      const hostGame = {
        ...data,

        selected_prizes:
          Array.isArray(data.selected_prizes)
            ? data.selected_prizes
            : [],

        called_numbers:
          Array.isArray(data.called_numbers)
            ? data.called_numbers
            : []
      };

      saveHostGame(hostGame);

      onGameCreated(hostGame);

    } catch (err) {
      console.error(
        "Create game error:",
        err
      );

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
            Host Dashboard
          </p>
        </div>

        <form onSubmit={createGame}>
          <section style={cardStyle}>
            <h2>
              Create New Game
            </h2>

            <div
              style={{
                marginBottom: 16
              }}
            >
              <label>
                <b>
                  Game Name
                </b>
              </label>

              <input
                value={gameName}
                onChange={(e) =>
                  setGameName(
                    e.target.value
                  )
                }
                placeholder="TambolaLive"
                style={{
                  ...inputStyle,
                  marginTop: 7
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 15
              }}
            >
              <div>
                <label>
                  <b>Date</b>
                </label>

                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) =>
                    setGameDate(
                      e.target.value
                    )
                  }
                  required
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <label>
                  <b>Time</b>
                </label>

                <input
                  type="time"
                  value={gameTime}
                  onChange={(e) =>
                    setGameTime(
                      e.target.value
                    )
                  }
                  required
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <label>
                  <b>Ticket Limit</b>
                </label>

                <input
                  type="number"
                  min="1"
                  value={ticketLimit}
                  onChange={(e) =>
                    setTicketLimit(
                      e.target.value
                    )
                  }
                  required
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div>
                <label>
                  <b>Ticket Price</b>
                </label>

                <input
                  type="number"
                  min="0"
                  value={ticketPrice}
                  onChange={(e) =>
                    setTicketPrice(
                      e.target.value
                    )
                  }
                  required
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
              <label>
                <b>Game Theme</b>
              </label>

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
                {THEMES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section style={cardStyle}>
            <h2>Prizes</h2>

            <p
              style={{
                color: "#64748b"
              }}
            >
              Set an amount for the
              prizes you want to use.
            </p>

            {prizes.map(
              (prize, index) => (
                <div
                  key={`${prize.name}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 150px auto",
                    gap: 10,
                    alignItems:
                      "center",
                    marginBottom: 10
                  }}
                >
                  <div>
                    <b>
                      {prize.name}
                    </b>
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={prize.amount}
                    onChange={(e) =>
                      updatePrize(
                        index,
                        e.target.value
                      )
                    }
                    placeholder="Amount"
                    style={inputStyle}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removePrize(
                        index
                      )
                    }
                    style={{
                      ...secondaryButton,
                      padding:
                        "9px 12px"
                    }}
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
                marginTop: 18,
                flexWrap: "wrap"
              }}
            >
              <input
                value={customPrize}
                onChange={(e) =>
                  setCustomPrize(
                    e.target.value
                  )
                }
                placeholder="Customize prize"
                style={{
                  ...inputStyle,
                  flex: 1,
                  minWidth: 200
                }}
              />

              <button
                type="button"
                onClick={
                  addCustomPrize
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
            <div
              style={{
                ...cardStyle,
                border:
                  "1px solid #ef4444",
                background:
                  "#fef2f2",
                color:
                  "#b91c1c"
              }}
            >
              <b>
                Could not create game
              </b>

              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
              fontSize: 17,
              padding: 15,
              opacity:
                creating ? 0.7 : 1
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
   PLAYER PAGE
========================================================= */

function PlayerPage({
  gameCode
}) {
  const [game, setGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [playerName, setPlayerName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [ticketCount, setTicketCount] =
    useState(1);

  const [booking, setBooking] =
    useState(false);

  const [booked, setBooked] =
    useState(false);

  useEffect(() => {
    async function loadGame() {
      setLoading(true);
      setError("");

      const cleanCode =
        gameCode?.trim().toUpperCase();

      if (!cleanCode) {
        setError(
          "Game link is invalid."
        );
        setLoading(false);
        return;
      }

      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq(
            "game_code",
            cleanCode
          )
          .single();

      if (error) {
        console.error(
          "Load player game error:",
          error
        );

        setError(
          "Game not found."
        );
      } else {
        setGame(data);
      }

      setLoading(false);
    }

    loadGame();
  }, [gameCode]);

  async function bookTickets(event) {
    event.preventDefault();

    if (booking || booked) {
      return;
    }

    /*
      IMPORTANT:
      Check the latest game status
      immediately before booking.
    */

    setBooking(true);
    setError("");

    try {
      const { data: latestGame, error } =
        await supabase
          .from("games")
          .select("*")
          .eq(
            "game_code",
            gameCode
          )
          .single();

      if (error) {
        throw error;
      }

      if (
        latestGame.status ===
        "started"
      ) {
        setGame(latestGame);

        setError(
          "This game has already started. Ticket booking is closed."
        );

        return;
      }

      if (
        latestGame.status ===
        "ended"
      ) {
        setGame(latestGame);

        setError(
          "This game has ended. Ticket booking is closed."
        );

        return;
      }

      /*
        Booking database table will be
        connected in the next step.

        For now we only verify that
        booking is allowed.
      */

      setGame(latestGame);

      setBooked(true);

    } catch (err) {
      console.error(
        "Booking error:",
        err
      );

      setError(
        err?.message ||
          "Could not continue with booking."
      );
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <h2>
          Loading game...
        </h2>
      </main>
    );
  }

  if (!game) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 600,
            margin: "60px auto"
          }}
        >
          <section
            style={{
              ...cardStyle,
              textAlign: "center"
            }}
          >
            <h1>
              Game Not Found
            </h1>

            <p
              style={{
                color: "#64748b"
              }}
            >
              {error ||
                "This game link is invalid or the game no longer exists."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const status =
    String(
      game.status || "upcoming"
    ).toLowerCase();

  const bookingClosed =
    status === "started" ||
    status === "ended";

  const prizes =
    Array.isArray(
      game.selected_prizes
    )
      ? game.selected_prizes
      : [];

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 650,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1
            style={{
              marginBottom: 6
            }}
          >
            {game.game_name}
          </h1>

          <p
            style={{
              color: "#64748b",
              marginTop: 0
            }}
          >
            TAMBOLA LIVE
          </p>
        </div>

        <section
          style={{
            ...cardStyle,
            textAlign: "center"
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding:
                "7px 14px",
              borderRadius: 20,
              background:
                bookingClosed
                  ? "#fee2e2"
                  : "#dcfce7",
              color:
                bookingClosed
                  ? "#b91c1c"
                  : "#166534",
              fontWeight: "bold",
              fontSize: 13
            }}
          >
            {bookingClosed
              ? status === "started"
                ? "GAME STARTED"
                : "GAME ENDED"
              : "BOOKING OPEN"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2,1fr)",
              gap: 10,
              marginTop: 20
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
              title="Tickets Available"
              value={
                game.ticket_limit ||
                0
              }
            />
          </div>
        </section>

        <section style={cardStyle}>
          <h2>
            🏆 Prizes
          </h2>

          {prizes.length === 0 ? (
            <p
              style={{
                color: "#64748b"
              }}
            >
              Prize details will be
              announced by the host.
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
                    padding:
                      "12px 0",
                    borderBottom:
                      index <
                      prizes.length - 1
                        ? "1px solid #e5e7eb"
                        : "none"
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

        {booked ? (
          <section
            style={{
              ...cardStyle,
              textAlign: "center",
              border:
                "1px solid #22c55e",
              background:
                "#f0fdf4"
            }}
          >
            <div
              style={{
                fontSize: 40
              }}
            >
              ✓
            </div>

            <h2>
              Booking Details Saved
            </h2>

            <p>
              The booking database
              connection will be
              added in the next step.
            </p>

            <p
              style={{
                color: "#64748b"
              }}
            >
              Player:{" "}
              <b>
                {playerName}
              </b>
            </p>
          </section>
        ) : (
          <section style={cardStyle}>
            <h2>
              🎟️ Book Tickets
            </h2>

            {bookingClosed ? (
              <div
                style={{
                  padding: 15,
                  borderRadius: 10,
                  background:
                    "#fef2f2",
                  border:
                    "1px solid #fecaca",
                  color:
                    "#b91c1c",
                  fontWeight:
                    "bold"
                }}
              >
                {status ===
                "started"
                  ? "The game has started. Ticket booking is now closed."
                  : "This game has ended. Ticket booking is closed."}
              </div>
            ) : (
              <form
                onSubmit={
                  bookTickets
                }
              >
                <div
                  style={{
                    marginBottom: 14
                  }}
                >
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
                    required
                    style={{
                      ...inputStyle,
                      marginTop: 7
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom: 14
                  }}
                >
                  <label>
                    <b>
                      Mobile Number
                    </b>
                  </label>

                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) =>
                      setMobile(
                        e.target.value
                      )
                    }
                    placeholder="Enter mobile number"
                    required
                    style={{
                      ...inputStyle,
                      marginTop: 7
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom: 16
                  }}
                >
                  <label>
                    <b>
                      Number of Tickets
                    </b>
                  </label>

                  <input
                    type="number"
                    min="1"
                    max={
                      game.ticket_limit ||
                      1
                    }
                    value={
                      ticketCount
                    }
                    onChange={(e) =>
                      setTicketCount(
                        e.target.value
                      )
                    }
                    required
                    style={{
                      ...inputStyle,
                      marginTop: 7
                    }}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      marginBottom: 15,
                      padding: 12,
                      borderRadius: 8,
                      background:
                        "#fef2f2",
                      border:
                        "1px solid #fecaca",
                      color:
                        "#b91c1c"
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={booking}
                  style={{
                    ...primaryButton,
                    width: "100%",
                    padding: 15,
                    opacity:
                      booking
                        ? 0.7
                        : 1
                  }}
                >
                  {booking
                    ? "Checking..."
                    : `BOOK ${ticketCount} TICKET${
                        Number(
                          ticketCount
                        ) === 1
                          ? ""
                          : "S"
                      }`}
                </button>
              </form>
            )}
          </section>
        )}

        <div
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
            marginTop: 20
          }}
        >
          Game Code:{" "}
          <b>
            {game.game_code}
          </b>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   HOST CONTROL PAGE
========================================================= */

function HostControlPage({
  game,
  onNewGame
}) {
  const [copied, setCopied] =
    useState(false);

  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  const prizes =
    Array.isArray(
      game.selected_prizes
    )
      ? game.selected_prizes
      : [];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setCopied(true);

      setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      window.prompt(
        "Copy this game link:",
        inviteUrl
      );
    }
  }

  async function shareGame() {
    const prizeText =
      prizes.length
        ? prizes
            .map(
              (p) =>
                `${p.name}: ₹${p.amount}`
            )
            .join("\n")
        : "Prize details coming soon";

    const message =
`🎟️ ${game.game_name}

📅 Date: ${game.game_date || "-"}
⏰ Time: ${game.game_time || "-"}
🎫 Ticket Price: ₹${game.ticket_price || 0}
🎟️ Tickets: ${game.ticket_limit || 0}

🏆 PRIZES
${prizeText}

Join the game:
${inviteUrl}`;

    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            game.game_name,
          text: message,
          url: inviteUrl
        });
      } catch (err) {
        if (
          err?.name !==
          "AbortError"
        ) {
          console.error(err);
        }
      }

      return;
    }

    try {
      await navigator.clipboard.writeText(
        message
      );

      alert(
        "Game details copied."
      );
    } catch {
      window.prompt(
        "Copy game details:",
        message
      );
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
            Host Control Page
          </p>
        </div>

        <section style={cardStyle}>
          <h2>
            Game Details
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(200px,1fr))",
              gap: 12
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
              title="Ticket Limit"
              value={
                game.ticket_limit ||
                0
              }
            />
          </div>

          <div
            style={{
              marginTop: 18,
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

        <section style={cardStyle}>
          <h2>
            Share Game
          </h2>

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

          <p
            style={{
              color: "#64748b",
              fontSize: 13
            }}
          >
            Poster generation will
            be added in the next
            stages.
          </p>
        </section>

        <section style={cardStyle}>
          <h2>
            Ticket Bookings
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 8
            }}
          >
            <StatusBox
              title="Pending"
              value="0"
            />

            <StatusBox
              title="Approved"
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
            Booking management
            will be connected in
            the next stage.
          </p>
        </section>

        <section style={cardStyle}>
          <h2>
            Prizes
          </h2>

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
                    ₹{prize.amount}
                  </span>
                </div>
              )
            )
          )}
        </section>

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

          <p
            style={{
              color: "#64748b",
              fontSize: 13
            }}
          >
            Live game control will
            be added in a later
            step.
          </p>
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
   SMALL UI COMPONENTS
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
          color: "#64748b",
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
        textAlign: "center",
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background:
          "#f8fafc"
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#64748b"
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

/* =========================================================
   APP
========================================================= */

function App() {
  const [hostGame, setHostGame] =
    useState(null);

  const [playerGameCode] =
    useState(
      getGameCodeFromUrl()
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const saved =
      loadHostGame();

    if (saved) {
      setHostGame(saved);
    }

    setLoading(false);
  }, []);

  function handleGameCreated(
    game
  ) {
    setHostGame(game);

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  }

  function handleNewGame() {
    saveHostGame(null);
    setHostGame(null);

    if (
      window.location.search
    ) {
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
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
    IMPORTANT:
    A ?game=XXXXXX URL is treated
    as a PLAYER link.

    The host dashboard is kept
    separately in localStorage.
  */

  if (playerGameCode) {
    return (
      <PlayerPage
        gameCode={
          playerGameCode
        }
      />
    );
  }

  if (hostGame) {
    return (
      <HostControlPage
        game={hostGame}
        onNewGame={
          handleNewGame
        }
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
   START
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App />
);
