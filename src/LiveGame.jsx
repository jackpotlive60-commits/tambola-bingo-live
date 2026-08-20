import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const NUMBERS = Array.from({ length: 90 }, (_, i) => i + 1);

function getGameCode() {
  return new URLSearchParams(window.location.search)
    .get("game")
    ?.trim()
    .toUpperCase();
}

function normalizeNumbers(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map(Number)
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 90);
}

function getCalledNumbers(game) {
  return normalizeNumbers(game?.called_numbers);
}

function getLastNumber(game, calledNumbers) {
  if (
    game?.last_number !== null &&
    game?.last_number !== undefined
  ) {
    const number = Number(game.last_number);

    if (Number.isInteger(number) && number >= 1 && number <= 90) {
      return number;
    }
  }

  if (calledNumbers.length > 0) {
    return calledNumbers[calledNumbers.length - 1];
  }

  return null;
}

function getGameStatus(game) {
  return String(game?.status || "upcoming").toLowerCase();
}

function isGameLive(game) {
  const status = getGameStatus(game);

  return (
    status === "live" ||
    status === "started" ||
    game?.game_started === true ||
    game?.gameStarted === true
  );
}

function isGameFinished(game) {
  const status = getGameStatus(game);

  return (
    status === "finished" ||
    status === "completed" ||
    status === "ended"
  );
}

