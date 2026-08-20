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
   TICKET
========================================================= */

function Ticket({
  n,
  name = "",
  selected = false,
  status = "available",
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


  const isAvailable =
    status === "available";

  const isPending =
    status === "pending";

  const isApproved =
    status === "approved";


  let borderColor = "#333";
  let background = "#fff";
  let label = "Available";

  if (isPending) {
    borderColor = "#f59e0b";
    background = "#fff7ed";
    label = "⏳ Pending";
  }

  if (isApproved) {
    borderColor = "#16a34a";
    background = "#f0fff4";
    label = `✓ ${name || "Booked"}`;
  }

  if (selected) {
    borderColor = "#2563eb";
    background = "#eff6ff";
    label = "✓ Selected";
  }


  return (

    <div
      onClick={
        isAvailable
          ? onClick
          : undefined
      }

      style={{
        width: "100%",
        boxSizing: "border-box",

        border:
          selected
            ? "3px solid #2563eb"
            : `2px solid ${borderColor}`,

        padding: 8,
        marginBottom: 18,

        background,

        cursor:
          isAvailable
            ? "pointer"
            : "not-allowed",

        borderRadius: 8,

        opacity:
          isApproved
            ? 0.95
            : 1
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

        <span
          style={{
            fontWeight: "bold",
            fontSize: 13
          }}
        >
          {label}
        </span>

      </div>


      {name && isApproved && (

        <div
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: "#15803d",
            marginBottom: 6
          }}
        >
          Booked by: {name}
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
                border:
                  "1px solid #aaa",

                height: 34,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                fontWeight:
                  value
                    ? "bold"
                    : "normal",

                fontSize: 14,

                boxSizing:
                  "border-box"
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
   BOOKING REQUEST STATUS
========================================================= */

function getTicketStatus(
  ticketNumber,
  requests
) {

  for (const request of requests) {

    const tickets =
      Array.isArray(
        request.ticket_numbers
      )
        ? request.ticket_numbers
        : [];

    if (
      tickets.includes(ticketNumber)
    ) {

      if (
        request.status ===
        "approved"
      ) {

        return {
          status: "approved",
          player:
            request.player_name ||
            ""
        };

      }

      if (
        request.status ===
        "pending"
      ) {

        return {
          status: "pending",
          player:
            request.player_name ||
            ""
        };

      }

    }

  }

  return {
    status: "available",
    player: ""
  };
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
    bookingLoading,
    setBookingLoading
  ] = useState(false);


  /* =======================================================
     LOAD BOOKING REQUESTS
  ======================================================= */

  async function loadBookingRequests() {

    if (!game?.game_code) {
      return;
    }

    setBookingLoading(true);

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
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Booking request load error:",
        error
      );

      setBookingLoading(false);

      return;
    }


    setBookingRequests(
      data || []
    );

    setBookingLoading(false);
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

  }, [
    game?.game_code
  ]);


  /* =======================================================
     PRIZES
  ======================================================= */

  function prizeChange(
    i,
    value
  ) {

    setPrizes((p) =>
      p.map(
        (x, j) =>
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

            status:
              "upcoming",

            ticket_limit:
              Number(limit),

            ticket_price:
              Number(price),

            call_interval_seconds:
              5,

            game_date:
              date,

            game_time:
              time,

            game_code:
              gc,

            invite_enabled:
              true

          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      const g = {

        ...data,

        host_name:
          "Host",

        game_name:
          name.trim() ||
          "TambolaLive",

        theme,

        gameStarted:
          false,

        calledNumbers:
          [],

        prizes:
          cleanPrizes

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


  /* =======================================================
     APPROVE BOOKING
  ======================================================= */

  async function approveBooking(
    request
  ) {

    if (!request?.id) {
      return;
    }


    const ticketNumbers =
      Array.isArray(
        request.ticket_numbers
      )
        ? request.ticket_numbers
        : [];


    /*
       Double-check that none of these
       tickets were approved for somebody
       else while this request was waiting.
    */

    const approvedRequests =
      bookingRequests.filter(
        (r) =>
          r.status ===
          "approved" &&
          r.id !== request.id
      );


    const alreadyBooked =
      ticketNumbers.filter(
        (ticket) => {

          return approvedRequests.some(
            (r) => {

              const otherTickets =
                Array.isArray(
                  r.ticket_numbers
                )
                  ? r.ticket_numbers
                  : [];

              return otherTickets.includes(
                ticket
              );

            }
          );

        }
      );


    if (alreadyBooked.length) {

      alert(
        `Cannot approve. Ticket(s) ${alreadyBooked
          .map((n) => `#${n}`)
          .join(", ")} are already booked.`
      );

      await loadBookingRequests();

      return;
    }


    const {
      error
    } =
      await supabase
        .from("booking_requests")
        .update({
          status:
            "approved"
        })
        .eq(
          "id",
          request.id
        );


    if (error) {

      alert(
        "Could not approve booking: " +
        error.message
      );

      return;
    }


    await loadBookingRequests();

  }


  /* =======================================================
     REJECT BOOKING
  ======================================================= */

  async function rejectBooking(
    request
  ) {

    if (!request?.id) {
      return;
    }


    const confirmed =
      confirm(
        `Reject booking request from ${
          request.player_name
        } for ${
          (request.ticket_numbers || [])
            .map(
              (n) => `#${n}`
            )
            .join(", ")
        }?`
      );


    if (!confirmed) {
      return;
    }


    const {
      error
    } =
      await supabase
        .from("booking_requests")
        .update({
          status:
            "rejected"
        })
        .eq(
          "id",
          request.id
        );


    if (error) {

      alert(
        "Could not reject booking: " +
        error.message
      );

      return;
    }


    await loadBookingRequests();

  }


  /* =======================================================
     SHARE
  ======================================================= */

  async function copyLink() {

    const url =
      `${location.origin}/?game=${game.game_code}`;

    try {

      await navigator.clipboard
        .writeText(url);

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


    if (
      navigator.share
    ) {

      try {

        await navigator.share({

          title:
            game.game_name ||
            "TambolaLive",

          text:
            message,

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

        await navigator.clipboard
          .writeText(message);

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
     CREATE PAGE
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
          onSubmit={
            createGame
          }
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
                      amount:
                        "",
                      approved:
                        false,
                      winner:
                        null
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


  function changeTheme(
    value
  ) {

    const updated = {
      ...game,
      theme:
        value
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
      prizes:
        updatedPrizes
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


  const pendingRequests =
    bookingRequests.filter(
      (r) =>
        r.status ===
        "pending"
    );


  const approvedRequests =
    bookingRequests.filter(
      (r) =>
        r.status ===
        "approved"
    );


  const rejectedRequests =
    bookingRequests.filter(
      (r) =>
        r.status ===
        "rejected"
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
          width: "70%"
        }}
      />


      <button
        onClick={
          copyLink
        }
      >
        Copy Link
      </button>


      <button
        onClick={
          shareGame
        }
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
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 15
        }}
      >

        <span
          style={{
            padding: "6px 10px",
            background:
              "#fff7ed",
            border:
              "1px solid #f59e0b",
            borderRadius: 6
          }}
        >
          Pending:{" "}
          <b>
            {pendingRequests.length}
          </b>
        </span>


        <span
          style={{
            padding: "6px 10px",
            background:
              "#f0fff4",
            border:
              "1px solid #16a34a",
            borderRadius: 6
          }}
        >
          Approved:{" "}
          <b>
            {approvedRequests.length}
          </b>
        </span>


        <span
          style={{
            padding: "6px 10px",
            background:
              "#fef2f2",
            border:
              "1px solid #ef4444",
            borderRadius: 6
          }}
        >
          Rejected:{" "}
          <b>
            {rejectedRequests.length}
          </b>
        </span>

      </div>


      {bookingLoading && (
        <p>
          Checking booking requests...
        </p>
      )}


      {!bookingLoading &&
        bookingRequests.length === 0 && (

          <div
            style={{
              border:
                "1px solid #ccc",
              padding: 15,
              borderRadius: 8
            }}
          >
            No booking requests yet.
          </div>

        )}


      {bookingRequests.map(
        (request) => (

          <div
            key={request.id}
            style={{
              border:
                request.status ===
                "approved"
                  ? "2px solid #16a34a"
                  : request.status ===
                    "pending"
                    ? "2px solid #f59e0b"
                    : "1px solid #ccc",

              padding: 15,
              marginBottom: 12,
              borderRadius: 8,

              background:
                request.status ===
                "approved"
                  ? "#f0fff4"
                  : request.status ===
                    "pending"
                    ? "#fffaf0"
                    : "#fafafa"
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
              Tickets:
              {" "}
              <b>
                {(request.ticket_numbers || [])
                  .map(
                    (n) =>
                      `#${n}`
                  )
                  .join(", ")}
              </b>
            </p>


            <p>
              Status:
              {" "}
              <b>
                {request.status
                  .toUpperCase()}
              </b>
            </p>


            {request.status ===
              "pending" && (

              <div>

                <button
                  onClick={() =>
                    approveBooking(
                      request
                    )
                  }
                  style={{
                    marginRight: 8,
                    padding:
                      "8px 14px",
                    fontWeight:
                      "bold"
                  }}
                >
                  APPROVE
                </button>


                <button
                  onClick={() =>
                    rejectBooking(
                      request
                    )
                  }
                  style={{
                    padding:
                      "8px 14px"
                  }}
                >
                  REJECT
                </button>

              </div>

            )}


            {request.status ===
              "approved" && (

              <p
                style={{
                  color:
                    "#15803d",
                  fontWeight:
                    "bold"
                }}
              >
                ✓ Tickets assigned
                to{" "}
                {request.player_name}
              </p>

            )}


            {request.status ===
              "rejected" && (

              <p
                style={{
                  color:
                    "#b91c1c",
                  fontWeight:
                    "bold"
                }}
              >
                Booking rejected.
              </p>

            )}

          </div>

        )
      )}


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

      gameStarted:
        true,

      status:
        "live",

      calledNumbers:
        []
    };

    setGame(updated);

    saveGame(updated);

  }


  function callNext() {

    if (
      !game.gameStarted
    ) {
      return;
    }

    if (
      !remaining.length
    ) {
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

      status:
        "live",

      calledNumbers:
        [
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

      gameStarted:
        false,

      status:
        "upcoming",

      calledNumbers:
        []
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
          onClick={
            start
          }
        >
          Start Game
        </button>

      ) : (

        <>

          <button
            onClick={
              callNext
            }
          >
            Call Next Number
          </button>


          <button
            onClick={
              reset
            }
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
        <b>Date:</b>{" "}
        {game.game_date}
      </p>


      <p>
        <b>Time:</b>{" "}
        {game.game_time}
      </p>


      <p>
        <b>Ticket Price:</b>{" "}
        ₹{game.ticket_price}
      </p>


      <p>
        <b>Available Tickets:</b>{" "}
        {game.ticket_limit}
      </p>


      <p>
        <b>Status:</b>{" "}
        {game.status}
      </p>


      <h3>
        Prize List
      </h3>


      {prizes.map(
        (p, i) => (

          <p key={i}>
            {p.name}:{" "}
            ₹{p.amount}
          </p>

        )
      )}


      <button
        onClick={
          accept
        }
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

  const [
    bookingRequests,
    setBookingRequests
  ] = useState([]);

  const [
    loadingRequests,
    setLoadingRequests
  ] = useState(true);

  const [
    requestError,
    setRequestError
  ] = useState("");


  const ticketLimit =
    Math.max(
      1,
      Number(
        game.ticket_limit ||
        100
      )
    );


  const ticketNumbers =
    Array.from(
      {
        length:
          ticketLimit
      },
      (_, i) =>
        i + 1
    );


  /* =======================================================
     LOAD REQUESTS FOR PLAYER
  ======================================================= */

  async function loadRequests() {

    if (!game?.game_code) {
      return;
    }


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
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Could not load ticket status:",
        error
      );

      setRequestError(
        error.message
      );

      setLoadingRequests(false);

      return;
    }


    setBookingRequests(
      data || []
    );

    setLoadingRequests(false);

  }


  useEffect(() => {

    loadRequests();

    const interval =
      setInterval(
        loadRequests,
        3000
      );

    return () =>
      clearInterval(interval);

  }, [
    game?.game_code
  ]);


  /* =======================================================
     TICKET STATUS
  ======================================================= */

  function ticketInfo(
    ticketNumber
  ) {

    return getTicketStatus(
      ticketNumber,
      bookingRequests
    );

  }


  function canSelect(
    ticketNumber
  ) {

    const info =
      ticketInfo(
        ticketNumber
      );

    return (
      info.status ===
      "available"
    );

  }


  /* =======================================================
     SELECT TICKET
  ======================================================= */

  function toggleTicket(
    ticketNumber
  ) {

    if (sent) {
      return;
    }


    if (
      !canSelect(
        ticketNumber
      )
    ) {

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
              x !==
              ticketNumber
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
     SEND BOOKING REQUEST
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


    const sorted =
      [...selected].sort(
        (a, b) =>
          a - b
      );


    /*
       FINAL CHECK AGAINST DATABASE
       BEFORE CREATING REQUEST.
    */

    await loadRequests();


    const unavailable =
      sorted.filter(
        (ticket) =>
          !canSelect(
            ticket
          )
      );


    if (
      unavailable.length
    ) {

      alert(
        `Ticket(s) ${unavailable
          .map(
            (n) =>
              `#${n}`
          )
          .join(
            ", "
          )} are no longer available.`
      );

      setSelected(
        (current) =>
          current.filter(
            (n) =>
              !unavailable.includes(
                n
              )
          )
      );

      return;
    }


    const {
      data,
      error
    } =
      await supabase
        .from(
          "booking_requests"
        )
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

      alert(
        "Could not send booking request: " +
        error.message
      );

      return;
    }


    console.log(
      "Booking request created:",
      data
    );


    setSent(true);

    setSelected([]);

    await loadRequests();


    /*
       Open WhatsApp after the
       database request has been
       successfully created.
    */

    const text =
`Hi ${game.host_name || "Host"}, ${player.trim()} wants to book ${sorted
      .map(
        (n) =>
          `#${n}`
      )
      .join(
        ", "
      )} for ${game.game_name}. Please approve my booking.`;


    try {

      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          text
        )}`,
        "_blank"
      );

    } catch {

      console.log(
        "WhatsApp could not be opened."
      );

    }

  }


  /* =======================================================
     ACTUAL TICKETS
  ======================================================= */

  const actualTickets =
    ticketNumbers.map(
      (ticketNumber) => {

        const info =
          ticketInfo(
            ticketNumber
          );


        const selected =
          selected.includes(
            ticketNumber
          );


        return (

          <Ticket
            key={
              "actual-ticket-" +
              ticketNumber
            }

            n={
              ticketNumber
            }

            name={
              info.player
            }

            selected={
              selected
            }

            status={
              selected
                ? "available"
                : info.status
            }

            onClick={() =>
              toggleTicket(
                ticketNumber
              )
            }
          />

        );

      }
    );


  /* =======================================================
     STATUS COUNTS
  ======================================================= */

  const approvedTicketCount =
    bookingRequests
      .filter(
        (r) =>
          r.status ===
          "approved"
      )
      .reduce(
        (
          total,
          r
        ) =>
          total +
          (
            Array.isArray(
              r.ticket_numbers
            )
              ? r.ticket_numbers.length
              : 0
          ),
        0
      );


  const pendingTicketCount =
    bookingRequests
      .filter(
        (r) =>
          r.status ===
          "pending"
      )
      .reduce(
        (
          total,
          r
        ) =>
          total +
          (
            Array.isArray(
              r.ticket_numbers
            )
              ? r.ticket_numbers.length
              : 0
          ),
        0
      );


  return (

    <main
      style={{
        width: "100%",
        maxWidth: 700,
        margin: "20px auto",
        padding: 20,
        boxSizing:
          "border-box"
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
        Ticket Availability
      </h3>


      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap:
            "wrap",
          marginBottom:
            20
        }}
      >

        <span
          style={{
            padding:
              "6px 10px",
            background:
              "#f0fff4",
            border:
              "1px solid #16a34a",
            borderRadius:
              6
          }}
        >
          ✓ Booked:{" "}
          <b>
            {approvedTicketCount}
          </b>
        </span>


        <span
          style={{
            padding:
              "6px 10px",
            background:
              "#fff7ed",
            border:
              "1px solid #f59e0b",
            borderRadius:
              6
          }}
        >
          ⏳ Pending:{" "}
          <b>
            {pendingTicketCount}
          </b>
        </span>

      </div>


      {loadingRequests && (

        <p>
          Checking ticket availability...
        </p>

      )}


      {requestError && (

        <p
          style={{
            color:
              "#b91c1c"
          }}
        >
          Could not refresh ticket
          status:{" "}
          {requestError}
        </p>

      )}


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
          boxSizing:
            "border-box"
        }}
      />


      <h3>
        Select Ticket
      </h3>


      <div
        style={{
          display: "flex",
          flexWrap:
            "wrap",
          gap: 5,
          marginBottom:
            30
        }}
      >

        {ticketNumbers.map(
          (ticketNumber) => {

            const info =
              ticketInfo(
                ticketNumber
              );


            return (

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
                  info.status !==
                    "available"
                }

                style={{
                  padding:
                    "7px 10px",

                  border:
                    "1px solid #555",

                  borderRadius:
                    5,

                  background:
                    selected.includes(
                      ticketNumber
                    )
                      ? "#bfdbfe"
                      : info.status ===
                        "approved"
                        ? "#bbf7d0"
                        : info.status ===
                          "pending"
                          ? "#fed7aa"
                          : "#fff",

                  fontWeight:
                    "bold",

                  cursor:
                    info.status ===
                    "available"
                      ? "pointer"
                      : "not-allowed"
                }}
              >

                {selected.includes(
                  ticketNumber
                )
                  ? "✓ "
                  : info.status ===
                    "approved"
                    ? "✓ "
                    : info.status ===
                      "pending"
                      ? "⏳ "
                      : ""}

                #{ticketNumber}

              </button>

            );

          }
        )}

      </div>


      <h3>
        All Actual 3 × 9 Tambola Tickets
      </h3>


      <p>
        Green = booked
        {" • "}
        Orange = pending
        {" • "}
        White = available
      </p>


      <div
        style={{
          width: "100%",
          display:
            "block",
          boxSizing:
            "border-box"
        }}
      >

        {actualTickets}

      </div>


      {selected.length > 0 && (

        <div
          style={{
            border:
              "1px solid #2563eb",
            borderRadius:
              8,
            padding:
              12,
            marginTop:
              10,
            marginBottom:
              15,
            background:
              "#eff6ff"
          }}
        >

          <b>
            Selected Tickets
          </b>


          <p>
            {selected
              .slice()
              .sort(
                (a, b) =>
                  a - b
              )
              .map(
                (n) =>
                  `#${n}`
              )
              .join(
                ", "
              )}
          </p>

        </div>

      )}


      {!sent ? (

        <button
          type="button"
          onClick={
            send
          }

          disabled={
            !player.trim() ||
            selected.length ===
              0
          }

          style={{
            padding:
              "10px 18px",

            fontWeight:
              "bold",

            marginBottom:
              30
          }}
        >
          BOOK TICKETS
        </button>

      ) : (

        <div
          style={{
            border:
              "2px solid #f59e0b",
            padding:
              15,
            borderRadius:
              8,
            background:
              "#fff7ed"
          }}
        >

          <p>
            <b>
              Booking request sent.
            </b>
          </p>


          <p>
            Your selected tickets
            are now pending host
            approval.
          </p>


          <p>
            This page will automatically
            update when the host approves
            or rejects your request.
          </p>

        </div>

      )}


      {/* =================================================
          CURRENT BOOKINGS LIST
      ================================================= */}

      <hr />


      <h3>
        Ticket Status
      </h3>


      {bookingRequests.length ===
        0 && (

        <p>
          No booking requests yet.
        </p>

      )}


      {bookingRequests
        .filter(
          (r) =>
            r.status ===
              "approved" ||
            r.status ===
              "pending"
        )
        .map(
          (r) => (

            <div
              key={
                r.id
              }
              style={{
                border:
                  r.status ===
                  "approved"
                    ? "1px solid #16a34a"
                    : "1px solid #f59e0b",

                padding:
                  10,

                marginBottom:
                  8,

                borderRadius:
                  6,

                background:
                  r.status ===
                  "approved"
                    ? "#f0fff4"
                    : "#fff7ed"
              }}
            >

              <b>
                {r.player_name}
              </b>


              {" "}
              —


              {" "}

              {r.status ===
              "approved"
                ? "Booked"
                : "Pending"}


              <br />


              Tickets:{" "}

              {(r.ticket_numbers || [])
                .map(
                  (n) =>
                    `#${n}`
                )
                .join(
                  ", "
                )}

            </div>

          )
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

      setGame(
        saved
      );

      setPage(
        "host"
      );

    }


    const gc =
      getGameCode();


    if (gc) {

      loadPlayer(
        gc
      );

    } else {

      setLoading(
        false
      );

    }

  }, []);


  useEffect(() => {

    if (game) {

      saveGame(
        game
      );

    }

  }, [
    game
  ]);


  async function loadPlayer(
    gc
  ) {

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

      setLoading(
        false
      );

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
          : []

    };


    setPlayerGame(
      g
    );

    setPage(
      "invitation"
    );

    setLoading(
      false
    );

  }


  if (loading) {

    return (

      <main
        style={{
          padding:
            20,
          textAlign:
            "center"
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
          padding:
            20
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
    page ===
      "invitation"
  ) {

    return (

      <Invitation
        game={
          playerGame
        }

        accept={() =>
          setPage(
            "booking"
          )
        }
      />

    );

  }


  if (
    playerGame &&
    page ===
      "booking"
  ) {

    return (

      <Booking
        game={
          playerGame
        }
      />

    );

  }


  return (

    <HostPage
      game={
        game
      }

      setGame={
        setGame
      }
    />

  );

}


/* =========================================================
   START APP
========================================================= */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <App />
);
