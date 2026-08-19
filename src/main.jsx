import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./lib/supabase";

const nums=Array.from({length:90},(_,i)=>i+1);
const KEY="tambola_bingo_live_host_game";

const themes=[
  "Classic",
  "Royal",
  "Party",
  "Bollywood",
  "Neon",
  "Elegant"
];

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
  return Array.from({length:6},()=>s[Math.floor(Math.random()*s.length)]).join("");
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

function Ticket({n,name=""}){
  const masks=[
    [1,0,1,0,1,0,1,1,0],
    [0,1,0,1,0,1,0,1,1],
    [1,0,1,0,1,1,0,0,1]
  ];

  const rows=masks.map(r=>[...r]);
  const base=Math.max(1,Number(n)||1);

  for(let c=0;c<9;c++){
    const min=c?c*10:1;
    const max=c===8?90:c*10+9;
    const vals=Array.from({length:max-min+1},(_,i)=>min+i);
    const shift=(base*(c+3)+c*7)%vals.length;
    const v=vals.slice(shift).concat(vals.slice(0,shift));

    rows.forEach((r,ri)=>{
      if(r[c])r[c]=v[(base+c*3+ri*5)%v.length];
    });
  }

  return(
    <div style={{
      border:"1px solid #333",
      padding:6,
      margin:"8px 0",
      maxWidth:360,
      background:"#fff"
    }}>
      <b>Ticket #{n}</b>
      {name&&<span> — {name}</span>}

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(9,1fr)",
        marginTop:5
      }}>
        {rows.flat().map((v,i)=>(
          <div key={i} style={{
            border:"1px solid #aaa",
            height:30,
            textAlign:"center",
            lineHeight:"30px",
            fontSize:14
          }}>
            {v||""}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ================= HOST PAGE ================= */

function HostPage({game,setGame}){

  const[creating,setCreating]=useState(!game);

  const[name,setName]=useState(game?.game_name||"TambolaLive");
  const[limit,setLimit]=useState(game?.ticket_limit||100);
  const[price,setPrice]=useState(game?.ticket_price||20);
  const[date,setDate]=useState(game?.game_date||"");
  const[time,setTime]=useState(game?.game_time||"");

  const[theme,setTheme]=useState(
    game?.theme||"Classic"
  );

  const[prizes,setPrizes]=useState(
    game?.prizes?.length?game.prizes:defaultPrizes
  );

  const[custom,setCustom]=useState("");
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState("");

  const prizeChange=(i,value)=>{
    setPrizes(p=>
      p.map((x,j)=>
        j===i?{...x,amount:value}:x
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
        (await supabase
          .from("games")
          .select("id")
          .eq("game_code",gc)
          .maybeSingle()).data
      ){
        gc=code6();
      }

      const cleanPrizes=prizes.filter(
        p=>
          p.amount!==""&&
          p.amount!==null&&
          p.amount!==undefined
      );

      const{data,error}=await supabase
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
        theme:theme,
        gameStarted:false,
        calledNumbers:[],
        prizes:cleanPrizes,
        bookingRequests:[]
      };

      setGame(g);
      saveGame(g);
      setCreating(false);

    }catch(e){
      setErr(e.message||"Could not create game");
    }finally{
      setBusy(false);
    }
  }


  /* ================= SHARE ================= */

  async function shareGame(){

    if(!game)return;

    try{

      const canvas=document.createElement("canvas");

      canvas.width=1080;
      canvas.height=1350;

      const ctx=canvas.getContext("2d");

      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,1080,1350);

      ctx.fillStyle="#111827";
      ctx.fillRect(0,0,1080,250);

      ctx.fillStyle="#ffffff";
      ctx.textAlign="center";

      ctx.font="bold 72px Arial";
      ctx.fillText("TAMBOLA LIVE",540,105);

      ctx.font="bold 50px Arial";
      ctx.fillText(
        game.game_name||"TambolaLive",
        540,
        180
      );

      ctx.fillStyle="#111827";
      ctx.textAlign="left";

      ctx.font="bold 40px Arial";
      ctx.fillText("GAME DETAILS",80,340);

      ctx.font="34px Arial";

      ctx.fillText(
        `Theme: ${game.theme||"Classic"}`,
        90,410
      );

      ctx.fillText(
        `Date: ${game.game_date||"-"}`,
        90,465
      );

      ctx.fillText(
        `Time: ${game.game_time||"-"}`,
        90,520
      );

      ctx.fillText(
        `Ticket Price: ₹${game.ticket_price||0}`,
        90,575
      );

      ctx.fillText(
        `Tickets Available: ${game.ticket_limit||0}`,
        90,630
      );

      const realPrizes=(game.prizes||[]).filter(
        p=>
          p&&
          p.name&&
          p.amount!==""&&
          p.amount!==null&&
          p.amount!==undefined
      );

      ctx.font="bold 40px Arial";
      ctx.fillText("PRIZES",80,720);

      ctx.font="32px Arial";

      realPrizes.forEach((p,i)=>{
        ctx.fillText(
          `${i+1}. ${p.name} - ₹${p.amount}`,
          100,
          780+(i*55)
        );
      });

      const url=
        `${location.origin}/?game=${game.game_code}`;

      ctx.textAlign="center";
      ctx.font="bold 42px Arial";
      ctx.fillText("JOIN THE GAME",540,1100);

      ctx.font="28px Arial";
      ctx.fillText(
        "Open the invitation link to book tickets",
        540,1155
      );

      ctx.font="24px Arial";
      ctx.fillText(url,540,1220);

      const blob=await new Promise(resolve=>
        canvas.toBlob(resolve,"image/png")
      );

      if(!blob)throw new Error("Poster failed");

      const file=new File(
        [blob],
        "TambolaLive-Game-Poster.png",
        {type:"image/png"}
      );

      const message=
        `Join my Tambola game!\n\n`+
        `${game.game_name||"TambolaLive"}\n`+
        `Date: ${game.game_date||"-"}\n`+
        `Time: ${game.game_time||"-"}\n`+
        `Ticket: ₹${game.ticket_price||0}\n\n`+
        `Join here:\n${url}`;

      if(
        navigator.share&&
        navigator.canShare&&
        navigator.canShare({files:[file]})
      ){
        await navigator.share({
          title:game.game_name||"TambolaLive",
          text:message,
          files:[file]
        });
        return;
      }

      if(navigator.share){
        await navigator.share({
          title:game.game_name||"TambolaLive",
          text:message,
          url:url
        });
        return;
      }

      await navigator.clipboard?.writeText(message);

      alert("Game link copied.");

    }catch(e){

      if(e?.name==="AbortError")return;

      console.error(e);

      alert("Could not share the game.");
    }
  }


  async function copyLink(){

    const url=
      `${location.origin}/?game=${game.game_code}`;

    try{
      await navigator.clipboard.writeText(url);
      alert("Game link copied.");
    }catch{
      prompt("Copy this game link:",url);
    }
  }


  /* ================= CREATE ================= */

  if(creating){

    return(
      <main style={{
        maxWidth:600,
        margin:"20px auto",
        padding:20
      }}>

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
                  prizeChange(i,e.target.value)
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


  /* ================= CONTROL CENTRE ================= */

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
      (game.prizes||[]).map((p,j)=>
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

  const visiblePrizes=(game.prizes||[]).filter(
    p=>
      p.amount!==""&&
      p.amount!==null&&
      p.amount!==undefined
  );

  return(
    <main style={{
      maxWidth:700,
      margin:"20px auto",
      padding:20
    }}>

      <h1>{game.game_name}</h1>

      <h2>Host Control Centre</h2>

      <p>
        Date: {game.game_date}
      </p>

      <p>
        Time: {game.game_time}
      </p>

      <p>
        Ticket Price: ₹{game.ticket_price}
      </p>

      <p>
        Ticket Limit: {game.ticket_limit}
      </p>

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

      <p>
        Selected Theme:
        {" "}
        <b>{game.theme||"Classic"}</b>
      </p>

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
        <p>
          No prizes added yet.
        </p>
      )}

      {visiblePrizes.map((p)=>{

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
              Status:
              {" "}
              <b>
                {p.approved
                  ?"Approved"
                  :"Pending"
                }
              </b>
            </p>

            <button
              onClick={()=>
                approvePrize(originalIndex)
              }
            >
              {p.approved
                ?"Remove Approval"
                :"Approve Prize"
              }
            </button>

          </div>
        );
      })}

      <hr/>

      <h2>Ticket Bookings</h2>

      <p>
        Pending booking requests will appear here.
      </p>

      <div style={{
        border:"1px solid #ccc",
        padding:15
      }}>
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


/* ================= LIVE GAME ================= */

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
          :"No numbers called."
        }
      </p>

    </section>
  );
}


