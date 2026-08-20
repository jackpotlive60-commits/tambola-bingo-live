import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

const nums = Array.from({ length: 90 }, (_, i) => i + 1);

const KEY = "tambola_bingo_live_host_game";

const themes = [
  "Classic",
  "Royal",
  "Party",
  "Bollywood",
  "Neon",
  "Elegant"
];

const defaultPrizes = [
  "First Five",
  "Four Corners",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House"
].map((name) => ({
  name,
  amount: "",
  approved: false,
  winner: null
}));

function code6() {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from(
    { length: 6 },
    () => s[Math.floor(Math.random() * s.length)]
  ).join("");
}

function getGameCode() {
  return new URLSearchParams(location.search).get("game");
}

function saveGame(g) {
  if (g) {
    localStorage.setItem(KEY, JSON.stringify(g));
  } else {
    localStorage.removeItem(KEY);
  }
}

function loadGame() {
  try {
    const g = JSON.parse(
      localStorage.getItem(KEY)
    );

    return g?.game_code ? g : null;
  } catch {
    return null;
  }
}


/* =========================================================
   TAMBOLA TICKET
========================================================= */

function Ticket({
  n,
  name = "",
  selected = false,
  onClick
}) {

  const masks = [
    [
      [1, 0, 1, 0, 1, 0, 1, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 1],
      [1, 0, 1, 0, 1, 1, 0, 0, 1]
    ],

    [
      [1, 0, 0, 1, 1, 0, 1, 0, 1],
      [0, 1, 1, 0, 0, 1, 0, 1, 1],
      [1, 0, 1, 0, 1, 1, 0, 1, 0]
    ],

    [
      [1, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0]
    ]
  ];

  const rows =
    masks[(Number(n) - 1) % masks.length].map(
      (row) => [...row]
    );

  const used = new Set();

  for (let c = 0; c < 9; c++) {

    const min =
      c === 0
        ? 1
        : c * 10;

    const max =
      c === 8
        ? 90
        : c * 10 + 9;

    const values = Array.from(
      { length: max - min + 1 },
      (_, i) => min + i
    );

    const shift =
      (Number(n) * (c + 3) + c * 7) %
      values.length;

    const rotated =
      values.slice(shift).concat(
        values.slice(0, shift)
      );

    let index = 0;

    for (let r = 0; r < 3; r++) {

      if (rows[r][c]) {

        let value =
          rotated[index % rotated.length];

        let tries = 0;

        while (
          used.has(value) &&
          tries < rotated.length
        ) {

          index++;

          value =
            rotated[
              index % rotated.length
            ];

          tries++;
        }

        rows[r][c] = value;

        used.add(value);

        index++;
      }
    }
  }

  for (let r = 0; r < 3; r++) {

    let count =
      rows[r].filter(Boolean).length;

    for (
      let c = 0;
      c < 9 && count < 5;
      c++
    ) {

      if (!rows[r][c]) {

        const min =
          c === 0
            ? 1
            : c * 10;

        const max =
          c === 8
            ? 90
            : c * 10 + 9;

        for (
          let value = min;
          value <= max;
          value++
        ) {

          if (!used.has(value)) {

            rows[r][c] = value;

            used.add(value);

            count++;

            break;
          }
        }
      }
    }
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: "100%",
        boxSizing: "border-box",
        border: selected
          ? "3px solid #16a34a"
          : "1px solid #333",
        padding: 8,
        marginBottom: 18,
        background: "#fff",
        cursor: "pointer",
        borderRadius: 8
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }}
      >

        <b>
          Ticket #{n}
        </b>

        {selected && (
          <span>
            ✓ Selected
          </span>
        )}

      </div>

      {name && (
        <div
          style={{
            fontSize: 13,
            marginBottom: 6
          }}
        >
          {name}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(9, minmax(0, 1fr))",
          border: "1px solid #333",
          width: "100%",
          boxSizing: "border-box"
        }}
      >

        {rows.flat().map((value, index) => (

          <div
            key={`cell-${n}-${index}`}
            style={{
              border: "1px solid #aaa",
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: value
                ? "bold"
                : "normal",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          >
            {value || ""}
          </div>

        ))}

      </div>

    </div>
  );
}


