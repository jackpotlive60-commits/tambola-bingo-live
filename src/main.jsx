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
    result += characters[
      Math.floor(
        Math.random() * characters.length
      )
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

    if (!saved) return null;

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
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "20px",
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif"
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.05)"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontSize: "15px"
};

const primaryButton = {
  padding: "13px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer"
};

const secondaryButton = {
  padding: "11px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#111827",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer"
};

/* =========================================================
   PLAYER PAGE
========================================================= */

function PlayerPage({ gameCode }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    loadGame();
  }, [gameCode]);

  async function loadGame() {
    setLoading(true);
    setError("");

    try {
      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameCode)
          .single();

      if (error) {
        throw error;
      }

      setGame(data);
    } catch (err) {
      console.error(err);

      setError(
        "Game not found. Please check the game link."
      );
    } finally {
      setLoading(false);
    }
  }

  async function bookTickets(e) {
    e.preventDefault();

    if (booking) return;

    if (!playerName.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!mobile.trim()) {
      alert("Please enter your mobile number.");
      return;
    }

    if (!game) return;

    /*
      IMPORTANT:
      Once the host starts the game,
      players cannot book new tickets.
    */

    if (
      game.status === "started" ||
      game.status === "live" ||
      game.status === "ended"
    ) {
      alert(
        game.status === "ended"
          ? "This game has ended. Ticket booking is closed."
          : "The game has already started. Ticket booking is closed."
      );

      return;
    }

    setBooking(true);

    try {
      /*
        STEP 2 FOUNDATION

        For now we only validate the
        booking information.

        The actual bookings table will
        be connected in the next booking
        step after this interface is tested.
      */

      setBooked(true);
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Could not book tickets."
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
        <h2>Loading game...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 600,
            margin: "50px auto"
          }}
        >
          <section
            style={{
              ...cardStyle,
              textAlign: "center",
              border: "1px solid #ef4444"
            }}
          >
            <h2>Game Not Found</h2>

            <p
              style={{
                color: "#b91c1c"
              }}
            >
              {error}
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (booked) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 600,
            margin: "30px auto"
          }}
        >
          <section
            style={{
              ...cardStyle,
              textAlign: "center"
            }}
          >
            <div
              style={{
                fontSize: 55,
                marginBottom: 10
              }}
            >
              ✓
            </div>

            <h1>
              Booking Request Received
            </h1>

            <p
              style={{
                color: "#64748b"
              }}
            >
              Your ticket request has
              been recorded.
            </p>

            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 10,
                background: "#f8fafc"
              }}
            >
              <b>{game.game_name}</b>

              <div
                style={{
                  marginTop: 8
                }}
              >
                Player: {playerName}
              </div>

              <div
                style={{
                  marginTop: 5
                }}
              >
                Tickets: {quantity}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const isClosed =
    game.status === "started" ||
    game.status === "live" ||
    game.status === "ended";

  const total =
    Number(game.ticket_price || 0) *
    Number(quantity);

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto"
        }}
      >
        <header
          style={{
            textAlign: "center",
            marginBottom: 20
          }}
        >
          <h1
            style={{
              marginBottom: 5
            }}
          >
            {game.game_name}
          </h1>

          <p
            style={{
              marginTop: 0,
              color: "#64748b"
            }}
          >
            Player Booking
          </p>
        </header>

        <section style={cardStyle}>
          <h2>Game Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2,1fr)",
              gap: 10
            }}
          >
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
              title="Game Code"
              value={
                game.game_code
              }
            />
          </div>
        </section>

        {isClosed && (
          <section
            style={{
              ...cardStyle,
              background: "#fef2f2",
              border:
                "1px solid #ef4444",
              color: "#991b1b",
              textAlign: "center"
            }}
          >
            <h2>
              Ticket Booking Closed
            </h2>

            <p>
              This game has already
              started or ended.
            </p>
          </section>
        )}

        {!isClosed && (
          <form
            onSubmit={bookTickets}
          >
            <section style={cardStyle}>
              <h2>
                Book Your Tickets
              </h2>

              <div
                style={{
                  marginBottom: 15
                }}
              >
                <label>
                  <b>
                    Player Name
                  </b>
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
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div
                style={{
                  marginBottom: 15
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
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div
                style={{
                  marginBottom: 15
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
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(
                        1,
                        Number(
                          e.target.value
                        )
                      )
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: 7
                  }}
                />
              </div>

              <div
                style={{
                  padding: 15,
                  background:
                    "#f8fafc",
                  borderRadius: 10,
                  marginBottom: 15
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between"
                  }}
                >
                  <span>
                    Ticket Price
                  </span>

                  <b>
                    ₹
                    {
                      game.ticket_price
                    }
                  </b>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 8
                  }}
                >
                  <span>
                    Tickets
                  </span>

                  <b>
                    {quantity}
                  </b>
                </div>

                <hr
                  style={{
                    border: 0,
                    borderTop:
                      "1px solid #e5e7eb",
                    margin:
                      "12px 0"
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    fontSize: 18
                  }}
                >
                  <b>
                    Total
                  </b>

                  <b>
                    ₹{total}
                  </b>
                </div>
              </div>

              <button
                type="submit"
                disabled={booking}
                style={{
                  ...primaryButton,
                  width: "100%",
                  fontSize: 17,
                  opacity:
                    booking ? 0.7 : 1
                }}
              >
                {booking
                  ? "Processing..."
                  : "BOOK TICKETS"}
              </button>
            </section>
          </form>
        )}

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13
          }}
        >
          Powered by TambolaLive
        </p>
      </div>
    </main>
  );
}

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
            .eq(
              "game_code",
              gameCode
            )
            .limit(1);

        if (error) throw error;

        if (
          !data ||
          data.length === 0
        ) {
          codeAvailable = true;
        } else {
          gameCode =
            generateGameCode();
        }
      }

      const selectedPrizes =
        prizes
          .filter(
            (prize) =>
              prize.amount !== "" &&
              prize.amount !== null &&
              prize.amount !==
                undefined
          )
          .map((prize) => ({
            name: prize.name,
            amount: Number(
              prize.amount
            )
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
          Array.isArray(
            data.selected_prizes
          )
            ? data.selected_prizes
            : [],

        called_numbers:
          Array.isArray(
            data.called_numbers
          )
            ? data.called_numbers
            : []
      };

      saveHostGame(hostGame);

      onGameCreated(hostGame);
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

          <p
            style={{
              color: "#64748b"
            }}
          >
            Host Dashboard
          </p>
        </div>

        <form
          onSubmit={createGame}
        >
          <section style={cardStyle}>
            <h2>
              Create New Game
            </h2>

            <div
              style={{
                marginBottom: 15
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
                  <b>
                    Ticket Limit
                  </b>
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
                  <b>
                    Ticket Price
                  </b>
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
                marginTop: 15
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
                {THEMES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          <section style={cardStyle}>
            <h2>Prizes</h2>

            {prizes.map(
              (prize, index) => (
                <div
                  key={`${prize.name}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 140px auto",
                    gap: 10,
                    alignItems:
                      "center",
                    marginBottom: 10
                  }}
                >
                  <b>
                    {prize.name}
                  </b>

                  <input
                    type="number"
                    min="0"
                    value={
                      prize.amount
                    }
                    onChange={(e) =>
                      updatePrize(
                        index,
                        e.target.value
                      )
                    }
                    placeholder="Amount"
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
                value={customPrize}
                onChange={(e) =>
                  setCustomPrize(
                    e.target.value
                  )
                }
                placeholder="Customize prize"
                style={
                  inputStyle
                }
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
            <section
              style={{
                ...cardStyle,
                background: "#fef2f2",
                color: "#b91c1c"
              }}
            >
              <b>
                Could not create game
              </b>

              <p>{error}</p>
            </section>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...primaryButton,
              width: "100%",
              fontSize: 17,
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

🏆 PRIZES
${prizeText}

Join the game:
${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: game.game_name,
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
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 10,
              background: "#fff7ed",
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
              gap: 8
            }}
          >
            <button
              onClick={copyLink}
              style={
                secondaryButton
              }
            >
              {copied
                ? "✓ Copied"
                : "Copy Link"}
            </button>

            <button
              onClick={shareGame}
              style={
                primaryButton
              }
            >
              Share Game
            </button>
          </div>
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
        </section>

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
              gap: 10
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
            Live game control will be
            added separately.
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

  const [playerCode, setPlayerCode] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const code =
      getGameCodeFromUrl();

    /*
      IMPORTANT:
      If ?game=XXXX exists,
      this is ALWAYS the player page.
      It must never use the host
      localStorage game.
    */

    if (code) {
      setPlayerCode(
        code.toUpperCase()
      );

      setLoading(false);
      return;
    }

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
  }

  function handleNewGame() {
    saveHostGame(null);
    setHostGame(null);

    if (window.location.search) {
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

  if (playerCode) {
    return (
      <PlayerPage
        gameCode={playerCode}
      />
    );
  }

  /*
    HOST ROUTE
  */

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
   START APP
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App />
);
