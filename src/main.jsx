import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/*
=========================================================
TAMBOLA LIVE
STEP 2 — HOST CREATE GAME
=========================================================
*/

const APP_NAME = "TambolaLive";

const THEMES = [
  "Classic",
  "Royal",
  "Party",
  "Bollywood",
  "Neon",
  "Elegant",
];

const DEFAULT_PRIZES = [
  "First Five",
  "Four Corners",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House",
];

/* =======================================================
   GAME CODE
======================================================= */

function generateGameCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    const index = Math.floor(
      Math.random() * characters.length
    );

    code += characters[index];
  }

  return code;
}

/* =======================================================
   STYLES
======================================================= */

const pageStyle = {
  minHeight: "100vh",
  margin: 0,
  padding: 20,
  boxSizing: "border-box",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  background: "#f5f7fb",
  color: "#111827",
};

const containerStyle = {
  width: "100%",
  maxWidth: 700,
  margin: "0 auto",
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: 12,
  padding: 20,
  boxSizing: "border-box",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.08)",
  marginBottom: 16,
};

const inputStyle = {
  width: "100%",
  padding: 11,
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: 7,
  fontSize: 16,
  marginTop: 6,
};

const buttonStyle = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "10px 15px",
  border: "1px solid #9ca3af",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontWeight: "bold",
  cursor: "pointer",
};

/* =======================================================
   PRIZE ROW
======================================================= */