/* =========================================================
   HOST PAGE
========================================================= */

function HostPage({ game, setGame }) {

  /*
     IMPORTANT FIX

     Do NOT use:

     const [creating, setCreating] =
       useState(!game);

     That value only gets calculated on
     the first render.

     After refresh the saved game loads
     slightly later, but "creating" would
     remain true.

     We therefore determine this directly
     from the current game value.
  */

  const [name, setName] =
    useState(
      game?.game_name ||
      "TambolaLive"
    );

  const [limit, setLimit] =
    useState(
      game?.ticket_limit ||
      100
    );

  const [price, setPrice] =
    useState(
      game?.ticket_price ||
      20
    );

  const [date, setDate] =
    useState(
      game?.game_date ||
      ""
    );

  const [time, setTime] =
    useState(
      game?.game_time ||
      ""
    );

  const [theme, setTheme] =
    useState(
      game?.theme ||
      "Classic"
    );

  const [prizes, setPrizes] =
    useState(
      game?.prizes?.length
        ? game.prizes
        : defaultPrizes
    );

  const [custom, setCustom] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [err, setErr] =
    useState("");


  function prizeChange(i, value) {

    setPrizes((p) =>
      p.map((x, j) =>
        j === i
          ? {
              ...x,
              amount: value
            }
          : x
      )
    );

  }


  async function createGame(e) {

    e.preventDefault();

    setBusy(true);

    setErr("");

    try {

      let gc = code6();

      while (
        (
          await supabase
            .from("games")
            .select("id")
            .eq("game_code", gc)
            .maybeSingle()
        ).data
      ) {

        gc = code6();
      }


      const cleanPrizes =
        prizes.filter(
          (p) =>
            p.amount !== "" &&
            p.amount !== null &&
            p.amount !== undefined
        );


      const {
        data,
        error
      } =
        await supabase
          .from("games")
          .insert({

            host_name: "Host",

            game_name:
              name.trim() ||
              "TambolaLive",

            status: "upcoming",

            ticket_limit:
              Number(limit),

            ticket_price:
              Number(price),

            call_interval_seconds: 5,

            game_date: date,

            game_time: time,

            game_code: gc,

            invite_enabled: true

          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      const g = {

        ...data,

        host_name: "Host",

        game_name:
          name.trim() ||
          "TambolaLive",

        theme,

        gameStarted: false,

        calledNumbers: [],

        prizes: cleanPrizes,

        bookingRequests: []

      };


      setGame(g);

      saveGame(g);

    } catch (e) {

      setErr(
        e.message ||
        "Could not create game"
      );

    } finally {

      setBusy(false);

    }

  }


  async function copyLink() {

    const url =
      `${location.origin}/?game=${game.game_code}`;

    try {

      await navigator.clipboard.writeText(url);

      alert(
        "Game link copied."
      );

    } catch {

      prompt(
        "Copy this game link:",
        url
      );

    }

  }


  async function shareGame() {

    const url =
      `${location.origin}/?game=${game.game_code}`;

    const message =
`Join my Tambola game!

${game.game_name || "TambolaLive"}

Date: ${game.game_date || "-"}
Time: ${game.game_time || "-"}
Ticket Price: ₹${game.ticket_price || 0}

Join here:
${url}`;


    if (navigator.share) {

      try {

        await navigator.share({

          title:
            game.game_name ||
            "TambolaLive",

          text: message,

          url

        });

      } catch (e) {

        if (
          e?.name !==
          "AbortError"
        ) {

          console.log(e);

        }

      }

    } else {

      try {

        await navigator.clipboard.writeText(
          message
        );

        alert(
          "Game details copied."
        );

      } catch {

        prompt(
          "Copy this:",
          message
        );

      }

    }

  }


  /*
     IMPORTANT FIX:

     If there is no game, show Create Game.

     If a saved game exists, show the
     Host Control Centre.

     This automatically works after refresh.
  */

  if (!game) {

    return (

      <main
        style={{
          maxWidth: 600,
          margin: "20px auto",
          padding: 20
        }}
      >

        <h1>
          TAMBOLA LIVE
        </h1>

        <h2>
          Create Game
        </h2>

        {err && (
          <p>
            {err}
          </p>
        )}

        <form
          onSubmit={createGame}
        >

          <label>
            Game Name
          </label>

          <br />

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="TambolaLive"
          />

          <br />
          <br />

          <label>
            Ticket Limit
          </label>

          <br />

          <input
            type="number"
            min="1"
            value={limit}
            onChange={(e) =>
              setLimit(e.target.value)
            }
            required
          />

          <br />
          <br />

          <label>
            Ticket Price
          </label>

          <br />

          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
            required
          />

          <br />
          <br />

          <label>
            Game Date
          </label>

          <br />

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
            required
          />

          <br />
          <br />

          <label>
            Game Time
          </label>

          <br />

          <input
            type="time"
            value={time}
            onChange={(e) =>
              setTime(e.target.value)
            }
            required
          />

          <br />
          <br />

          <label>
            Game Theme
          </label>

          <br />

          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value)
            }
          >

            {themes.map((t) => (
              <option
                key={t}
                value={t}
              >
                {t}
              </option>
            ))}

          </select>


          <h3>
            Prizes
          </h3>


          {prizes.map((p, i) => (

            <div
              key={i}
              style={{
                marginBottom: 8
              }}
            >

              <label>
                {p.name}
              </label>

              <br />

              <input
                type="number"
                value={p.amount}
                onChange={(e) =>
                  prizeChange(
                    i,
                    e.target.value
                  )
                }
                placeholder="Amount"
              />

            </div>

          ))}


          <div>

            <input
              placeholder="Custom prize"
              value={custom}
              onChange={(e) =>
                setCustom(e.target.value)
              }
            />

            <button
              type="button"
              onClick={() => {

                if (!custom.trim()) {
                  return;
                }

                setPrizes((p) => [
                  ...p,
                  {
                    name:
                      custom.trim(),
                    amount: "",
                    approved: false,
                    winner: null
                  }
                ]);

                setCustom("");

              }}
            >
              Add
            </button>

          </div>


          <br />

          <button
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Creating..."
              : "Create Game"}
          </button>

        </form>

      </main>

    );

  }


  /*
     HOST CONTROL CENTRE
  */

  const inviteUrl =
    `${location.origin}/?game=${game.game_code}`;


  function changeTheme(value) {

    const updated = {
      ...game,
      theme: value
    };

    setGame(updated);

    saveGame(updated);

  }


  function approvePrize(i) {

    const updatedPrizes =
      (game.prizes || []).map(
        (p, j) =>
          j === i
            ? {
                ...p,
                approved:
                  !p.approved
              }
            : p
      );


    const updated = {
      ...game,
      prizes: updatedPrizes
    };

    setGame(updated);

    saveGame(updated);

  }


  const visiblePrizes =
    (game.prizes || []).filter(
      (p) =>
        p.amount !== "" &&
        p.amount !== null &&
        p.amount !== undefined
    );


  return (

    <main
      style={{
        maxWidth: 700,
        margin: "20px auto",
        padding: 20
      }}
    >

      <h1>
        {game.game_name}
      </h1>

      <h2>
        Host Control Centre
      </h2>

      <p>
        Date: {game.game_date}
      </p>

      <p>
        Time: {game.game_time}
      </p>

      <p>
        Ticket Price:
        {" "}
        ₹{game.ticket_price}
      </p>

      <p>
        Ticket Limit:
        {" "}
        {game.ticket_limit}
      </p>


      <hr />


      <h3>
        Game Theme
      </h3>

      <select
        value={
          game.theme ||
          "Classic"
        }
        onChange={(e) =>
          changeTheme(
            e.target.value
          )
        }
      >

        {themes.map((t) => (
          <option
            key={t}
            value={t}
          >
            {t}
          </option>
        ))}

      </select>


      <hr />


      <h3>
        Share Game
      </h3>

      <input
        readOnly
        value={inviteUrl}
        style={{
          width: "70%"
        }}
      />

      <button
        onClick={copyLink}
      >
        Copy Link
      </button>

      <button
        onClick={shareGame}
        style={{
          marginLeft: 8
        }}
      >
        Share Game
      </button>


      <hr />


      <h2>
        Prizes
      </h2>


      {!visiblePrizes.length && (
        <p>
          No prizes added yet.
        </p>
      )}


      {visiblePrizes.map((p) => {

        const i =
          (game.prizes || [])
            .indexOf(p);

        return (

          <div
            key={i}
            style={{
              border:
                "1px solid #ccc",
              padding: 10,
              marginBottom: 8
            }}
          >

            <b>
              {p.name}
            </b>

            <p>
              Amount:
              {" "}
              ₹{p.amount}
            </p>

            <p>
              Status:
              {" "}

              <b>
                {p.approved
                  ? "Approved"
                  : "Pending"}
              </b>
            </p>

            <button
              onClick={() =>
                approvePrize(i)
              }
            >
              {p.approved
                ? "Remove Approval"
                : "Approve Prize"}
            </button>

          </div>

        );

      })}


      <hr />


      <h2>
        Ticket Bookings
      </h2>

      <p>
        Pending booking requests
        will appear here.
      </p>

      <div
        style={{
          border:
            "1px solid #ccc",
          padding: 15
        }}
      >
        No pending bookings yet.
      </div>


      <hr />


      <h2>
        Live Game
      </h2>

      <Live
        game={game}
        setGame={setGame}
      />


      <hr />


      <button
        onClick={() => {

          if (
            confirm(
              "End this game?"
            )
          ) {

            saveGame(null);

            setGame(null);

          }

        }}
      >
        End Game
      </button>

    </main>

  );

}


