import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PRIZES = [
  "First Five",
  "Four Corners",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House",
];

const NUMBERS = Array.from({ length: 90 }, (_, i) => i + 1);

/* =========================================================
   HELPERS
========================================================= */

function getGameCode() {
  return new URLSearchParams(window.location.search).get("game");
}

function makeGameCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 6; i++) {
    result +=
      characters[
        Math.floor(
          Math.random() * characters.length
        )
      ];
  }

  return result;
}

function normalizeGame(row) {
  if (!row) return null;

  return {
    ...row,

    selected_prizes:
      Array.isArray(row.selected_prizes)
        ? row.selected_prizes
        : [],

    called_numbers:
      Array.isArray(row.called_numbers)
        ? row.called_numbers
        : [],
  };
}

function isGameLive(game) {
  return (
    game?.status === "live" ||
    game?.status === "started"
  );
}

/* =========================================================
   HOST PAGE
========================================================= */

function HostPage() {
  const [game, setGame] = useState(null);

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

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [prizes, setPrizes] =
    useState(
      DEFAULT_PRIZES.map((name) => ({
        name,
        amount: "",
      }))
    );

  /* -------------------------------------------------------
     CHECK LOCAL HOST GAME
  ------------------------------------------------------- */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          "tambola_host_game"
        );

      if (saved) {
        const parsed =
          JSON.parse(saved);

        if (parsed?.game_code) {
          setGame(
            normalizeGame(parsed)
          );
        }
      }
    } catch (err) {
      console.error(
        "Could not load saved host game:",
        err
      );
    }
  }, []);

  /* -------------------------------------------------------
     SAVE LOCAL HOST GAME
  ------------------------------------------------------- */

  useEffect(() => {
    if (!game?.game_code) return;

    localStorage.setItem(
      "tambola_host_game",
      JSON.stringify(game)
    );
  }, [game]);

  /* -------------------------------------------------------
     CREATE GAME
  ------------------------------------------------------- */

  async function createGame(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      let gameCode =
        makeGameCode();

      let found = true;

      while (found) {
        const {
          data,
          error: lookupError,
        } = await supabase
          .from("games")
          .select("id")
          .eq(
            "game_code",
            gameCode
          )
          .limit(1);

        if (lookupError) {
          throw lookupError;
        }

        found =
          Array.isArray(data) &&
          data.length > 0;

        if (found) {
          gameCode =
            makeGameCode();
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
            amount: Number(
              prize.amount
            ),
          }));

      const insertData = {
        host_name: "Host",

        game_name:
          gameName.trim() ||
          "TambolaLive",

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

        called_numbers: [],
      };

      const {
        data,
        error: createError,
      } = await supabase
        .from("games")
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      const newGame =
        normalizeGame(data);

      setGame(newGame);

      alert(
        `Game created successfully!\n\nGame Code: ${gameCode}`
      );
    } catch (err) {
      console.error(
        "Create game error:",
        err
      );

      setError(
        err?.message ||
          "Could not create game"
      );
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------------------
     START GAME
  ------------------------------------------------------- */

  async function startGame() {
    if (!game?.id || busy) {
      return;
    }

    const confirmed =
      window.confirm(
        "Start this game now?\n\nOnce the game starts, players will no longer be able to book tickets."
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("games")
        .update({
          status: "live",

          started_at:
            new Date().toISOString(),

          called_numbers: [],
        })
        .eq("id", game.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setGame(
        normalizeGame(data)
      );
    } catch (err) {
      console.error(
        "Start game error:",
        err
      );

      setError(
        err?.message ||
          "Could not start game"
      );
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------------------
     RESET HOST
  ------------------------------------------------------- */

  function clearHostGame() {
    const confirmed =
      window.confirm(
        "Clear this host game from this browser?"
      );

    if (!confirmed) return;

    localStorage.removeItem(
      "tambola_host_game"
    );

    setGame(null);
  }

  /* -------------------------------------------------------
     CREATE SCREEN
  ------------------------------------------------------- */

  if (!game) {
    return (
      <main
        style={{
          maxWidth: 650,
          margin: "0 auto",
          padding: 20,
        }}
      >
        <h1>
          TAMBOLA LIVE
        </h1>

        <h2>
          Create Game
        </h2>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              border:
                "1px solid #dc2626",
              padding: 12,
              borderRadius: 8,
              marginBottom: 15,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={createGame}
        >
          <label>
            <b>Game Name</b>
          </label>

          <br />

          <input
            value={gameName}
            onChange={(e) =>
              setGameName(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: 10,
              marginTop: 5,
              boxSizing:
                "border-box",
            }}
          />

          <br />
          <br />

          <label>
            <b>Ticket Limit</b>
          </label>

          <br />

          <input
            type="number"
            min="1"
            value={ticketLimit}
            onChange={(e) =>
              setTicketLimit(
                e.target.value
              )
            }
            style={{
              padding: 10,
              marginTop: 5,
            }}
          />

          <br />
          <br />

          <label>
            <b>Ticket Price</b>
          </label>

          <br />

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
              padding: 10,
              marginTop: 5,
            }}
          />

          <br />
          <br />

          <label>
            <b>Game Date</b>
          </label>

          <br />

          <input
            type="date"
            value={gameDate}
            onChange={(e) =>
              setGameDate(
                e.target.value
              )
            }
            style={{
              padding: 10,
              marginTop: 5,
            }}
          />

          <br />
          <br />

          <label>
            <b>Game Time</b>
          </label>

          <br />

          <input
            type="time"
            value={gameTime}
            onChange={(e) =>
              setGameTime(
                e.target.value
              )
            }
            style={{
              padding: 10,
              marginTop: 5,
            }}
          />

          <br />
          <br />

          <label>
            <b>Theme</b>
          </label>

          <br />

          <select
            value={theme}
            onChange={(e) =>
              setTheme(
                e.target.value
              )
            }
            style={{
              padding: 10,
              marginTop: 5,
            }}
          >
            <option>
              Classic
            </option>

            <option>
              Royal
            </option>

            <option>
              Party
            </option>

            <option>
              Bollywood
            </option>

            <option>
              Neon
            </option>

            <option>
              Elegant
            </option>
          </select>

          <h3>
            Prizes
          </h3>

          {prizes.map(
            (prize, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 10,
                }}
              >
                <label>
                  {prize.name}
                </label>

                <br />

                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={
                    prize.amount
                  }
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setPrizes(
                      (current) =>
                        current.map(
                          (
                            item,
                            i
                          ) =>
                            i ===
                            index
                              ? {
                                  ...item,
                                  amount:
                                    value,
                                }
                              : item
                        )
                    );
                  }}
                  style={{
                    padding: 8,
                    marginTop: 4,
                  }}
                />
              </div>
            )
          )}

          <br />

          <button
            type="submit"
            disabled={busy}
            style={{
              padding:
                "12px 20px",
              fontWeight:
                "bold",
            }}
          >
            {busy
              ? "Creating..."
              : "CREATE GAME"}
          </button>
        </form>
      </main>
    );
  }

  /* -------------------------------------------------------
     HOST CONTROL
  ------------------------------------------------------- */

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <h1>
        {game.game_name}
      </h1>

      <h2>
        Host Control
      </h2>

      <div
        style={{
          border:
            "2px solid #2563eb",
          borderRadius: 10,
          padding: 15,
          marginBottom: 20,
        }}
      >
        <p>
          <b>Game Code:</b>{" "}
          {game.game_code}
        </p>

        <p>
          <b>Status:</b>{" "}
          <span
            style={{
              fontWeight:
                "bold",
              color:
                isGameLive(
                  game
                )
                  ? "#16a34a"
                  : "#d97706",
            }}
          >
            {game.status}
          </span>
        </p>

        <p>
          <b>Game Link:</b>
        </p>

        <input
          readOnly
          value={`${window.location.origin}/?game=${game.game_code}`}
          style={{
            width: "100%",
            padding: 10,
            boxSizing:
              "border-box",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border:
              "1px solid #dc2626",
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {!isGameLive(
        game
      ) ? (
        <div
          style={{
            border:
              "2px solid #f59e0b",
            borderRadius: 10,
            padding: 20,
            background:
              "#fff7ed",
          }}
        >
          <h2>
            Game Ready
          </h2>

          <p>
            Players can currently
            access the booking page.
          </p>

          <p>
            When you press START GAME,
            the game status will become
            <b> live</b>.
          </p>

          <p>
            After that, players will
            automatically leave the
            booking page and enter the
            live game page.
          </p>

          <button
            onClick={startGame}
            disabled={busy}
            style={{
              padding:
                "14px 24px",
              fontWeight:
                "bold",
              fontSize: 18,
              background:
                "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
            }}
          >
            {busy
              ? "STARTING..."
              : "START GAME"}
          </button>
        </div>
      ) : (
        <HostLiveGame
          game={game}
          setGame={setGame}
          busy={busy}
          setBusy={setBusy}
        />
      )}

      <hr
        style={{
          margin:
            "30px 0",
        }}
      />

      <button
        onClick={
          clearHostGame
        }
      >
        Clear Host Game
      </button>
    </main>
  );
}

