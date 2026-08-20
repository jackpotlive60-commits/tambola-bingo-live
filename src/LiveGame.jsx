import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const NUMBERS = Array.from(
  { length: 90 },
  (_, i) => i + 1
);

function getTicketRows(ticketNumber) {
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

  const rows = masks[
    (Number(ticketNumber) - 1) %
      masks.length
  ].map((row) => [...row]);

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
      {
        length:
          max - min + 1
      },
      (_, i) =>
        min + i
    );

    const shift =
      (
        Number(ticketNumber) *
          (c + 3) +
        c * 7
      ) %
      values.length;

    const rotated =
      values
        .slice(shift)
        .concat(
          values.slice(0, shift)
        );

    let index = 0;

    for (let r = 0; r < 3; r++) {
      if (rows[r][c]) {
        let value =
          rotated[
            index %
              rotated.length
          ];

        let tries = 0;

        while (
          used.has(value) &&
          tries <
            rotated.length
        ) {
          index++;

          value =
            rotated[
              index %
                rotated.length
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
      rows[r].filter(Boolean)
        .length;

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

  return rows;
}


function PlayerTicket({
  ticketNumber,
  calledNumbers
}) {
  const rows =
    getTicketRows(
      ticketNumber
    );

  const called =
    new Set(
      calledNumbers
    );

  return (
    <div
      style={{
        border:
          "2px solid #16a34a",
        borderRadius: 10,
        padding: 10,
        marginBottom: 18,
        background:
          "#f0fff4"
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          marginBottom: 8,
          fontSize: 16
        }}
      >
        Ticket #{ticketNumber}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(9, minmax(0, 1fr))",
          border:
            "1px solid #333"
        }}
      >
        {rows.flat().map(
          (value, index) => {
            const isCalled =
              value &&
              called.has(
                value
              );

            return (
              <div
                key={
                  `ticket-${ticketNumber}-${index}`
                }
                style={{
                  height: 38,
                  border:
                    "1px solid #aaa",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontWeight:
                    value
                      ? "bold"
                      : "normal",
                  fontSize: 15,
                  background:
                    isCalled
                      ? "#22c55e"
                      : "#fff",
                  color:
                    isCalled
                      ? "#fff"
                      : "#111",
                  textDecoration:
                    isCalled
                      ? "line-through"
                      : "none"
                }}
              >
                {value || ""}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}


export default function LiveGame({
  game,
  playerName
}) {
  const [
    calledNumbers,
    setCalledNumbers
  ] = useState(
    Array.isArray(
      game?.calledNumbers
    )
      ? game.calledNumbers
      : []
  );

  const [
    approvedTickets,
    setApprovedTickets
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");


  async function loadPlayerTickets() {
    if (
      !game?.game_code ||
      !playerName
    ) {
      setLoading(false);
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
        .select(
          "ticket_numbers, player_name, status"
        )
        .eq(
          "game_code",
          game.game_code
        )
        .eq(
          "status",
          "approved"
        )
        .eq(
          "player_name",
          playerName
        );

    if (error) {
      console.error(
        "Could not load approved tickets:",
        error
      );

      setError(
        error.message
      );

      setLoading(false);
      return;
    }

    const tickets =
      (data || []).flatMap(
        (request) =>
          Array.isArray(
            request.ticket_numbers
          )
            ? request.ticket_numbers
            : []
      );

    setApprovedTickets(
      [
        ...new Set(tickets)
      ].sort(
        (a, b) =>
          a - b
      )
    );

    setLoading(false);
  }


  async function loadGame() {
    if (
      !game?.game_code
    ) {
      return;
    }

    const {
      data,
      error
    } =
      await supabase
        .from("games")
        .select(
          "status, calledNumbers"
        )
        .eq(
          "game_code",
          game.game_code
        )
        .maybeSingle();

    if (error) {
      console.error(
        "Could not load live game:",
        error
      );
      return;
    }

    if (data) {
      setCalledNumbers(
        Array.isArray(
          data.calledNumbers
        )
          ? data.calledNumbers
          : []
      );
    }
  }


  useEffect(() => {
    loadPlayerTickets();
    loadGame();

    const interval =
      setInterval(() => {
        loadPlayerTickets();
        loadGame();
      }, 2000);

    return () =>
      clearInterval(
        interval
      );
  }, [
    game?.game_code,
    playerName
  ]);


  if (!game) {
    return (
      <main
        style={{
          padding: 20,
          textAlign:
            "center"
        }}
      >
        <h2>
          Game unavailable
        </h2>
      </main>
    );
  }


  const lastNumber =
    calledNumbers[
      calledNumbers.length - 1
    ];


  return (
    <main
      style={{
        width: "100%",
        maxWidth: 800,
        margin: "0 auto",
        padding: 15,
        boxSizing:
          "border-box",
        background:
          "#f8fafc"
      }}
    >

      <header
        style={{
          textAlign:
            "center",
          marginBottom: 20
        }}
      >
        <h1
          style={{
            marginBottom: 5
          }}
        >
          {game.game_name ||
            "TambolaLive"}
        </h1>

        <p
          style={{
            marginTop: 0
          }}
        >
          Player:{" "}
          <b>
            {playerName ||
              "Player"}
          </b>
        </p>
      </header>


      <section
        style={{
          textAlign:
            "center",
          border:
            "2px solid #2563eb",
          borderRadius: 14,
          padding: 20,
          background:
            "#eff6ff",
          marginBottom: 20
        }}
      >

        <p
          style={{
            margin:
              "0 0 5px",
            fontWeight:
              "bold"
          }}
        >
          CURRENT NUMBER
        </p>

        <div
          style={{
            fontSize: 70,
            fontWeight:
              "bold",
            lineHeight: 1
          }}
        >
          {lastNumber ||
            "—"}
        </div>

        <p>
          Called:{" "}
          <b>
            {calledNumbers.length}
          </b>
          /90
        </p>

      </section>


      <section
        style={{
          marginBottom: 25
        }}
      >

        <h3>
          Called Numbers
        </h3>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(10, 1fr)",
            gap: 5
          }}
        >

          {NUMBERS.map(
            (number) => {

              const called =
                calledNumbers.includes(
                  number
                );

              return (
                <div
                  key={
                    number
                  }
                  style={{
                    padding:
                      "8px 3px",
                    textAlign:
                      "center",
                    border:
                      "1px solid #aaa",
                    borderRadius:
                      5,
                    background:
                      called
                        ? "#22c55e"
                        : "#fff",
                    color:
                      called
                        ? "#fff"
                        : "#111",
                    fontWeight:
                      called
                        ? "bold"
                        : "normal"
                  }}
                >
                  {number}
                </div>
              );
            }
          )}

        </div>

      </section>


      <section>

        <h2>
          My Tickets
        </h2>

        {loading && (
          <p>
            Loading your tickets...
          </p>
        )}

        {error && (
          <p
            style={{
              color:
                "#b91c1c"
            }}
          >
            {error}
          </p>
        )}

        {!loading &&
          approvedTickets.length ===
            0 && (
            <div
              style={{
                padding: 15,
                border:
                  "1px solid #f59e0b",
                borderRadius:
                  8,
                background:
                  "#fff7ed"
              }}
            >
              No approved tickets
              were found for this
              player.
            </div>
          )}

        {approvedTickets.map(
          (ticketNumber) => (
            <PlayerTicket
              key={
                ticketNumber
              }
              ticketNumber={
                ticketNumber
              }
              calledNumbers={
                calledNumbers
              }
            />
          )
        )}

      </section>

    </main>
  );
}