/* =========================================================
   LIVE GAME
========================================================= */

function Live({
  game,
  setGame
}) {

  const called =
    game.calledNumbers || [];

  const last =
    called.at(-1);

  const remaining =
    nums.filter(
      (n) =>
        !called.includes(n)
    );


  function start() {

    const updated = {
      ...game,
      gameStarted: true,
      status: "live",
      calledNumbers: []
    };

    setGame(updated);

    saveGame(updated);

  }


  function callNext() {

    if (!game.gameStarted) {
      return;
    }

    if (!remaining.length) {
      return;
    }

    const n =
      remaining[
        Math.floor(
          Math.random() *
          remaining.length
        )
      ];


    const updated = {
      ...game,
      status: "live",
      calledNumbers: [
        ...called,
        n
      ]
    };

    setGame(updated);

    saveGame(updated);

  }


  function reset() {

    const updated = {
      ...game,
      gameStarted: false,
      status: "upcoming",
      calledNumbers: []
    };

    setGame(updated);

    saveGame(updated);

  }


  return (

    <section>

      <p>
        Current Number:
        {" "}
        <b>
          {last || "—"}
        </b>
      </p>

      <p>
        Called:
        {" "}
        {called.length}/90
      </p>


      {!game.gameStarted ? (

        <button
          onClick={start}
        >
          Start Game
        </button>

      ) : (

        <>

          <button
            onClick={callNext}
          >
            Call Next Number
          </button>

          <button
            onClick={reset}
            style={{
              marginLeft: 8
            }}
          >
            Reset
          </button>

        </>

      )}


      <p>
        {called.length
          ? called.join(", ")
          : "No numbers called."}
      </p>

    </section>

  );

}