/* =========================================================
   HOST LIVE GAME
========================================================= */

function HostLiveGame({
  game,
  setGame,
  busy,
  setBusy,
}) {
  const called =
    Array.isArray(
      game.called_numbers
    )
      ? game.called_numbers
      : [];

  const remaining =
    NUMBERS.filter(
      (number) =>
        !called.includes(
          number
        )
    );

  const last =
    called.length > 0
      ? called[
          called.length - 1
        ]
      : null;

  async function callNext() {
    if (
      busy ||
      remaining.length === 0
    ) {
      return;
    }

    setBusy(true);

    try {
      const randomIndex =
        Math.floor(
          Math.random() *
            remaining.length
        );

      const nextNumber =
        remaining[
          randomIndex
        ];

      const nextCalled = [
        ...called,
        nextNumber,
      ];

      const {
        data,
        error,
      } = await supabase
        .from("games")
        .update({
          called_numbers:
            nextCalled,
          status: "live",
        })
        .eq("id", game.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setGame(
        normalizeGame(data)
      );
    } catch (err) {
      console.error(
        "Call number error:",
        err
      );

      alert(
        err?.message ||
          "Could not call number"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div
        style={{
          border:
            "3px solid #16a34a",
          borderRadius: 12,
          padding: 20,
          background:
            "#f0fff4",
          textAlign:
            "center",
        }}
      >
        <h2>
          🟢 LIVE GAME
        </h2>

        <p>
          Current Number
        </p>

        <div
          style={{
            fontSize: 72,
            fontWeight:
              "bold",
            margin:
              "20px 0",
          }}
        >
          {last || "—"}
        </div>

        <p>
          Numbers Called:{" "}
          <b>
            {called.length}
            /90
          </b>
        </p>

        <button
          onClick={callNext}
          disabled={
            busy ||
            remaining.length ===
              0
          }
          style={{
            padding:
              "14px 24px",
            fontSize: 18,
            fontWeight:
              "bold",
          }}
        >
          {busy
            ? "CALLING..."
            : "CALL NEXT NUMBER"}
        </button>
      </div>

      <h3>
        Called Numbers
      </h3>

      <div
        style={{
          display: "flex",
          flexWrap:
            "wrap",
          gap: 6,
        }}
      >
        {NUMBERS.map(
          (number) => {
            const called =
              game.called_numbers?.includes(
                number
              );

            return (
              <span
                key={number}
                style={{
                  width: 34,
                  height: 34,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid #999",
                  borderRadius: 5,
                  background:
                    called
                      ? "#111827"
                      : "#fff",
                  color:
                    called
                      ? "#fff"
                      : "#111",
                  fontWeight:
                    called
                      ? "bold"
                      : "normal",
                }}
              >
                {number}
              </span>
            );
          }
        )}
      </div>
    </section>
  );
}

/* =========================================================
   PLAYER APP
========================================================= */

function PlayerApp({
  gameCode,
}) {
  const [game, setGame] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [page, setPage] =
    useState("booking");

  /* -------------------------------------------------------
     LOAD GAME
  ------------------------------------------------------- */

  async function loadGame() {
    if (!gameCode) {
      setError(
        "No game code provided."
      );

      setLoading(false);

      return;
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from("games")
        .select("*")
        .eq(
          "game_code",
          gameCode.toUpperCase()
        )
        .limit(1);

      if (error) {
        throw error;
      }

      if (
        !data ||
        data.length === 0
      ) {
        throw new Error(
          "Game not found."
        );
      }

      const normalized =
        normalizeGame(
          data[0]
        );

      setGame(
        normalized
      );

      /*
        IMPORTANT:

        If the host has already
        started the game, immediately
        show Live Game instead of
        Booking.
      */

      if (
        isGameLive(
          normalized
        )
      ) {
        setPage(
          "live"
        );
      } else {
        setPage(
          "booking"
        );
      }
    } catch (err) {
      console.error(
        "Load player game error:",
        err
      );

      setError(
        err?.message ||
          "Could not load game."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGame();
  }, [gameCode]);

  /* -------------------------------------------------------
     REAL-TIME GAME STATUS
  ------------------------------------------------------- */

  useEffect(() => {
    if (!gameCode) {
      return;
    }

    /*
      Subscribe to changes in the
      specific game row.

      This is the important part
      that allows the player to move
      automatically from Booking to
      Live Game when the host presses
      START GAME.
    */

    const channel =
      supabase
        .channel(
          `game-status-${gameCode}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "games",
            filter:
              `game_code=eq.${gameCode.toUpperCase()}`,
          },
          (payload) => {
            const updated =
              normalizeGame(
                payload.new
              );

            setGame(
              updated
            );

            if (
              isGameLive(
                updated
              )
            ) {
              setPage(
                "live"
              );
            } else {
              setPage(
                "booking"
              );
            }
          }
        )
        .subscribe(
          (status) => {
            console.log(
              "Game realtime status:",
              status
            );
          }
        );

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [gameCode]);

  /* -------------------------------------------------------
     FALLBACK POLLING

     This also checks every 3 seconds.
     So even if realtime is not enabled
     in Supabase, the player will still
     detect the host starting the game.
  ------------------------------------------------------- */

  useEffect(() => {
    if (!gameCode) {
      return;
    }

    const interval =
      setInterval(
        async () => {
          const {
            data,
            error,
          } = await supabase
            .from("games")
            .select("*")
            .eq(
              "game_code",
              gameCode.toUpperCase()
            )
            .limit(1);

          if (
            error ||
            !data ||
            data.length === 0
          ) {
            return;
          }

          const updated =
            normalizeGame(
              data[0]
            );

          setGame(
            updated
          );

          if (
            isGameLive(
              updated
            )
          ) {
            setPage(
              "live"
            );
          }
        },
        3000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [gameCode]);

  if (loading) {
    return (
      <main
        style={{
          padding: 30,
          textAlign:
            "center",
        }}
      >
        <h2>
          Loading game...
        </h2>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          padding: 30,
        }}
      >
        <h2>
          Game Error
        </h2>

        <p>
          {error}
        </p>
      </main>
    );
  }

  if (!game) {
    return null;
  }

  /*
    NEVER show booking if the game
    has already started.
  */

  if (
    isGameLive(game) ||
    page === "live"
  ) {
    return (
      <PlayerLiveGame
        game={game}
      />
    );
  }

  return (
    <PlayerBooking
      game={game}
    />
  );
}

/* =========================================================
   PLAYER BOOKING
========================================================= */

function PlayerBooking({
  game,
}) {
  const [
    playerName,
    setPlayerName,
  ] = useState("");

  const [
    selectedTickets,
    setSelectedTickets,
  ] = useState([]);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    sent,
    setSent,
  ] = useState(false);

  const ticketLimit =
    Math.max(
      1,
      Number(
        game.ticket_limit ||
          100
      )
    );

  const tickets =
    Array.from(
      {
        length:
          ticketLimit,
      },
      (_, i) =>
        i + 1
    );

  function toggleTicket(
    ticket
  ) {
    if (
      isGameLive(game)
    ) {
      return;
    }

    setSelectedTickets(
      (current) => {
        if (
          current.includes(
            ticket
          )
        ) {
          return current.filter(
            (item) =>
              item !==
              ticket
          );
        }

        return [
          ...current,
          ticket,
        ];
      }
    );
  }

  async function bookTickets() {
    if (
      isGameLive(game)
    ) {
      alert(
        "The game has already started. Ticket booking is closed."
      );

      return;
    }

    if (
      !playerName.trim()
    ) {
      alert(
        "Please enter your name."
      );

      return;
    }

    if (
      selectedTickets.length ===
      0
    ) {
      alert(
        "Please select at least one ticket."
      );

      return;
    }

    setSending(true);

    try {
      /*
        Check the game one more time
        immediately before booking.
      */

      const {
        data: latestGame,
        error: gameError,
      } = await supabase
        .from("games")
        .select(
          "status"
        )
        .eq(
          "game_code",
          game.game_code
        )
        .limit(1);

      if (gameError) {
        throw gameError;
      }

      if (
        latestGame?.[0] &&
        isGameLive(
          latestGame[0]
        )
      ) {
        alert(
          "The game has already started. Ticket booking is closed."
        );

        return;
      }

      const {
        error,
      } = await supabase
        .from(
          "booking_requests"
        )
        .insert({
          game_code:
            game.game_code,

          player_name:
            playerName.trim(),

          ticket_numbers:
            [...selectedTickets].sort(
              (a, b) =>
                a - b
            ),

          status:
            "pending",
        });

      if (error) {
        throw error;
      }

      setSent(true);

      alert(
        "Booking request sent to the host."
      );
    } catch (err) {
      console.error(
        "Booking error:",
        err
      );

      alert(
        err?.message ||
          "Could not send booking request."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <h1>
        {game.game_name}
      </h1>

      <div
        style={{
          border:
            "2px solid #f59e0b",
          borderRadius: 10,
          padding: 15,
          background:
            "#fff7ed",
          marginBottom: 20,
        }}
      >
        <h2>
          🎟️ Ticket Booking
        </h2>

        <p>
          Game is waiting to
          start.
        </p>

        <p>
          Ticket Price:{" "}
          <b>
            ₹
            {
              game.ticket_price
            }
          </b>
        </p>
      </div>

      <h3>
        Player Name
      </h3>

      <input
        value={playerName}
        onChange={(e) =>
          setPlayerName(
            e.target.value
          )
        }
        disabled={sent}
        placeholder="Enter your name"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 10,
          boxSizing:
            "border-box",
        }}
      />

      <h3>
        Select Tickets
      </h3>

      <div
        style={{
          display: "flex",
          flexWrap:
            "wrap",
          gap: 6,
        }}
      >
        {tickets.map(
          (ticket) => {
            const selected =
              selectedTickets.includes(
                ticket
              );

            return (
              <button
                key={ticket}
                type="button"
                disabled={
                  sent ||
                  isGameLive(
                    game
                  )
                }
                onClick={() =>
                  toggleTicket(
                    ticket
                  )
                }
                style={{
                  width: 48,
                  height: 42,
                  border:
                    selected
                      ? "3px solid #2563eb"
                      : "1px solid #999",
                  borderRadius: 6,
                  background:
                    selected
                      ? "#dbeafe"
                      : "#fff",
                  fontWeight:
                    "bold",
                }}
              >
                {ticket}
              </button>
            );
          }
        )}
      </div>

      {selectedTickets.length >
        0 && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            border:
              "1px solid #2563eb",
            borderRadius: 8,
            background:
              "#eff6ff",
          }}
        >
          <b>
            Selected:
          </b>{" "}
          {selectedTickets
            .slice()
            .sort(
              (a, b) =>
                a - b
            )
            .map(
              (ticket) =>
                `#${ticket}`
            )
            .join(", ")}
        </div>
      )}

      <br />

      {!sent ? (
        <button
          onClick={
            bookTickets
          }
          disabled={
            sending ||
            selectedTickets.length ===
              0
          }
          style={{
            padding:
              "12px 20px",
            fontWeight:
              "bold",
          }}
        >
          {sending
            ? "SENDING..."
            : "BOOK TICKETS"}
        </button>
      ) : (
        <div
          style={{
            padding: 15,
            border:
              "2px solid #f59e0b",
            borderRadius: 8,
            background:
              "#fff7ed",
          }}
        >
          <h3>
            Booking Request Sent
          </h3>

          <p>
            Your request is
            waiting for host
            approval.
          </p>

          <p>
            Stay on this page.
            When the host starts
            the game, this page
            will automatically
            change to the Live
            Game.
          </p>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   PLAYER LIVE GAME
========================================================= */

function PlayerLiveGame({
  game,
}) {
  const called =
    Array.isArray(
      game.called_numbers
    )
      ? game.called_numbers
      : [];

  const last =
    called.length
      ? called[
          called.length - 1
        ]
      : null;

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <div
        style={{
          border:
            "3px solid #16a34a",
          borderRadius: 12,
          padding: 20,
          background:
            "#f0fff4",
          textAlign:
            "center",
        }}
      >
        <h1>
          🟢 LIVE GAME
        </h1>

        <h2>
          {game.game_name}
        </h2>

        <p>
          The host has started
          the game.
        </p>

        <p>
          Booking is now closed.
        </p>

        <hr />

        <p>
          Current Number
        </p>

        <div
          style={{
            fontSize: 80,
            fontWeight:
              "bold",
            margin:
              "20px 0",
          }}
        >
          {last || "—"}
        </div>

        <p>
          Numbers Called:{" "}
          <b>
            {called.length}
            /90
          </b>
        </p>
      </div>

      <h3>
        Called Numbers
      </h3>

      <div
        style={{
          display: "flex",
          flexWrap:
            "wrap",
          gap: 6,
        }}
      >
        {NUMBERS.map(
          (number) => {
            const wasCalled =
              called.includes(
                number
              );

            return (
              <span
                key={number}
                style={{
                  width: 36,
                  height: 36,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid #999",
                  borderRadius: 5,
                  background:
                    wasCalled
                      ? "#111827"
                      : "#fff",
                  color:
                    wasCalled
                      ? "#fff"
                      : "#111",
                  fontWeight:
                    wasCalled
                      ? "bold"
                      : "normal",
                }}
              >
                {number}
              </span>
            );
          }
        )}
      </div>

      <div
        style={{
          marginTop: 25,
          padding: 15,
          border:
            "1px solid #16a34a",
          borderRadius: 8,
          background:
            "#f0fff4",
        }}
      >
        <b>
          🎉 The game is live!
        </b>

        <p>
          Watch the called numbers
          above and play using your
          approved ticket.
        </p>
      </div>
    </main>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const gameCode =
    getGameCode();

  if (gameCode) {
    return (
      <PlayerApp
        gameCode={
          gameCode
        }
      />
    );
  }

  return (
    <HostPage />
  );
}

/* =========================================================
   START
========================================================= */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <App />
);