function LiveGame() {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const gameCode = useMemo(() => getGameCode(), []);

  async function loadGame(showRefreshing = false) {
    if (!gameCode) {
      setError("No game code was found in the URL.");
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    }

    const {
      data,
      error: supabaseError,
    } = await supabase
      .from("games")
      .select("*")
      .eq("game_code", gameCode)
      .maybeSingle();

    if (supabaseError) {
      console.error("Live game load error:", supabaseError);

      setError(
        supabaseError.message || "Could not load the game."
      );

      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!data) {
      setGame(null);
      setError(`Game ${gameCode} was not found.`);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setGame(data);
    setError("");
    setLoading(false);
    setRefreshing(false);
    setLastUpdated(new Date());
  }

  useEffect(() => {
    loadGame();

    const interval = setInterval(() => {
      loadGame(true);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [gameCode]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>
          <div style={styles.spinner}>●</div>

          <h2 style={styles.title}>
            Loading Live Game
          </h2>

          <p style={styles.muted}>
            Connecting to the game...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>!</div>

          <h2 style={styles.title}>
            Live Game Unavailable
          </h2>

          <p style={styles.errorText}>
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadGame(true)}
            style={styles.primaryButton}
          >
            TRY AGAIN
          </button>
        </div>
      </main>
    );
  }

  if (!game) {
    return null;
  }

  const calledNumbers = getCalledNumbers(game);
  const calledSet = new Set(calledNumbers);

  const lastNumber = getLastNumber(
    game,
    calledNumbers
  );

  const live = isGameLive(game);
  const finished = isGameFinished(game);

  return (
    <main style={styles.page}>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header style={styles.header}>

        <div>
          <div style={styles.brand}>
            TAMBOLA
            <span style={styles.brandPink}>
              LIVE
            </span>
          </div>

          <h1 style={styles.gameName}>
            {game.game_name || "TambolaLive"}
          </h1>

          <div style={styles.gameCode}>
            GAME CODE: {game.game_code || gameCode}
          </div>
        </div>

        <div
          style={
            finished
              ? styles.statusFinished
              : live
                ? styles.statusLive
                : styles.statusWaiting
          }
        >
          <span style={styles.statusDot}>
            ●
          </span>

          {finished
            ? "GAME ENDED"
            : live
              ? "LIVE NOW"
              : "WAITING"}
        </div>

      </header>


      {/* =====================================================
          GAME INFORMATION
      ===================================================== */}

      <section style={styles.infoGrid}>

        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>
            DATE
          </span>

          <strong>
            {game.game_date || "-"}
          </strong>
        </div>

        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>
            TIME
          </span>

          <strong>
            {game.game_time || "-"}
          </strong>
        </div>

        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>
            TICKET
          </span>

          <strong>
            ₹{game.ticket_price ?? 0}
          </strong>
        </div>

        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>
            CALLED
          </span>

          <strong>
            {calledNumbers.length}/90
          </strong>
        </div>

      </section>


      {/* =====================================================
          WAITING
      ===================================================== */}

      {!live && !finished && (

        <section style={styles.waitingCard}>

          <div style={styles.waitingIcon}>
            ⏳
          </div>

          <h2 style={styles.waitingTitle}>
            Game Will Start Soon
          </h2>

          <p style={styles.muted}>
            You are connected to the game.
            <br />
            Please wait for the host to start calling numbers.
          </p>

          <div style={styles.liveIndicator}>
            <span>●</span>
            Waiting for host
          </div>

        </section>

      )}


      {/* =====================================================
          LIVE GAME
      ===================================================== */}

      {live && (

        <section style={styles.liveSection}>

          {/* LIVE HEADER */}

          <div style={styles.liveHeading}>

            <div>
              <span style={styles.liveBadge}>
                ● LIVE GAME
              </span>

              <h2 style={styles.sectionTitle}>
                Current Number
              </h2>
            </div>

            <div style={styles.updated}>
              {refreshing
                ? "Updating..."
                : lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : ""}
            </div>

          </div>


          {/* =================================================
              CURRENT NUMBER
          ================================================= */}

          <div style={styles.numberStage}>

            <div style={styles.numberLabel}>
              LAST CALLED NUMBER
            </div>

            <div style={styles.bigBall}>
              {lastNumber || "—"}
            </div>

            <div style={styles.calledCount}>
              {calledNumbers.length} numbers called
            </div>

          </div>


          {/* =================================================
              NUMBER BOARD
          ================================================= */}

          <div style={styles.boardCard}>

            <div style={styles.boardHeader}>

              <div>
                <h2 style={styles.boardTitle}>
                  Number Board
                </h2>

                <p style={styles.mutedSmall}>
                  Called numbers are highlighted.
                </p>
              </div>

              <div style={styles.boardCount}>
                {calledNumbers.length}/90
              </div>

            </div>


            <div style={styles.board}>

              {NUMBERS.map((number) => {

                const called = calledSet.has(number);
                const isLast = lastNumber === number;

                let numberStyle =
                  styles.numberWaiting;

                if (isLast) {
                  numberStyle = styles.numberLast;
                } else if (called) {
                  numberStyle = styles.numberCalled;
                }

                return (
                  <div
                    key={number}
                    style={numberStyle}
                  >
                    {number}
                  </div>
                );
              })}

            </div>

          </div>


          {/* =================================================
              CALL HISTORY
          ================================================= */}

          <div style={styles.historyCard}>

            <div style={styles.historyHeader}>

              <div>
                <h2 style={styles.boardTitle}>
                  Called Numbers
                </h2>

                <p style={styles.mutedSmall}>
                  Most recent number appears first.
                </p>
              </div>

              <div style={styles.historyTotal}>
                {calledNumbers.length}
              </div>

            </div>


            {calledNumbers.length === 0 ? (

              <div style={styles.emptyHistory}>
                No numbers have been called yet.
              </div>

            ) : (

              <div style={styles.history}>

                {calledNumbers
                  .slice()
                  .reverse()
                  .map((number, index) => (

                    <div
                      key={`${number}-${index}`}
                      style={
                        index === 0
                          ? styles.historyLast
                          : styles.historyNumber
                      }
                    >
                      {number}
                    </div>

                  ))}

              </div>

            )}

          </div>

        </section>

      )}


      {/* =====================================================
          FINISHED
      ===================================================== */}

      {finished && (

        <section style={styles.finishedCard}>

          <div style={styles.finishedIcon}>
            ✓
          </div>

          <h2 style={styles.waitingTitle}>
            Game Has Ended
          </h2>

          <p style={styles.muted}>
            Thank you for playing
            {game.game_name
              ? ` ${game.game_name}`
              : ""}.
          </p>

          <div style={styles.finishedStats}>

            <div>
              <strong>
                {calledNumbers.length}
              </strong>

              <span>
                Numbers Called
              </span>
            </div>

            <div>
              <strong>
                {calledNumbers.length === 90
                  ? "90/90"
                  : `${calledNumbers.length}/90`}
              </strong>

              <span>
                Board Progress
              </span>
            </div>

          </div>

        </section>

      )}


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer style={styles.footer}>

        <div>
          TAMBOLA
          <span style={styles.brandPink}>
            LIVE
          </span>
        </div>

        <div style={styles.footerCode}>
          Game Code: {game.game_code || gameCode}
        </div>

      </footer>

    </main>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles = {

  page: {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg, #090714 0%, #120d24 45%, #090714 100%)",
    color: "#fff",
    padding: "20px 14px 40px",
    fontFamily:
      "Arial, Helvetica, sans-serif"
  },

  header: {
    maxWidth: 900,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap"
  },

  brand: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 2,
    color: "#fff"
  },

  brandPink: {
    color: "#ff4fa3",
    marginLeft: 3
  },

  gameName: {
    margin: "6px 0 2px",
    fontSize: 26,
    fontWeight: 900
  },

  gameCode: {
    color: "#777",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1
  },

  statusLive: {
    padding: "8px 13px",
    borderRadius: 30,
    background: "#123b28",
    border: "1px solid #27d17f",
    color: "#27d17f",
    fontWeight: 900,
    fontSize: 12
  },

  statusWaiting: {
    padding: "8px 13px",
    borderRadius: 30,
    background: "#3a2c12",
    border: "1px solid #ffc857",
    color: "#ffc857",
    fontWeight: 900,
    fontSize: 12
  },

  statusFinished: {
    padding: "8px 13px",
    borderRadius: 30,
    background: "#30151b",
    border: "1px solid #ff5571",
    color: "#ff5571",
    fontWeight: 900,
    fontSize: 12
  },

  statusDot: {
    marginRight: 5
  },

  infoGrid: {
    maxWidth: 900,
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10
  },

  infoCard: {
    background:
      "rgba(255,255,255,0.05)",
    border:
      "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: 13,
    display: "flex",
    flexDirection: "column",
    gap: 5
  },

  infoLabel: {
    fontSize: 10,
    color: "#aaa",
    fontWeight: 800,
    letterSpacing: 1
  },

  centerCard: {
    maxWidth: 450,
    margin: "80px auto",
    textAlign: "center",
    background:
      "rgba(255,255,255,0.05)",
    border:
      "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 30
  },

  spinner: {
    color: "#ff4fa3",
    fontSize: 30,
    marginBottom: 10
  },

  title: {
    margin: "5px 0 10px",
    fontSize: 24
  },

  muted: {
    color: "#aaa",
    lineHeight: 1.6
  },

  mutedSmall: {
    color: "#888",
    margin: "4px 0 0",
    fontSize: 13
  },

  errorCard: {
    maxWidth: 450,
    margin: "70px auto",
    textAlign: "center",
    background:
      "rgba(255,85,113,0.08)",
    border:
      "1px solid rgba(255,85,113,0.35)",
    borderRadius: 18,
    padding: 30
  },

  errorIcon: {
    width: 52,
    height: 52,
    margin: "0 auto 12px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ff5571",
    color: "#fff",
    fontSize: 28,
    fontWeight: 900
  },

  errorText: {
    color: "#ff9aaa",
    lineHeight: 1.5,
    marginBottom: 20
  },

  primaryButton: {
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    background:
      "linear-gradient(135deg, #6d3df5, #ff4fa3)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer"
  },

  waitingCard: {
    maxWidth: 700,
    margin: "25px auto",
    padding: "35px 20px",
    textAlign: "center",
    borderRadius: 20,
    background:
      "linear-gradient(145deg, rgba(109,61,245,0.18), rgba(255,79,163,0.08))",
    border:
      "1px solid rgba(255,255,255,0.12)"
  },

  waitingIcon: {
    fontSize: 48,
    marginBottom: 8
  },

  waitingTitle: {
    fontSize: 24,
    margin: "5px 0 8px"
  },

  liveIndicator: {
    display: "inline-block",
    marginTop: 10,
    padding: "8px 14px",
    borderRadius: 30,
    color: "#ffc857",
    background:
      "rgba(255,200,87,0.10)",
    border:
      "1px solid rgba(255,200,87,0.25)",
    fontWeight: 800,
    fontSize: 13
  },

  liveSection: {
    maxWidth: 900,
    margin: "0 auto"
  },

  liveHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap"
  },

  liveBadge: {
    display: "inline-block",
    color: "#27d17f",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1
  },

  sectionTitle: {
    margin: "5px 0 0",
    fontSize: 22
  },

  updated: {
    color: "#777",
    fontSize: 11
  },

  numberStage: {
    textAlign: "center",
    borderRadius: 22,
    padding: "25px 15px 28px",
    marginBottom: 18,
    background:
      "radial-gradient(circle at center, rgba(109,61,245,0.30), rgba(18,13,36,0.95) 65%)",
    border:
      "1px solid rgba(255,255,255,0.12)",
    boxShadow:
      "0 15px 45px rgba(0,0,0,0.35)"
  },

  numberLabel: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 2,
    marginBottom: 12
  },

  bigBall: {
    width: 130,
    height: 130,
    margin: "0 auto",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 58,
    fontWeight: 900,
    color: "#fff",
    background:
      "radial-gradient(circle at 32% 25%, #ff8bc2 0%, #ff4fa3 30%, #6d3df5 75%)",
    boxShadow:
      "0 0 45px rgba(255,79,163,0.45), 0 12px 30px rgba(0,0,0,0.5)"
  },

  calledCount: {
    marginTop: 13,
    color: "#aaa",
    fontSize: 13
  },

  boardCard: {
    background:
      "rgba(255,255,255,0.045)",
    border:
      "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 15,
    marginBottom: 15
  },

  boardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 15
  },

  boardTitle: {
    margin: 0,
    fontSize: 19
  },

  boardCount: {
    color: "#ffc857",
    fontWeight: 900
  },

  board: {
    display: "grid",
    gridTemplateColumns:
      "repeat(10, minmax(0, 1fr))",
    gap: 7
  },

  numberWaiting: {
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background:
      "rgba(255,255,255,0.045)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    color: "#777",
    fontWeight: 800,
    fontSize: 13
  },

  numberCalled: {
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background:
      "rgba(39,209,127,0.18)",
    border:
      "1px solid #27d17f",
    color: "#27d17f",
    fontWeight: 900,
    fontSize: 13,
    boxShadow:
      "0 0 10px rgba(39,209,127,0.12)"
  },

  numberLast: {
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background:
      "linear-gradient(135deg, #6d3df5, #ff4fa3)",
    border:
      "2px solid #fff",
    color: "#fff",
    fontWeight: 900,
    fontSize: 13,
    boxShadow:
      "0 0 15px rgba(255,79,163,0.45)"
  },

  historyCard: {
    background:
      "rgba(255,255,255,0.045)",
    border:
      "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 15
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },

  historyTotal: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "rgba(255,200,87,0.10)",
    border:
      "1px solid rgba(255,200,87,0.25)",
    color: "#ffc857",
    fontWeight: 900
  },

  emptyHistory: {
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
    background:
      "rgba(255,255,255,0.03)",
    color: "#777",
    textAlign: "center"
  },

  history: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14
  },

  historyNumber: {
    minWidth: 38,
    height: 38,
    padding: "0 7px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "rgba(109,61,245,0.18)",
    border:
      "1px solid rgba(109,61,245,0.45)",
    color: "#ddd",
    fontWeight: 800
  },

  historyLast: {
    minWidth: 42,
    height: 42,
    padding: "0 8px",
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #6d3df5, #ff4fa3)",
    color: "#fff",
    fontWeight: 900,
    boxShadow:
      "0 0 15px rgba(255,79,163,0.3)"
  },

  finishedCard: {
    maxWidth: 700,
    margin: "25px auto",
    padding: "35px 20px",
    textAlign: "center",
    borderRadius: 20,
    background:
      "rgba(39,209,127,0.08)",
    border:
      "1px solid rgba(39,209,127,0.25)"
  },

  finishedIcon: {
    width: 60,
    height: 60,
    margin: "0 auto 12px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#27d17f",
    color: "#07140d",
    fontSize: 32,
    fontWeight: 900
  },

  finishedStats: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 20
  },

  finishedStatsItem: {
    minWidth: 130
  },

  finishedCount: {
    color: "#27d17f",
    fontWeight: 800
  },

  footer: {
    maxWidth: 900,
    margin: "30px auto 0",
    paddingTop: 20,
    borderTop:
      "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    color: "#777",
    fontSize: 11,
    fontWeight: 800
  },

  footerCode: {
    color: "#555"
  }
};

export default LiveGame;
