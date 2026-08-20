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


/* =========================================================
   HELPERS
========================================================= */

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
    localStorage.setItem(
      KEY,
      JSON.stringify(g)
    );
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

        {rows.flat().map(
          (value, index) => (

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

          )
        )}

      </div>

    </div>
  );
}


/* =========================================================
   HOST PAGE
========================================================= */

function HostPage({
  game,
  setGame
}) {

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

  const [
    bookingRequests,
    setBookingRequests
  ] = useState([]);

  const [
    bookingsLoading,
    setBookingsLoading
  ] = useState(false);

  const [
    bookingAction,
    setBookingAction
  ] = useState(null);


  /* =======================================================
     LOAD BOOKING REQUESTS
  ======================================================= */

  async function loadBookingRequests() {

    if (!game?.game_code) {
      return;
    }

    setBookingsLoading(true);

    const {
      data,
      error
    } =
      await supabase
        .from("booking_requests")
        .select("*")
        .eq(
          "game_code",
          game.game_code
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {

      console.error(
        "Booking request load error:",
        error
      );

      setBookingsLoading(false);

      return;
    }

    setBookingRequests(
      data || []
    );

    setBookingsLoading(false);
  }


  useEffect(() => {

    if (!game?.game_code) {
      return;
    }

    loadBookingRequests();

    const interval =
      setInterval(
        loadBookingRequests,
        3000
      );

    return () =>
      clearInterval(interval);

  }, [game?.game_code]);


  /* =======================================================
     APPROVE / REJECT BOOKING
  ======================================================= */

  async function updateBooking(
    requestId,
    status
  ) {

    setBookingAction(
      requestId
    );

    const {
      error
    } =
      await supabase
        .from("booking_requests")
        .update({
          status
        })
        .eq(
          "id",
          requestId
        );

    if (error) {

      alert(
        "Could not update booking: " +
        error.message
      );

      setBookingAction(null);

      return;
    }

    await loadBookingRequests();

    setBookingAction(null);
  }


  function prizeChange(
    i,
    value
  ) {

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


  /* =======================================================
     CREATE GAME
  ======================================================= */

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
            .eq(
              "game_code",
              gc
            )
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

        prizes: cleanPrizes

      };


      setGame(g);

      saveGame(g);

      setBookingRequests([]);

    } catch (e) {

      setErr(
        e.message ||
        "Could not create game"
      );

    } finally {

      setBusy(false);

    }

  }


  /* =======================================================
     COPY LINK
  ======================================================= */

  async function copyLink() {

    const url =
      `${location.origin}/?game=${game.game_code}`;

    try {

      await navigator.clipboard.writeText(
        url
      );

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


  /* =======================================================
     SHARE GAME
  ======================================================= */

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


  /* =======================================================
     CREATE GAME FORM
  ======================================================= */

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
          <p
            style={{
              color: "red"
            }}
          >
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
              setName(
                e.target.value
              )
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
              setLimit(
                e.target.value
              )
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
              setPrice(
                e.target.value
              )
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
              setDate(
                e.target.value
              )
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
              setTime(
                e.target.value
              )
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
              setTheme(
                e.target.value
              )
            }
          >

            {themes.map(
              (t) => (
                <option
                  key={t}
                  value={t}
                >
                  {t}
                </option>
              )
            )}

          </select>


          <h3>
            Prizes
          </h3>


          {prizes.map(
            (p, i) => (

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

            )
          )}


          <div>

            <input
              placeholder="Custom prize"
              value={custom}
              onChange={(e) =>
                setCustom(
                  e.target.value
                )
              }
            />

            <button
              type="button"
              onClick={() => {

                if (
                  !custom.trim()
                ) {
                  return;
                }

                setPrizes(
                  (p) => [
                    ...p,
                    {
                      name:
                        custom.trim(),
                      amount: "",
                      approved: false,
                      winner: null
                    }
                  ]
                );

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


  /* =======================================================
     HOST CONTROL CENTRE
  ======================================================= */

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


  const pendingBookings =
    bookingRequests.filter(
      (r) =>
        r.status === "pending"
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

        {themes.map(
          (t) => (
            <option
              key={t}
              value={t}
            >
              {t}
            </option>
          )
        )}

      </select>


      <hr />


      <h3>
        Share Game
      </h3>


      <input
        readOnly
        value={inviteUrl}
        style={{
          width: "70%",
          boxSizing: "border-box"
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


      {/* =================================================
          PRIZES
      ================================================= */}

      <h2>
        Prizes
      </h2>


      {!visiblePrizes.length && (
        <p>
          No prizes added yet.
        </p>
      )}


      {visiblePrizes.map(
        (p) => {

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
        }
      )}


      <hr />


      {/* =================================================
          BOOKING REQUESTS
      ================================================= */}

      <h2>
        Ticket Bookings
      </h2>


      <div
        style={{
          background:
            pendingBookings.length
              ? "#fff7ed"
              : "#f5f5f5",
          border:
            pendingBookings.length
              ? "2px solid #f59e0b"
              : "1px solid #ccc",
          borderRadius: 10,
          padding: 15,
          marginBottom: 15
        }}
      >

        <h3
          style={{
            marginTop: 0
          }}
        >
          Pending Requests:
          {" "}
          {pendingBookings.length}
        </h3>


        {bookingsLoading && (
          <p>
            Checking for booking requests...
          </p>
        )}


        {!bookingsLoading &&
          pendingBookings.length === 0 && (

            <p>
              No pending booking requests.
            </p>

          )}

      </div>


      {pendingBookings.map(
        (request) => (

          <div
            key={request.id}
            style={{
              border:
                "2px solid #ddd",
              borderRadius: 10,
              padding: 15,
              marginBottom: 12,
              background: "#fff"
            }}
          >

            <h3
              style={{
                marginTop: 0
              }}
            >
              {request.player_name}
            </h3>


            <p>
              <b>
                Requested Tickets:
              </b>
            </p>


            <p
              style={{
                fontSize: 18,
                fontWeight: "bold"
              }}
            >
              {Array.isArray(
                request.ticket_numbers
              )
                ? request.ticket_numbers
                    .map(
                      (n) =>
                        `#${n}`
                    )
                    .join(", ")
                : String(
                    request.ticket_numbers
                  )}
            </p>


            <p
              style={{
                fontSize: 12,
                color: "#666"
              }}
            >
              Requested:
              {" "}
              {request.created_at
                ? new Date(
                    request.created_at
                  ).toLocaleString()
                : "-"}
            </p>


            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap"
              }}
            >

              <button
                onClick={() =>
                  updateBooking(
                    request.id,
                    "approved"
                  )
                }
                disabled={
                  bookingAction ===
                  request.id
                }
                style={{
                  padding:
                    "10px 18px",
                  fontWeight: "bold",
                  background:
                    "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6
                }}
              >
                {bookingAction ===
                request.id
                  ? "Updating..."
                  : "✓ Approve"}
              </button>


              <button
                onClick={() =>
                  updateBooking(
                    request.id,
                    "rejected"
                  )
                }
                disabled={
                  bookingAction ===
                  request.id
                }
                style={{
                  padding:
                    "10px 18px",
                  fontWeight: "bold",
                  background:
                    "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6
                }}
              >
                ✕ Reject
              </button>

            </div>

          </div>

        )
      )}


      {/* =================================================
          PREVIOUS REQUESTS
      ================================================= */}

      {bookingRequests.some(
        (r) =>
          r.status !== "pending"
      ) && (

        <>

          <h3>
            Processed Requests
          </h3>


          {bookingRequests
            .filter(
              (r) =>
                r.status !==
                "pending"
            )
            .map(
              (request) => (

                <div
                  key={request.id}
                  style={{
                    border:
                      "1px solid #ddd",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8
                  }}
                >

                  <b>
                    {request.player_name}
                  </b>

                  {" — "}

                  {Array.isArray(
                    request.ticket_numbers
                  )
                    ? request.ticket_numbers
                        .map(
                          (n) =>
                            `#${n}`
                        )
                        .join(", ")
                    : String(
                        request.ticket_numbers
                      )}

                  <p
                    style={{
                      marginBottom: 0
                    }}
                  >
                    Status:
                    {" "}
                    <b>
                      {request.status}
                    </b>
                  </p>

                </div>

              )
            )}

        </>

      )}


      <hr />


      {/* =================================================
          LIVE GAME
      ================================================= */}

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


      {prizes.map(
        (p, i) => (

          <p key={i}>
            {p.name}:
            {" "}
            ₹{p.amount}
          </p>

        )
      )}


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

function Booking({
  game
}) {

  const [player, setPlayer] =
    useState("");

  const [selected, setSelected] =
    useState([]);

  const [sent, setSent] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [message, setMessage] =
    useState("");


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


  /* =======================================================
     SELECT / UNSELECT TICKET
  ======================================================= */

  function toggleTicket(
    ticketNumber
  ) {

    if (sent) {
      return;
    }


    setSelected(
      (current) => {

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

      }
    );
  }


  /* =======================================================
     SEND BOOKING REQUEST TO SUPABASE
  ======================================================= */

  async function send() {

    if (
      !player.trim() ||
      selected.length === 0
    ) {

      alert(
        "Enter your name and select tickets."
      );

      return;
    }


    setSending(true);

    setMessage("");


    const sorted =
      [...selected].sort(
        (a, b) => a - b
      );


    try {

      /*
         First check whether this player
         already has a pending request
         for this game.
      */

      const {
        data: existing,
        error: existingError
      } =
        await supabase
          .from("booking_requests")
          .select("*")
          .eq(
            "game_code",
            game.game_code
          )
          .eq(
            "player_name",
            player.trim()
          )
          .eq(
            "status",
            "pending"
          );


      if (existingError) {
        throw existingError;
      }


      if (
        existing &&
        existing.length > 0
      ) {

        setMessage(
          "You already have a pending booking request for this game."
        );

        setSending(false);

        return;
      }


      /*
         THIS IS THE IMPORTANT FIX.

         The booking is now stored in
         Supabase instead of localStorage.

         Host Control Centre reads the
         same table.
      */

      const {
        data,
        error
      } =
        await supabase
          .from("booking_requests")
          .insert({

            game_code:
              game.game_code,

            player_name:
              player.trim(),

            ticket_numbers:
              sorted,

            status:
              "pending"

          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      console.log(
        "Booking request created:",
        data
      );


      setSent(true);

      setMessage(
        `Booking request sent for ${sorted
          .map(
            (n) => `#${n}`
          )
          .join(", ")}. Waiting for host approval.`
      );


    } catch (e) {

      console.error(
        "Booking request error:",
        e
      );

      setMessage(
        "Could not send booking request: " +
        e.message
      );

    } finally {

      setSending(false);

    }
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
        disabled={
          sent ||
          sending
        }
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

              disabled={
                sent ||
                sending
              }

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


      {message && (

        <div
          style={{
            border:
              "1px solid #ccc",
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
            background:
              sent
                ? "#f0fff4"
                : "#fff7ed"
          }}
        >
          {message}
        </div>

      )}


      {!sent ? (

        <button
          type="button"
          onClick={send}
          disabled={
            sending ||
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
          {sending
            ? "SENDING..."
            : "BOOK TICKETS"}
        </button>

      ) : (

        <div>

          <p>
            <b>
              Booking request sent ✓
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


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {

    async function initialize() {

      /*
         PLAYER LINK

         If URL contains ?game=XXXXXX,
         load that game as a player.
      */

      const gc =
        getGameCode();


      if (gc) {

        await loadPlayer(gc);

        return;
      }


      /*
         HOST PAGE

         If there is no ?game= code,
         restore the host game from
         localStorage.
      */

      const saved =
        loadGame();


      if (saved) {

        setGame(saved);

        setPage("host");

      }


      setLoading(false);

    }


    initialize();

  }, []);


  /* =======================================================
     ALWAYS SAVE HOST GAME
  ======================================================= */

  useEffect(() => {

    if (game) {

      saveGame(game);

    }

  }, [game]);


  /* =======================================================
     LOAD PLAYER GAME FROM SUPABASE
  ======================================================= */

  async function loadPlayer(gc) {

    setLoading(true);

    setError("");


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


  /* =======================================================
     LOADING
  ======================================================= */

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


  /* =======================================================
     ERROR
  ======================================================= */

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


  /* =======================================================
     PLAYER INVITATION
  ======================================================= */

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


  /* =======================================================
     PLAYER BOOKING
  ======================================================= */

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


  /* =======================================================
     HOST
  ======================================================= */

  return (

    <HostPage
      game={game}
      setGame={setGame}
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