/* =========================================================
   PLAYER INVITATION
========================================================= */

function Invitation({
  game,
  accept
}) {

  const prizes =
    (game.prizes || []).filter(
      (p) =>
        p.amount !== "" &&
        p.amount !== null &&
        p.amount !== undefined
    );


  return (

    <main
      style={{
        maxWidth: 600,
        margin: "20px auto",
        padding: 20
      }}
    >

      <h1>
        {game.game_name}
      </h1>

      <p>
        <b>Date:</b>
        {" "}
        {game.game_date}
      </p>

      <p>
        <b>Time:</b>
        {" "}
        {game.game_time}
      </p>

      <p>
        <b>Ticket Price:</b>
        {" "}
        ₹{game.ticket_price}
      </p>

      <p>
        <b>Available Tickets:</b>
        {" "}
        {game.ticket_limit}
      </p>

      <p>
        <b>Status:</b>
        {" "}
        {game.status}
      </p>


      <h3>
        Prize List
      </h3>


      {prizes.map((p, i) => (

        <p key={i}>
          {p.name}:
          {" "}
          ₹{p.amount}
        </p>

      ))}


      <button
        onClick={accept}
      >
        I ACCEPT
      </button>

    </main>

  );

}


/* =========================================================
   PLAYER BOOKING
========================================================= */