/* ================= PLAYER INVITATION ================= */

function Invitation({game,accept}){

  const prizes=(game.prizes||[]).filter(
    p=>
      p.amount!==""&&
      p.amount!==null&&
      p.amount!==undefined
  );

  return(
    <main style={{
      maxWidth:600,
      margin:"20px auto",
      padding:20
    }}>

      <h1>{game.game_name}</h1>

      <p>
        <b>Date:</b> {game.game_date}
      </p>

      <p>
        <b>Time:</b> {game.game_time}
      </p>

      <p>
        <b>Ticket Price:</b> ₹{game.ticket_price}
      </p>

      <p>
        <b>Available Tickets:</b> {game.ticket_limit}
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

  const[player,setPlayer]=useState("");
  const[selected,setSelected]=useState([]);
  const[sent,setSent]=useState(false);

  const tickets=Array.from(
    {
      length:Math.max(
        1,
        Number(game.ticket_limit||100)
      )
    },
    (_,i)=>i+1
  );

  function toggle(n){

    if(sent)return;

    setSelected(s=>
      s.includes(n)
        ?s.filter(x=>x!==n)
        :[...s,n]
    );
  }

  function send(){

    if(!player.trim()||!selected.length){

      alert(
        "Enter your name and select tickets."
      );

      return;
    }

    const sorted=[
      ...selected
    ].sort((a,b)=>a-b);

    const url=
      `${location.origin}/?game=${game.game_code}`;

    const text=
      `Hi, I want to book tickets `+
      `${sorted.map(n=>`#${n}`).join(", ")}`+
      ` for ${game.game_name}.\n\n`+
      `Player: ${player.trim()}\n`+
      `Game: ${url}`;

    setSent(true);

    location.href=
      `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return(
    <main style={{
      maxWidth:700,
      margin:"20px auto",
      padding:20
    }}>

      <h1>Ticket Booking</h1>

      <p>{game.game_name}</p>

      <input
        placeholder="Player name"
        value={player}
        onChange={e=>setPlayer(e.target.value)}
        disabled={sent}
      />

      <h3>Ticket Numbers</h3>

      <div style={{
        display:"flex",
        flexWrap:"wrap",
        gap:5
      }}>

        {tickets.map(n=>(
          <button
            key={n}
            onClick={()=>toggle(n)}
            disabled={sent}
          >
            {selected.includes(n)?"✓ ":""}
            #{n}
          </button>
        ))}

      </div>

      <h3>
        Actual 3 × 9 Tickets
      </h3>

      {(selected.length?selected:[1])
        .sort((a,b)=>a-b)
        .map(n=>(
          <div
            key={n}
            onClick={()=>
              !sent&&toggle(n)
            }
          >
            <Ticket
              n={n}
              name={player}
            />
          </div>
        ))
      }

      {!sent?

        <button
          onClick={send}
          disabled={
            !player.trim()||
            !selected.length
          }
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

    const{
      data,
      error
    }=await supabase
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

      prizes:Array.isArray(data.prizes)
        ?data.prizes
        :defaultPrizes,

      calledNumbers:Array.isArray(data.calledNumbers)
        ?data.calledNumbers
        :[],

      bookingRequests:Array.isArray(data.bookingRequests)
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

  if(playerGame&&page==="invitation"){

    return(
      <Invitation
        game={playerGame}
        accept={()=>{
          setPage("booking");
        }}
      />
    );
  }

  if(playerGame&&page==="booking"){

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
