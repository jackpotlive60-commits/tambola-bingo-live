import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/* =========================================================
   HELPERS
========================================================= */

function generateGameCode() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[
      Math.floor(
        Math.random() * chars.length
      )
    ];
  }

  return code;
}

function getGameCode() {
  return new URLSearchParams(
    window.location.search
  ).get("game");
}

/* =========================================================
   HOST CREATE GAME
========================================================= */

function CreateGame({ onCreated }) {
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

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function createGame(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      let gameCode = generateGameCode();

      /*
        Make sure the generated game code
        does not already exist.
      */

      let exists = true;

      while (exists) {
        const { data, error } =
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", gameCode)
            .limit(1);

        if (error) {
          throw error;
        }

        exists =
          Array.isArray(data) &&
          data.length > 0;

        if (exists) {
          gameCode = generateGameCode();
        }
      }

      /*
        IMPORTANT:

        We are ONLY inserting columns that
        already exist in your games table.

        We are NOT inserting prizes.
      */

      const { data, error } =
        await supabase
          .from("games")
          .insert({
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

            game_date: gameDate,

            game_time: gameTime,

            game_code: gameCode,

            invite_enabled: true,

            called_numbers: []
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      onCreated(data);

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
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "30px auto",
        padding: 20,
        boxSizing: "border-box"
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
            padding: 12,
            marginBottom: 15,
            background: "#fee2e2",
            border:
              "1px solid #ef4444",
            borderRadius: 8,
            color: "#991b1b"
          }}
        >
          <b>
            Could not create game
          </b>

          <p>
            {error}
          </p>
        </div>
      )}

      <form onSubmit={createGame}>
        <label>
          <b>
            Game Name
          </b>
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
            marginBottom: 15,
            boxSizing: "border-box"
          }}
        />

        <label>
          <b>
            Ticket Limit
          </b>
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
          required
          style={{
            padding: 10,
            marginTop: 5,
            marginBottom: 15
          }}
        />

        <br />

        <label>
          <b>
            Ticket Price
          </b>
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
          required
          style={{
            padding: 10,
            marginTop: 5,
            marginBottom: 15
          }}
        />

        <br />

        <label>
          <b>
            Game Date
          </b>
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
          required
          style={{
            padding: 10,
            marginTop: 5,
            marginBottom: 15
          }}
        />

        <br />

        <label>
          <b>
            Game Time
          </b>
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
          required
          style={{
            padding: 10,
            marginTop: 5,
            marginBottom: 20
          }}
        />

        <br />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding:
              "12px 20px",
            fontWeight: "bold",
            fontSize: 16
          }}
        >
          {loading
            ? "Creating..."
            : "CREATE GAME"}
        </button>
      </form>
    </main>
  );
}

/* =========================================================
   HOST GAME CREATED
========================================================= */

function HostGame({ game }) {
  const inviteUrl =
    `${window.location.origin}/?game=${game.game_code}`;

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "30px auto",
        padding: 20
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
          padding: 15,
          border:
            "2px solid #2563eb",
          borderRadius: 10,
          background: "#eff6ff"
        }}
      >
        <p>
          <b>
            Game Code:
          </b>
        </p>

        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            letterSpacing: 4
          }}
        >
          {game.game_code}
        </div>

        <p>
          <b>
            Status:
          </b>{" "}
          {game.status}
        </p>

        <p>
          <b>
            Date:
          </b>{" "}
          {game.game_date}
        </p>

        <p>
          <b>
            Time:
          </b>{" "}
          {game.game_time}
        </p>

        <p>
          <b>
            Ticket Price:
          </b>{" "}
          ₹{game.ticket_price}
        </p>

        <p>
          <b>
            Ticket Limit:
          </b>{" "}
          {game.ticket_limit}
        </p>
      </div>

      <hr />

      <h3>
        Player Link
      </h3>

      <input
        readOnly
        value={inviteUrl}
        style={{
          width: "100%",
          padding: 10,
          boxSizing: "border-box"
        }}
      />

      <br />
      <br />

      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              inviteUrl
            );

            alert(
              "Player link copied!"
            );
          } catch {
            prompt(
              "Copy this link:",
              inviteUrl
            );
          }
        }}
        style={{
          padding:
            "10px 18px",
          fontWeight: "bold"
        }}
      >
        COPY PLAYER LINK
      </button>

      <hr />

      <h2>
        Next Step
      </h2>

      <p>
        The game has been created
        successfully.
      </p>

      <p>
        We will add the host control,
        booking system and live-game
        transition one step at a time.
      </p>
    </main>
  );
}

/* =========================================================
   PLAYER GAME
========================================================= */

function PlayerGame({ game }) {
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "30px auto",
        padding: 20
      }}
    >
      <h1>
        {game.game_name}
      </h1>

      <div
        style={{
          padding: 15,
          border:
            "2px solid #2563eb",
          borderRadius: 10,
          background: "#eff6ff"
        }}
      >
        <p>
          <b>
            Game Code:
          </b>{" "}
          {game.game_code}
        </p>

        <p>
          <b>
            Date:
          </b>{" "}
          {game.game_date}
        </p>

        <p>
          <b>
            Time:
          </b>{" "}
          {game.game_time}
        </p>

        <p>
          <b>
            Ticket Price:
          </b>{" "}
          ₹{game.ticket_price}
        </p>

        <p>
          <b>
            Game Status:
          </b>{" "}
          {game.status}
        </p>
      </div>

      <h2>
        Player Page
      </h2>

      <p>
        This is the foundation for
        the player side.
      </p>

      <p>
        Booking and live-game
        redirection will be added
        in the next steps.
      </p>
    </main>
  );
}

/* =========================================================
   APP
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
    async function load() {
      const gameCode =
        getGameCode();

      /*
        No ?game=XXXX
        means this is the host side.
      */

      if (!gameCode) {
        setLoading(false);
        return;
      }

      /*
        Player entered through
        a game link.
      */

      const { data, error } =
        await supabase
          .from("games")
          .select("*")
          .eq(
            "game_code",
            gameCode.toUpperCase()
          )
          .limit(1);

      if (error) {
        setError(
          error.message
        );

        setLoading(false);
        return;
      }

      if (
        !data ||
        data.length === 0
      ) {
        setError(
          "Game not found."
        );

        setLoading(false);
        return;
      }

      setPlayerGame(
        data[0]
      );

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main
        style={{
          padding: 30,
          textAlign: "center"
        }}
      >
        <h2>
          Loading...
        </h2>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          padding: 30,
          textAlign: "center"
        }}
      >
        <h2>
          Game Not Found
        </h2>

        <p>
          {error}
        </p>
      </main>
    );
  }

  /*
    Player route
  */

  if (playerGame) {
    return (
      <PlayerGame
        game={playerGame}
      />
    );
  }

  /*
    Host route
  */

  if (hostGame) {
    return (
      <HostGame
        game={hostGame}
      />
    );
  }

  return (
    <CreateGame
      onCreated={(game) => {
        setHostGame(game);
      }}
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