function Booking({ game }) {

  const [player, setPlayer] =
    useState("");

  const [selected, setSelected] =
    useState([]);

  const [sent, setSent] =
    useState(false);


  const ticketLimit =
    Math.max(
      1,
      Number(
        game.ticket_limit || 100
      )
    );


  const ticketNumbers =
    Array.from(
      {
        length: ticketLimit
      },
      (_, i) => i + 1
    );


  function toggleTicket(
    ticketNumber
  ) {

    if (sent) {
      return;
    }

    setSelected((current) => {

      if (
        current.includes(
          ticketNumber
        )
      ) {

        return current.filter(
          (x) =>
            x !== ticketNumber
        );

      }

      return [
        ...current,
        ticketNumber
      ];

    });

  }


  function send() {

    if (
      !player.trim() ||
      selected.length === 0
    ) {

      alert(
        "Enter your name and select tickets."
      );

      return;
    }


    const sorted =
      [...selected].sort(
        (a, b) => a - b
      );


    const text =
`Hi ${game.host_name || "Host"}, ${player.trim()} wants to book ${sorted.map((n) => `#${n}`).join(", ")} for ${game.game_name}. Please approve my booking.`;


    const request = {

      id: Date.now(),

      playerName:
        player.trim(),

      ticketNumbers:
        sorted,

      status:
        "pending",

      createdAt:
        new Date().toISOString()

    };


    localStorage.setItem(
      "tambola_player_request_" +
        game.game_code,

      JSON.stringify(request)
    );


    setSent(true);


    location.href =
      `https://wa.me/?text=${encodeURIComponent(
        text
      )}`;

  }


  const actualTickets =
    ticketNumbers.map(
      (ticketNumber) => (

        <Ticket
          key={
            "actual-ticket-" +
            ticketNumber
          }

          n={ticketNumber}

          name={player}

          selected={
            selected.includes(
              ticketNumber
            )
          }

          onClick={() =>
            toggleTicket(
              ticketNumber
            )
          }
        />

      )
    );


  return (

    <main
      style={{
        width: "100%",
        maxWidth: 700,
        margin: "20px auto",
        padding: 20,
        boxSizing: "border-box"
      }}
    >

      <h1>
        Ticket Booking
      </h1>

      <p>
        <b>
          {game.game_name}
        </b>
      </p>


      <h3>
        Player Name
      </h3>

      <input
        type="text"
        placeholder="Player name"
        value={player}
        onChange={(e) =>
          setPlayer(
            e.target.value
          )
        }
        disabled={sent}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 10,
          boxSizing: "border-box"
        }}
      />


      <h3>
        Select Ticket
      </h3>


      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
          marginBottom: 30
        }}
      >

        {ticketNumbers.map(
          (ticketNumber) => (

            <button
              key={
                "ticket-number-" +
                ticketNumber
              }

              type="button"

              onClick={() =>
                toggleTicket(
                  ticketNumber
                )
              }

              disabled={sent}

              style={{
                padding:
                  "7px 10px",

                border:
                  "1px solid #555",

                borderRadius: 5,

                background:
                  selected.includes(
                    ticketNumber
                  )
                    ? "#90ee90"
                    : "#fff",

                fontWeight:
                  selected.includes(
                    ticketNumber
                  )
                    ? "bold"
                    : "normal"
              }}
            >

              {selected.includes(
                ticketNumber
              )
                ? "✓ "
                : ""}

              #{ticketNumber}

            </button>

          )
        )}

      </div>


      <h3>
        All Actual 3 × 9 Tambola Tickets
      </h3>

      <p>
        Tap any actual ticket to
        select or unselect it.
      </p>


      <div
        style={{
          width: "100%",
          display: "block",
          boxSizing: "border-box"
        }}
      >

        {actualTickets}

      </div>


      {selected.length > 0 && (

        <div
          style={{
            border:
              "1px solid #16a34a",

            borderRadius: 8,

            padding: 12,

            marginTop: 10,

            marginBottom: 15,

            background:
              "#f0fff4"
          }}
        >

          <b>
            Selected Tickets
          </b>

          <p>
            {selected
              .slice()
              .sort(
                (a, b) => a - b
              )
              .map(
                (n) =>
                  `#${n}`
              )
              .join(", ")}
          </p>

        </div>

      )}


      {!sent ? (

        <button
          type="button"
          onClick={send}
          disabled={
            !player.trim() ||
            selected.length === 0
          }
          style={{
            padding:
              "10px 18px",

            fontWeight: "bold",

            marginBottom: 30
          }}
        >
          BOOK TICKETS
        </button>

      ) : (

        <div>

          <p>
            <b>
              Booking request sent.
            </b>
          </p>

          <p>
            Waiting for host approval.
          </p>

        </div>

      )}

    </main>

  );

}


