import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./lib/supabase";

const nums=Array.from({length:90},(_,i)=>i+1);
const KEY="tambola_bingo_live_host_game";

const themes=["Classic","Royal","Party","Bollywood","Neon","Elegant"];

const defaultPrizes=[
  "First Five",
  "Four Corners",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House"
].map(name=>({
  name,
  amount:"",
  approved:false,
  winner:null
}));

function code6(){
  const s="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    {length:6},
    ()=>s[Math.floor(Math.random()*s.length)]
  ).join("");
}

function getGameCode(){
  return new URLSearchParams(location.search).get("game");
}

function saveGame(g){
  if(g)localStorage.setItem(KEY,JSON.stringify(g));
  else localStorage.removeItem(KEY);
}

function loadGame(){
  try{
    const g=JSON.parse(localStorage.getItem(KEY));
    return g?.game_code?g:null;
  }catch{
    return null;
  }
}


/* ================= 3 x 9 TAMBOLA TICKET ================= */

function Ticket({n,name="",selected=false,onClick}){

  const patterns=[
    [
      [1,0,1,0,1,0,1,0,1],
      [0,1,0,1,0,1,0,1,1],
      [1,0,1,1,0,1,0,1,0]
    ],
    [
      [1,0,0,1,1,0,1,0,1],
      [0,1,1,0,0,1,0,1,1],
      [1,0,1,0,1,1,0,1,0]
    ],
    [
      [1,1,0,1,0,1,0,1,0],
      [0,0,1,0,1,0,1,0,1],
      [1,1,1,0,1,0,1,1,0]
    ]
  ];

  const pattern=
    patterns[(Number(n)-1)%patterns.length];

  const rows=[
    [...pattern[0]],
    [...pattern[1]],
    [...pattern[2]]
  ];

  const ranges=[];

  for(let c=0;c<9;c++){

    const min=c===0?1:c*10;
    const max=c===8?90:c*10+9;

    ranges.push(
      Array.from(
        {length:max-min+1},
        (_,i)=>min+i
      )
    );
  }

  const used=new Set();

  for(let c=0;c<9;c++){

    const values=[...ranges[c]];

    const shift=
      (Number(n)*7+c*3)%
      values.length;

    const rotated=
      values.slice(shift).concat(
        values.slice(0,shift)
      );

    let index=0;

    for(let r=0;r<3;r++){

      if(rows[r][c]===1){

        let value=
          rotated[index%rotated.length];

        let tries=0;

        while(
          used.has(value)&&
          tries<rotated.length
        ){
          index++;
          value=
            rotated[index%rotated.length];
          tries++;
        }

        rows[r][c]=value;
        used.add(value);
        index++;
      }
    }
  }

  return(
    <div
      onClick={onClick}
      style={{
        border:selected
          ?"3px solid #111"
          :"1px solid #333",
        padding:8,
        margin:"10px 0",
        maxWidth:380,
        background:"#fff",
        cursor:"pointer"
      }}
    >

      <div style={{marginBottom:7}}>
        <b>Ticket #{n}</b>

        {selected&&(
          <span> ✓ Selected</span>
        )}

        {name&&(
          <span> — {name}</span>
        )}
      </div>

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(9,1fr)",
          border:"1px solid #333"
        }}
      >

        {rows.flat().map((v,i)=>(
          <div
            key={i}
            style={{
              border:"1px solid #aaa",
              height:34,
              textAlign:"center",
              lineHeight:"34px",
              fontSize:15,
              fontWeight:v?"bold":"normal"
            }}
          >
            {v||""}
          </div>
        ))}

      </div>

    </div>
  );
}


/* ================= HOST ================= */