function PrizeRow({
  prize,
  index,
  onNameChange,
  onAmountChange,
  onRemove,
}) {
  return (
    <div
      style={{
        border:
          "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 150px",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div>
          <label>
            <b>Prize Name</b>
          </label>

          <input
            value={prize.name}
            onChange={(event) =>
              onNameChange(
                index,
                event.target.value
              )
            }
            style={inputStyle}
            placeholder="Prize name"
          />
        </div>

        <div>
          <label>
            <b>Amount ₹</b>
          </label>

          <input
            type="number"
            min="0"
            value={prize.amount}
            onChange={(event) =>
              onAmountChange(
                index,
                event.target.value
              )
            }
            style={inputStyle}
            placeholder="Amount"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onRemove(index)
        }
        style={{
          marginTop: 10,
          padding:
            "7px 12px",
          border:
            "1px solid #dc2626",
          borderRadius: 6,
          background: "#fff",
          color: "#dc2626",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Remove Prize
      </button>
    </div>
  );
}

/* =======================================================
   HOST CREATE GAME
======================================================= */

function HostCreateGame() {
  const [gameName, setGameName] =
    useState("TambolaLive");

  const [ticketLimit, setTicketLimit] =
    useState(100);

  const [ticketPrice, setTicketPrice] =
    useState(20);

  const [gameDate, setGameDate] =
    useState("");

  const [gameTime, setGameTime] =
    useState("");

  const [theme, setTheme] =
    useState("Classic");

  const [prizes, setPrizes] =
    useState(
      DEFAULT_PRIZES.map(
        (name) => ({
          name,
          amount: "",
        })
      )
    );

  const [customPrizeName, setCustomPrizeName] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [createdGame, setCreatedGame] =
    useState(null);

  /* =====================================================
     PRIZE FUNCTIONS
  ===================================================== */

  function updatePrizeName(
    index,
    value
  ) {
    setPrizes((current) =>
      current.map(
        (prize, prizeIndex) =>
          prizeIndex === index
            ? {
                ...prize,
                name: value,
              }
            : prize
      )
    );
  }

  function updatePrizeAmount(
    index,
    value
  ) {
    setPrizes((current) =>
      current.map(
        (prize, prizeIndex) =>
          prizeIndex === index
            ? {
                ...prize,
                amount: value,
              }
            : prize
      )
    );
  }

  function removePrize(index) {
    setPrizes((current) =>
      current.filter(
        (_, prizeIndex) =>
          prizeIndex !== index
      )
    );
  }

  function addCustomPrize() {
    const name =
      customPrizeName.trim();

    if (!name) {
      alert(
        "Enter a prize name first."
      );

      return;
    }

    setPrizes((current) => [
      ...current,
      {
        name,
        amount: "",
      },
    ]);

    setCustomPrizeName("");
  }

  /* =====================================================
     CHECK GAME CODE
  ===================================================== */

  async function createUniqueGameCode() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const gameCode =
        generateGameCode();

      const {
        data,
        error,
      } = await supabase
        .from("games")
        .select("id")
        .eq(
          "game_code",
          gameCode
        )
        .limit(1);

      if (error) {
        throw error;
      }

      if (
        !data ||
        data.length === 0
      ) {
        return gameCode;
      }
    }

    throw new Error(
      "Could not generate a unique game code. Please try again."
    );
  }

  /* =====================================================
     CREATE GAME
  ===================================================== */

  async function handleCreateGame(
    event
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      if (!gameName.trim()) {
        throw new Error(
          "Please enter a game name."
        );
      }

      if (
        !ticketLimit ||
        Number(ticketLimit) < 1
      ) {
        throw new Error(
          "Ticket limit must be at least 1."
        );
      }

      if (
        ticketPrice === "" ||
        Number(ticketPrice) < 0
      ) {
        throw new Error(
          "Ticket price cannot be negative."
        );
      }

      if (!gameDate) {
        throw new Error(
          "Please select the game date."
        );
      }

      if (!gameTime) {
        throw new Error(
          "Please select the game time."
        );
      }

      const gameCode =
        await createUniqueGameCode();

      const cleanPrizes =
        prizes
          .filter(
            (prize) =>
              prize.name.trim() &&
              prize.amount !== "" &&
              Number(prize.amount) >= 0
          )
          .map(
            (prize) => ({
              name:
                prize.name.trim(),
              amount:
                Number(
                  prize.amount
                ),
              approved: false,
              winner: null,
            })
          );

      /*
      -----------------------------------------------------
      DATABASE INSERT

      We keep the database fields compatible
      with the games table already being used.
      -----------------------------------------------------
      */

      const {
        data,
        error,
      } = await supabase
        .from("games")
        .insert({
          host_name: "Host",

          game_name:
            gameName.trim(),

          status: "upcoming",

          ticket_limit:
            Number(ticketLimit),

          ticket_price:
            Number(ticketPrice),

          call_interval_seconds: 5,

          game_date: gameDate,

          game_time: gameTime,

          game_code: gameCode,

          invite_enabled: true,

          called_numbers: [],

          prizes: cleanPrizes,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCreatedGame(data);
    } catch (error) {
      console.error(
        "Create game error:",
        error
      );

      setError(
        error?.message ||
          "Could not create game."
      );
    } finally {
      setCreating(false);
    }
  }

  /* =====================================================
     COPY LINK
  ===================================================== */

  async function copyGameLink() {
    if (!createdGame) {
      return;
    }

    const url =
      `${window.location.origin}/?game=${createdGame.game_code}`;

    try {
      await navigator.clipboard.writeText(
        url
      );

      alert(
        "Game link copied successfully."
      );
    } catch {
      window.prompt(
        "Copy this game link:",
        url
      );
    }
  }

  /* =====================================================
     NEW GAME
  ===================================================== */

  function createAnotherGame() {
    setCreatedGame(null);
    setError("");
  }

  /* =====================================================
     CREATED GAME SCREEN
  ===================================================== */

  if (createdGame) {
    const gameUrl =
      `${window.location.origin}/?game=${createdGame.game_code}`;

    return (
      <main style={pageStyle}>
        <div style={containerStyle}>

          <div style={cardStyle}>
            <h1
              style={{
                marginTop: 0,
                color: "#15803d",
              }}
            >
              ✓ Game Created
            </h1>

            <p>
              Your Tambola game has been
              successfully created.
            </p>
          </div>

          <div style={cardStyle}>
            <h2>
              {createdGame.game_name}
            </h2>

            <p>
              <b>Game Code:</b>
            </p>

            <div
              style={{
                padding: 15,
                background:
                  "#eff6ff",
                border:
                  "2px solid #2563eb",
                borderRadius: 8,
                textAlign: "center",
                fontSize: 30,
                fontWeight: "bold",
                letterSpacing: 4,
                marginBottom: 20,
              }}
            >
              {createdGame.game_code}
            </div>

            <p>
              <b>Date:</b>{" "}
              {createdGame.game_date}
            </p>

            <p>
              <b>Time:</b>{" "}
              {createdGame.game_time}
            </p>

            <p>
              <b>Ticket Price:</b>{" "}
              ₹
              {createdGame.ticket_price}
            </p>

            <p>
              <b>Ticket Limit:</b>{" "}
              {createdGame.ticket_limit}
            </p>

            <p>
              <b>Theme:</b>{" "}
              {theme}
            </p>
          </div>

          <div style={cardStyle}>
            <h2>
              Player Game Link
            </h2>

            <input
              readOnly
              value={gameUrl}
              style={{
                ...inputStyle,
                marginTop: 0,
              }}
            />

            <button
              type="button"
              onClick={
                copyGameLink
              }
              style={{
                ...buttonStyle,
                marginTop: 12,
              }}
            >
              Copy Game Link
            </button>
          </div>

          <div style={cardStyle}>
            <h2>
              Prizes
            </h2>

            {(
              createdGame.prizes ||
              []
            ).length === 0 ? (
              <p>
                No prizes were added.
              </p>
            ) : (
              (
                createdGame.prizes ||
                []
              ).map(
                (prize, index) => (
                  <div
                    key={index}
                    style={{
                      padding:
                        10,
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        7,
                      marginBottom:
                        8,
                    }}
                  >
                    <b>
                      {prize.name}
                    </b>

                    <br />

                    ₹
                    {prize.amount}
                  </div>
                )
              )
            )}
          </div>

          <div
            style={{
              ...cardStyle,
              background:
                "#fff7ed",
              border:
                "1px solid #f59e0b",
            }}
          >
            <h3>
              Current Status
            </h3>

            <p>
              🟡 Game is currently{" "}
              <b>
                UPCOMING
              </b>
              .
            </p>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              The Host Control Centre and
              player booking system will be
              added in the next stages.
            </p>
          </div>

          <button
            type="button"
            onClick={
              createAnotherGame
            }
            style={
              secondaryButtonStyle
            }
          >
            Create Another Game
          </button>

        </div>
      </main>
    );
  }

  /* =====================================================
     CREATE GAME FORM
  ===================================================== */

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        <div style={cardStyle}>
          <h1
            style={{
              marginTop: 0,
              marginBottom: 5,
            }}
          >
            {APP_NAME}
          </h1>

          <p
            style={{
              color: "#6b7280",
            }}
          >
            Host — Create New Game
          </p>
        </div>

        {error && (
          <div
            style={{
              ...cardStyle,
              background:
                "#fef2f2",
              border:
                "1px solid #ef4444",
              color: "#b91c1c",
            }}
          >
            <b>
              Could not create game
            </b>

            <p
              style={{
                wordBreak:
                  "break-word",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={
            handleCreateGame
          }
        >

          {/* GAME DETAILS */}

          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Game Details
            </h2>

            <div
              style={{
                marginBottom: 15,
              }}
            >
              <label>
                <b>Game Name</b>
              </label>

              <input
                type="text"
                value={gameName}
                onChange={(event) =>
                  setGameName(
                    event.target.value
                  )
                }
                placeholder="TambolaLive"
                style={inputStyle}
              />
            </div>

            <div
              style={{
                marginBottom: 15,
              }}
            >
              <label>
                <b>Ticket Limit</b>
              </label>

              <input
                type="number"
                min="1"
                value={ticketLimit}
                onChange={(event) =>
                  setTicketLimit(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                marginBottom: 15,
              }}
            >
              <label>
                <b>
                  Ticket Price ₹
                </b>
              </label>

              <input
                type="number"
                min="0"
                value={ticketPrice}
                onChange={(event) =>
                  setTicketPrice(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label>
                  <b>
                    Game Date
                  </b>
                </label>

                <input
                  type="date"
                  value={gameDate}
                  onChange={(event) =>
                    setGameDate(
                      event.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label>
                  <b>
                    Game Time
                  </b>
                </label>

                <input
                  type="time"
                  value={gameTime}
                  onChange={(event) =>
                    setGameTime(
                      event.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* THEME */}

          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Game Theme
            </h2>

            <select
              value={theme}
              onChange={(event) =>
                setTheme(
                  event.target.value
                )
              }
              style={inputStyle}
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

          {/* PRIZES */}

          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Prizes
            </h2>

            {prizes.map(
              (prize, index) => (
                <PrizeRow
                  key={index}
                  prize={prize}
                  index={index}
                  onNameChange={
                    updatePrizeName
                  }
                  onAmountChange={
                    updatePrizeAmount
                  }
                  onRemove={
                    removePrize
                  }
                />
              )
            )}

            <div
              style={{
                marginTop: 15,
                paddingTop: 15,
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              <label>
                <b>
                  Add Custom Prize
                </b>
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <input
                  type="text"
                  value={
                    customPrizeName
                  }
                  onChange={(event) =>
                    setCustomPrizeName(
                      event.target.value
                    )
                  }
                  placeholder="Example: Jackpot"
                  style={{
                    ...inputStyle,
                    marginTop: 0,
                  }}
                />

                <button
                  type="button"
                  onClick={
                    addCustomPrize
                  }
                  style={
                    secondaryButtonStyle
                  }
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* CREATE */}

          <div style={cardStyle}>
            <button
              type="submit"
              disabled={
                creating
              }
              style={{
                ...buttonStyle,
                width: "100%",
                opacity:
                  creating
                    ? 0.6
                    : 1,
              }}
            >
              {creating
                ? "Creating Game..."
                : "CREATE GAME"}
            </button>
          </div>

        </form>

      </div>
    </main>
  );
}

/* =======================================================
   START APPLICATION
======================================================= */

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Could not find the root element."
  );
}

createRoot(rootElement).render(
  <HostCreateGame />
);