/* =========================================================
   APP
========================================================= */

function App() {

  const [game, setGame] =
    useState(null);

  const [playerGame, setPlayerGame] =
    useState(null);

  const [page, setPage] =
    useState("host");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    const saved =
      loadGame();

    if (saved) {

      setGame(saved);

      setPage("host");

    }


    const gc =
      getGameCode();

    if (gc) {

      loadPlayer(gc);

    } else {

      setLoading(false);

    }

  }, []);


  useEffect(() => {

    if (game) {

      saveGame(game);

    }

  }, [game]);


  async function loadPlayer(gc) {

    const {
      data,
      error
    } =
      await supabase
        .from("games")
        .select("*")
        .eq(
          "game_code",
          gc.toUpperCase()
        )
        .maybeSingle();


    if (
      error ||
      !data
    ) {

      setError(
        error?.message ||
        "Game not found"
      );

      setLoading(false);

      return;

    }


    const g = {

      ...data,

      prizes:
        Array.isArray(
          data.prizes
        )
          ? data.prizes
          : defaultPrizes,

      calledNumbers:
        Array.isArray(
          data.calledNumbers
        )
          ? data.calledNumbers
          : [],

      bookingRequests:
        Array.isArray(
          data.bookingRequests
        )
          ? data.bookingRequests
          : []

    };


    setPlayerGame(g);

    setPage("invitation");

    setLoading(false);

  }


  if (loading) {

    return (

      <main
        style={{
          padding: 20,
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
          padding: 20
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


  if (
    playerGame &&
    page === "invitation"
  ) {

    return (

      <Invitation
        game={playerGame}
        accept={() =>
          setPage("booking")
        }
      />

    );

  }


  if (
    playerGame &&
    page === "booking"
  ) {

    return (

      <Booking
        game={playerGame}
      />

    );

  }


  return (

    <HostPage
      game={game}
      setGame={setGame}
    />

  );

}


createRoot(
  document.getElementById("root")
).render(
  <App />
);