function HostPage({game,setGame}){

  const[creating,setCreating]=useState(!game);

  const[name,setName]=useState(
    game?.game_name||"TambolaLive"
  );

  const[limit,setLimit]=useState(
    game?.ticket_limit||100
  );

  const[price,setPrice]=useState(
    game?.ticket_price||20
  );

  const[date,setDate]=useState(
    game?.game_date||""
  );

  const[time,setTime]=useState(
    game?.game_time||""
  );

  const[theme,setTheme]=useState(
    game?.theme||"Classic"
  );

  const[prizes,setPrizes]=useState(
    game?.prizes?.length
      ?game.prizes
      :defaultPrizes
  );

  const[custom,setCustom]=useState("");
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState("");

  const prizeChange=(i,value)=>{
    setPrizes(p=>
      p.map((x,j)=>
        j===i
          ?{...x,amount:value}
          :x
      )
    );
  };

  async function createGame(e){

    e.preventDefault();
    setBusy(true);
    setErr("");

    try{

      let gc=code6();

      while(
        (
          await supabase
            .from("games")
            .select("id")
            .eq("game_code",gc)
            .maybeSingle()
        ).data
      ){
        gc=code6();
      }

      const cleanPrizes=
        prizes.filter(
          p=>
            p.amount!==""&&
            p.amount!==null&&
            p.amount!==undefined
        );

      const{data,error}=
        await supabase
          .from("games")
          .insert({
            host_name:"Host",
            game_name:name.trim()||"TambolaLive",
            status:"upcoming",
            ticket_limit:Number(limit),
            ticket_price:Number(price),
            call_interval_seconds:5,
            game_date:date,
            game_time:time,
            game_code:gc,
            invite_enabled:true
          })
          .select()
          .single();

      if(error)throw error;

      const g={
        ...data,
        game_name:name.trim()||"TambolaLive",
        host_name:"Host",
        status:"upcoming",
        theme,
        gameStarted:false,
        calledNumbers:[],
        prizes:cleanPrizes,
        bookingRequests:[]
      };

      setGame(g);
      saveGame(g);
      setCreating(false);

    }catch(e){

      setErr(
        e.message||
        "Could not create game"
      );

    }finally{
      setBusy(false);
    }
  }

  async function shareGame(){

    if(!game)return;

    const url=
      `${location.origin}/?game=${game.game_code}`;

    const message=
      `Join my Tambola game!\n\n`+
      `${game.game_name||"TambolaLive"}\n`+
      `Date: ${game.game_date||"-"}\n`+
      `Time: ${game.game_time||"-"}\n`+
      `Ticket: ₹${game.ticket_price||0}\n\n`+
      `Join here:\n${url}`;

    if(navigator.share){

      try{

        await navigator.share({
          title:
            game.game_name||
            "TambolaLive",
          text:message,
          url
        });

      }catch(e){

        if(e?.name!=="AbortError"){
          console.error(e);
        }
      }

    }else{

      try{

        await navigator.clipboard.writeText(
          message
        );

        alert("Game link copied.");

      }catch{

        prompt(
          "Copy this game link:",
          url
        );
      }
    }
  }

  async function copyLink(){

    const url=
      `${location.origin}/?game=${game.game_code}`;

    try{

      await navigator.clipboard.writeText(url);

      alert("Game link copied.");

    }catch{

      prompt(
        "Copy this game link:",
        url
      );
    }
  }

  if(creating){

    return(
      <main
        style={{
          maxWidth:600,
          margin:"20px auto",
          padding:20
        }}
      >

        <h1>TAMBOLA LIVE</h1>
        <h2>Create Game</h2>

        {err&&<p>{err}</p>}

        <form onSubmit={createGame}>

          <label>Game Name</label>
          <br/>

          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="TambolaLive"
          />

          <br/><br/>

          <label>Ticket Limit</label>
          <br/>

          <input
            type="number"
            min="1"
            value={limit}
            onChange={e=>setLimit(e.target.value)}
            required
          />

          <br/><br/>

          <label>Ticket Price</label>
          <br/>

          <input
            type="number"
            min="0"
            value={price}
            onChange={e=>setPrice(e.target.value)}
            required
          />

          <br/><br/>

          <label>Game Date</label>
          <br/>

          <input
            type="date"
            value={date}
            onChange={e=>setDate(e.target.value)}
            required
          />

          <br/><br/>

          <label>Game Time</label>
          <br/>

          <input
            type="time"
            value={time}
            onChange={e=>setTime(e.target.value)}
            required
          />

          <br/><br/>

          <label>Game Theme</label>
          <br/>

          <select
            value={theme}
            onChange={e=>setTheme(e.target.value)}
          >

            {themes.map(t=>(
              <option key={t} value={t}>
                {t}
              </option>
            ))}

          </select>

          <h3>Prizes</h3>

          {prizes.map((p,i)=>(
            <div
              key={i}
              style={{marginBottom:8}}
            >

              <label>{p.name}</label>
              <br/>

              <input
                type="number"
                value={p.amount}
                onChange={e=>
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
              onChange={e=>setCustom(e.target.value)}
            />

            <button
              type="button"
              onClick={()=>{
                if(!custom.trim())return;

                setPrizes(p=>[
                  ...p,
                  {
                    name:custom.trim(),
                    amount:"",
                    approved:false,
                    winner:null
                  }
                ]);

                setCustom("");
              }}
            >
              Add
            </button>

          </div>

          <br/>

          <button
            disabled={busy}
            type="submit"
          >
            {busy?"Creating...":"Create Game"}
          </button>

        </form>

      </main>
    );
  }

  const inviteUrl=
    `${location.origin}/?game=${game.game_code}`;

  function changeTheme(value){

    const updated={
      ...game,
      theme:value
    };

    setGame(updated);
    saveGame(updated);
  }

  function approvePrize(i){

    const updatedPrizes=
      (game.prizes||[]).map(
        (p,j)=>
          j===i
            ?{...p,approved:!p.approved}
            :p
      );

    const updated={
      ...game,
      prizes:updatedPrizes
    };

    setGame(updated);
    saveGame(updated);
  }

  const visiblePrizes=
    (game.prizes||[]).filter(
      p=>
        p.amount!==""&&
        p.amount!==null&&
        p.amount!==undefined
    );

  return(
    <main
      style={{
        maxWidth:700,
        margin:"20px auto",
        padding:20
      }}
    >

      <h1>{game.game_name}</h1>
      <h2>Host Control Centre</h2>

      <p>Date: {game.game_date}</p>
      <p>Time: {game.game_time}</p>
      <p>Ticket Price: ₹{game.ticket_price}</p>
      <p>Ticket Limit: {game.ticket_limit}</p>

      <hr/>

      <h3>Game Theme</h3>

      <select
        value={game.theme||"Classic"}
        onChange={e=>
          changeTheme(e.target.value)
        }
      >

        {themes.map(t=>(
          <option key={t} value={t}>
            {t}
          </option>
        ))}

      </select>

      <hr/>

      <h3>Share Game</h3>

      <input
        readOnly
        value={inviteUrl}
        style={{width:"70%"}}
      />

      <button onClick={copyLink}>
        Copy Link
      </button>

      <button
        onClick={shareGame}
        style={{marginLeft:8}}
      >
        Share Game
      </button>

      <hr/>

      <h2>Prizes</h2>

      {!visiblePrizes.length&&(
        <p>No prizes added yet.</p>
      )}

      {visiblePrizes.map(p=>{

        const originalIndex=
          (game.prizes||[]).indexOf(p);

        return(
          <div
            key={originalIndex}
            style={{
              border:"1px solid #ccc",
              padding:10,
              marginBottom:8
            }}
          >

            <b>{p.name}</b>

            <p>
              Amount: ₹{p.amount}
            </p>

            <p>
              Status:{" "}
              <b>
                {p.approved
                  ?"Approved"
                  :"Pending"}
              </b>
            </p>

            <button
              onClick={()=>
                approvePrize(
                  originalIndex
                )
              }
            >
              {p.approved
                ?"Remove Approval"
                :"Approve Prize"}
            </button>

          </div>
        );

      })}

      <hr/>

      <h2>Ticket Bookings</h2>

      <p>
        Pending booking requests will appear here.
      </p>

      <div
        style={{
          border:"1px solid #ccc",
          padding:15
        }}
      >
        No pending bookings yet.
      </div>

      <hr/>

      <h2>Live Game</h2>

      <Live
        game={game}
        setGame={setGame}
      />

      <hr/>

      <button
        onClick={()=>{
          if(confirm("End this game?")){
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


/* ================= LIVE ================= */

function Live({game,setGame}){

  const called=game.calledNumbers||[];
  const last=called.at(-1);
  const remaining=nums.filter(
    n=>!called.includes(n)
  );

  function start(){

    setGame({
      ...game,
      gameStarted:true,
      status:"live",
      calledNumbers:[]
    });

  }

  function callNext(){

    if(!game.gameStarted)return;
    if(!remaining.length)return;

    const n=
      remaining[
        Math.floor(
          Math.random()*remaining.length
        )
      ];

    setGame({
      ...game,
      status:"live",
      calledNumbers:[
        ...called,
        n
      ]
    });

  }

  function reset(){

    setGame({
      ...game,
      gameStarted:false,
      status:"upcoming",
      calledNumbers:[]
    });

  }

  return(
    <section>

      <p>
        Current Number:
        {" "}
        <b>{last||"—"}</b>
      </p>

      <p>
        Called: {called.length}/90
      </p>

      {!game.gameStarted?

        <button onClick={start}>
          Start Game
        </button>

        :

        <>
          <button onClick={callNext}>
            Call Next Number
          </button>

          <button
            onClick={reset}
            style={{marginLeft:8}}
          >
            Reset
          </button>
        </>
      }

      <p>
        {called.length
          ?called.join(", ")
          :"No numbers called."}
      </p>

    </section>
  );
}


/* ================= PLAYER INVITATION ================= */

function Invitation({game,accept}){

  const prizes=
    (game.prizes||[]).filter(
      p=>
        p.amount!==""&&
        p.amount!==null&&
        p.amount!==undefined
    );

  return(
    <main
      style={{
        maxWidth:600,
        margin:"20px auto",
        padding:20
      }}
    >

      <h1>{game.game_name}</h1>

      <p>
        <b>Date:</b> {game.game_date}
      </p>

      <p>
        <b>Time:</b> {game.game_time}
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
        <b>Status:</b> {game.status}
      </p>

      <h3>Prize List</h3>

      {prizes.map((p,i)=>(
        <p key={i}>
          {p.name}: ₹{p.amount}
        </p>
      ))}

      <button onClick={accept}>
        I ACCEPT
      </button>

    </main>
  );
}


/* ================= PLAYER BOOKING ================= */

function Booking({game}){

  const[searchName,setSearchName]=useState("");
  const[searchedPlayer,setSearchedPlayer]=useState(null);

  const[selected,setSelected]=useState([]);

  /*
  NEW:
  This controls which actual 3x9 ticket
  is currently visible.
  */
  const[displayTicket,setDisplayTicket]=useState(1);

  const[sent,setSent]=useState(false);

  const ticketLimit=
    Math.max(
      1,
      Number(game.ticket_limit||100)
    );

  const ticketNumbers=
    Array.from(
      {length:ticketLimit},
      (_,i)=>i+1
    );


  function searchPlayer(){

    const term=
      searchName.trim().toLowerCase();

    if(!term){

      setSearchedPlayer(null);

      alert(
        "Type a player name first."
      );

      return;
    }

    const requests=
      game.bookingRequests||[];

    const found=
      requests.find(x=>
        String(x.playerName||"")
          .toLowerCase()
          .includes(term)
      );

    if(found){

      setSearchedPlayer(
        found.playerName
      );

    }else{

      setSearchedPlayer(null);

      alert("No player found.");

    }
  }


  /*
  When a ticket number is tapped:
  1. Show that actual ticket.
  2. Toggle its selected state.
  */

  function chooseTicket(n){

    if(sent)return;

    setDisplayTicket(n);

    setSelected(s=>
      s.includes(n)
        ?s.filter(x=>x!==n)
        :[...s,n]
    );
  }


  function send(){

    if(!selected.length){

      alert(
        "Select at least one ticket."
      );

      return;
    }

    const sorted=
      [...selected].sort(
        (a,b)=>a-b
      );

    const url=
      `${location.origin}/?game=${game.game_code}`;

    const playerName=
      searchedPlayer||
      searchName.trim()||
      "Player";

    const text=
      `Hi, I want to book tickets `+
      `${sorted.map(n=>`#${n}`).join(", ")}`+
      ` for ${game.game_name}.\n\n`+
      `Player: ${playerName}\n`+
      `Game: ${url}`;

    setSent(true);

    location.href=
      `https://wa.me/?text=${
        encodeURIComponent(text)
      }`;
  }


  return(
    <main
      style={{
        maxWidth:700,
        margin:"20px auto",
        padding:20
      }}
    >

      <h1>Ticket Booking</h1>

      <p>{game.game_name}</p>


      <h3>Search Player</h3>

      <div>

        <input
          placeholder="Type player name"
          value={searchName}
          onChange={e=>{
            setSearchName(e.target.value);
            setSearchedPlayer(null);
          }}
          disabled={sent}
        />

        <button
          type="button"
          onClick={searchPlayer}
          disabled={sent}
        >
          Search
        </button>

      </div>


      {searchedPlayer&&(
        <p>
          Player found:
          {" "}
          <b>{searchedPlayer}</b>
        </p>
      )}


      <h3>
        Select Ticket
      </h3>

      <div
        style={{
          display:"flex",
          flexWrap:"wrap",
          gap:5
        }}
      >

        {ticketNumbers.map(n=>(
          <button
            key={n}
            onClick={()=>
              chooseTicket(n)
            }
            disabled={sent}
            style={{
              fontWeight:
                displayTicket===n
                  ?"bold"
                  :"normal",
              border:
                displayTicket===n
                  ?"2px solid #111"
                  :"1px solid #aaa",
              background:
                selected.includes(n)
                  ?"lightgreen"
                  :"white"
            }}
          >

            {selected.includes(n)
              ?"✓ "
              :""
            }

            #{n}

          </button>
        ))}

      </div>


      <h3>
        Actual 3 × 9 Tambola Ticket
      </h3>

      <p>
        Showing Ticket #{displayTicket}
      </p>


      {/* 
        ONLY ONE ACTUAL TICKET IS SHOWN.
        Tapping another ticket number above
        changes this ticket.
      */}

      <Ticket
        key={displayTicket}
        n={displayTicket}
        name={
          searchedPlayer||
          searchName.trim()
        }
        selected={
          selected.includes(displayTicket)
        }
        onClick={()=>
          chooseTicket(displayTicket)
        }
      />


      {selected.length>0&&(
        <p>
          Selected tickets:
          {" "}
          <b>
            {selected
              .slice()
              .sort((a,b)=>a-b)
              .map(n=>`#${n}`)
              .join(", ")}
          </b>
        </p>
      )}


      {!sent?

        <button
          onClick={send}
          disabled={!selected.length}
        >
          BOOK TICKETS
        </button>

        :

        <p>
          Booking request sent.
          Waiting for host approval.
        </p>
      }

    </main>
  );
}


/* ================= APP ================= */

function App(){

  const[game,setGame]=useState(null);
  const[playerGame,setPlayerGame]=useState(null);
  const[page,setPage]=useState("host");
  const[error,setError]=useState("");

  useEffect(()=>{

    const saved=loadGame();

    if(saved){

      setGame(saved);
      setPage("host");

    }

    const gc=getGameCode();

    if(gc){
      loadPlayer(gc);
    }

  },[]);


  useEffect(()=>{

    if(game){
      saveGame(game);
    }

  },[game]);


  async function loadPlayer(gc){

    const{data,error}=
      await supabase
        .from("games")
        .select("*")
        .eq(
          "game_code",
          gc.toUpperCase()
        )
        .maybeSingle();

    if(error||!data){

      setError(
        error?.message||
        "Game not found"
      );

      return;
    }

    const g={
      ...data,

      prizes:
        Array.isArray(data.prizes)
          ?data.prizes
          :defaultPrizes,

      calledNumbers:
        Array.isArray(data.calledNumbers)
          ?data.calledNumbers
          :[],

      bookingRequests:
        Array.isArray(data.bookingRequests)
          ?data.bookingRequests
          :[]
    };

    setPlayerGame(g);
    setPage("invitation");
  }


  if(error){

    return(
      <main style={{padding:20}}>

        <h2>Game Not Found</h2>

        <p>{error}</p>

      </main>
    );
  }


  if(
    playerGame&&
    page==="invitation"
  ){

    return(
      <Invitation
        game={playerGame}
        accept={()=>
          setPage("booking")
        }
      />
    );
  }


  if(
    playerGame&&
    page==="booking"
  ){

    return(
      <Booking
        game={playerGame}
      />
    );
  }


  return(
    <HostPage
      game={game}
      setGame={setGame}
    />
  );
}


createRoot(
  document.getElementById("root")
).render(
  <App/>
);
