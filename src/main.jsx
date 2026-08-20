import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

/*
=========================================================
TAMBOLA LIVE
STEP 1 — CLEAN APP FOUNDATION
=========================================================

We will build the complete application in stages.

Planned flow:

HOST
  ↓
Create Game
  ↓
Host Control Centre
  ↓
START GAME
  ↓
Game status = "live"
  ↓
Realtime update
  ↓
PLAYERS
  ↓
Booking automatically closes
  ↓
Live Game

Important:
Everything is currently contained in main.jsx.
No LiveGame.jsx or styles.css is required.
=========================================================
*/

/* =======================================================
   CONSTANTS
======================================================= */

const APP_NAME = "TambolaLive";

const GAME_STATUSES = {
  UPCOMING: "upcoming",
  LIVE: "live",
  ENDED: "ended",
};

/* =======================================================
   HELPER — GET GAME CODE FROM URL
======================================================= */

function getGameCode() {
  const params = new URLSearchParams(
    window.location.search
  );

  const code = params.get("game");

  if (!code) {
    return null;
  }

  return code.trim().toUpperCase();
}

/* =======================================================
   HELPER — SIMPLE APP STYLES
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

const buttonStyle = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: "bold",
  cursor: "pointer",
};

/* =======================================================
   APP
======================================================= */

function App() {
  const [gameCode, setGameCode] =
    useState(getGameCode());

  const [connectionStatus, setConnectionStatus] =
    useState("checking");

  const [message, setMessage] =
    useState("");

  /*
  ---------------------------------------------------------
  CHECK SUPABASE CONNECTION
  ---------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    async function checkSupabase() {
      setConnectionStatus("checking");
      setMessage("");

      try {
        /*
        We don't need to load the complete game yet.

        This simple query confirms that the
        Supabase connection is working.
        */

        const { error } = await supabase
          .from("games")
          .select("id")
          .limit(1);

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Supabase connection error:",
            error
          );

          setConnectionStatus("error");

          setMessage(
            error.message ||
              "Could not connect to Supabase."
          );

          return;
        }

        setConnectionStatus("connected");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setConnectionStatus("error");

        setMessage(
          error?.message ||
            "Could not connect to Supabase."
        );
      }
    }

    checkSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  ---------------------------------------------------------
  REFRESH GAME CODE IF URL CHANGES
  ---------------------------------------------------------
  */

  useEffect(() => {
    function handleUrlChange() {
      setGameCode(getGameCode());
    }

    window.addEventListener(
      "popstate",
      handleUrlChange
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handleUrlChange
      );
    };
  }, []);

  /* =====================================================
     CURRENT STAGE
  ===================================================== */

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        {/* HEADER */}

        <div style={cardStyle}>
          <h1
            style={{
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            {APP_NAME}
          </h1>

          <p
            style={{
              marginBottom: 0,
              color: "#6b7280",
            }}
          >
            Tambola / Bingo Live Game
          </p>
        </div>

        {/* CONNECTION STATUS */}

        <div style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            App Foundation
          </h2>

          {connectionStatus ===
            "checking" && (
            <p>
              Checking Supabase connection...
            </p>
          )}

          {connectionStatus ===
            "connected" && (
            <p
              style={{
                color: "#15803d",
                fontWeight: "bold",
              }}
            >
              ✓ Supabase connected successfully
            </p>
          )}

          {connectionStatus ===
            "error" && (
            <div>
              <p
                style={{
                  color: "#b91c1c",
                  fontWeight: "bold",
                }}
              >
                ✕ Supabase connection failed
              </p>

              {message && (
                <p
                  style={{
                    color: "#b91c1c",
                    wordBreak: "break-word",
                  }}
                >
                  {message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* GAME CODE */}

        <div style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Game Detection
          </h2>

          {gameCode ? (
            <>
              <p>
                Game code detected:
              </p>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#eff6ff",
                  border:
                    "1px solid #2563eb",
                  fontSize: 22,
                  fontWeight: "bold",
                  textAlign: "center",
                  letterSpacing: 2,
                }}
              >
                {gameCode}
              </div>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                This URL represents a player
                game link. The player invitation
                and booking system will be added
                in the next stages.
              </p>
            </>
          ) : (
            <>
              <p>
                No game code is present in the
                URL.
              </p>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                This is currently the host
                application entry point.
              </p>
            </>
          )}
        </div>

        {/* DEVELOPMENT STATUS */}

        <div style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Build Status
          </h2>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#f9fafb",
              border:
                "1px solid #e5e7eb",
            }}
          >
            <p>
              ✓ Step 1 — App foundation
            </p>

            <p>
              ⏳ Step 2 — Host Create Game
            </p>

            <p>
              ⏳ Step 3 — Host Control Centre
            </p>

            <p>
              ⏳ Step 4 — Player Invitation
            </p>

            <p>
              ⏳ Step 5 — Ticket Booking
            </p>

            <p>
              ⏳ Step 6 — Realtime Live Game
            </p>

            <p>
              ⏳ Step 7 — Number Calling
            </p>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              ⏳ Step 8 — Final Integration
            </p>
          </div>
        </div>

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
  <App />
);
