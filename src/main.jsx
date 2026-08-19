import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./lib/supabase";

const nums=Array.from({length:90},(_,i)=>i+1);
const KEY="tambola_bingo_live_host_game";

const prizes0=[
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

function gameCode(){
  return new URLSearchParams(location.search).get("game");
}

function save(g){
  if(g)localStorage.setItem(KEY,JSON.stringify(g));
  else localStorage.removeItem(KEY);
}

function load(){
  try{
    const g=JSON.parse(localStorage.getItem(KEY));
    return g?.game_code?g:null;
  }catch{
    return null;
  }
}

/* ---------------- TICKET ---------------- */

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

    const vals=Array.from(
      {length:max-min+1},
      (_,i)=>min+i
    );

    const shift=(base*(c+3)+c*7)%vals.length;
    const v=vals.slice(shift).concat(vals.slice(0,shift));

    rows.forEach((r,ri)=>{
      if(r[c]){
        r[c]=v[(base+c*3+ri*5)%v.length];
      }
    });
  }

  return(
    <div
      style={{
        border:"1px solid #333",
        padding:6,
        margin:"8px 0",
        maxWidth:360,
        background:"#fff"
      }}
    >
      <b>Ticket #{n}</b>
      {name&&<span> — {name}</span>}

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(9,1fr)",
          marginTop:5
        }}
      >
        {rows.flat().map((v,i)=>(
          <div
            key={i}
            style={{
              border:"1px solid #aaa",
              height:30,
              textAlign:"center",
              lineHeight:"30px"
            }}
          >
            {v||""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- CREATE GAME ---------------- */

function Create({done}){
  const[
    h,
    setH
  ]=useState("");

  const[
    name,
    setName
  ]=useState("");

  const[
    limit,
    setLimit
  ]=useState("100");

  const[
    price,
    setPrice
  ]=useState("20");

  const[
    date,
    setDate
  ]=useState("");

  const[
    time,
    setTime
  ]=useState("");

  const[
    ps,
    setPs
  ]=useState(prizes0);

  const[
    custom,
    setCustom
  ]=useState("");

  const[
    busy,
    setBusy
  ]=useState(false);

  const[
    err,
    setErr
  ]=useState("");

  function prize(i,v){
    setPs(p=>
      p.map((x,j)=>
        j===i
          ?{...x,amount:v}
          :x
      )
    );
  }

  async function submit(e){
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
          .maybeSingle()
        ).data
      ){
        gc=code6();
      }

      const finalPrizes=ps
        .filter(p=>String(p.amount).trim()!=="")
        .map(p=>({
          ...p,
          amount:String(p.amount)
        }));

      const{
        data,
        error
      }=await supabase
        .from("games")
        .insert({
          host_name:h.trim(),
          game_name:name.trim(),
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

      done({
        ...data,
        status:"upcoming",
        gameStarted:false,
        calledNumbers:[],
        prizes:finalPrizes,
        bookingRequests:[]
      });

    }catch(e){
      setErr(e.message||"Could not create game");
    }finally{
      setBusy(false);
    }
  }

  return(
    <main>
      <h1>TAMBOLA BINGO LIVE</h1>
      <h2>Create Game</h2>

      {err&&<p>{err}</p>}

      <form onSubmit={submit}>

        <input
          placeholder="Host name"
          value={h}
          onChange={e=>setH(e.target.value)}
          required
        />

        <input
          placeholder="Game name"
          value={name}
          onChange={e=>setName(e.target.value)}
          required
        />

        <input
          type="number"
          min="1"
          placeholder="Ticket limit"
          value={limit}
          onChange={e=>setLimit(e.target.value)}
          required
        />

        <input
          type="number"
          min="0"
          placeholder="Ticket price"
          value={price}
          onChange={e=>setPrice(e.target.value)}
          required
        />

        <input
          type="date"
          value={date}
          onChange={e=>setDate(e.target.value)}
          required
        />

        <input
          type="time"
          value={time}
          onChange={e=>setTime(e.target.value)}
          required
        />

        <h3>Prizes</h3>

        {ps.map((p,i)=>(
          <div key={i}>
            <label>{p.name} </label>

            <input
              type="number"
              min="0"
              value={p.amount}
              onChange={e=>prize(i,e.target.value)}
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
              if(custom.trim()){
                setPs(p=>[
                  ...p,
                  {
                    name:custom.trim(),
                    amount:"",
                    approved:false,
                    winner:null
                  }
                ]);

                setCustom("");
              }
            }}
          >
            Add
          </button>
        </div>

        <br/>

        <button disabled={busy}>
          {busy?"Creating...":"Create Game"}
        </button>

      </form>
    </main>
  );
}

/* ---------------- POSTER GENERATOR ---------------- */

async function makePoster(game,url){

  const canvas=document.createElement("canvas");

  canvas.width=1080;
  canvas.height=1350;

  const ctx=canvas.getContext("2d");

  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,1080,1350);

  ctx.fillStyle="#111111";

  ctx.textAlign="center";

  ctx.font="bold 64px Arial";
  ctx.fillText("TAMBOLA BINGO LIVE",540,100);

  ctx.font="bold 52px Arial";
  ctx.fillText(game.game_name||"Tambola Game",540,190);

  ctx.font="32px Arial";
  ctx.fillText(
    "Hosted by: "+(game.host_name||"Host"),
    540,
    250
  );

  ctx.textAlign="left";

  ctx.font="bold 38px Arial";
  ctx.fillText("GAME DETAILS",80,340);

  ctx.font="32px Arial";

  ctx.fillText(
    "Date: "+(game.game_date||"-"),
    80,
    400
  );

  ctx.fillText(
    "Time: "+(game.game_time||"-"),
    80,
    450
  );

  ctx.fillText(
    "Ticket Price: ₹"+(game.ticket_price||0),
    80,
    500
  );

  ctx.fillText(
    "Available Tickets: "+(game.ticket_limit||0),
    80,
    550
  );

  ctx.fillText(
    "Status: "+(game.status||"upcoming"),
    80,
    600
  );

  ctx.font="bold 38px Arial";
  ctx.fillText("PRIZES",80,680);

  ctx.font="30px Arial";

  let y=730;

  const prizes=(game.prizes||[])
    .filter(p=>String(p.amount||"").trim()!=="");

  if(!prizes.length){
    ctx.fillText("Prize details coming soon",80,y);
    y+=50;
  }else{
    prizes.forEach(p=>{
      ctx.fillText(
        p.name+" - ₹"+p.amount,
        80,
        y
      );
      y+=50;
    });
  }

  ctx.font="bold 34px Arial";
  ctx.textAlign="center";

  ctx.fillText(
    "JOIN GAME",
    540,
    1050
  );

  ctx.font="26px Arial";

  ctx.fillText(
    url,
    540,
    1100
  );

  ctx.font="bold 30px Arial";

  ctx.fillText(
    "Open the link to book your ticket",
    540,
    1180
  );

  ctx.font="24px Arial";

  ctx.fillText(
    "Game Code: "+(game.game_code||""),
    540,
    1240
  );

  return new Promise(resolve=>{
    canvas.toBlob(blob=>{
      resolve(blob);
    },"image/png");
  });
}

/* ---------------- SHARE ---------------- */

async function shareGame(game){

  const url=
    `${location.origin}${location.pathname}?game=${game.game_code}`;

  try{

    const poster=await makePoster(game,url);

    const file=new File(
      [poster],
      `tambola-${game.game_code}.png`,
      {type:"image/png"}
    );

    if(
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({files:[file]})
    ){

      await navigator.share({
        title:game.game_name||"Tambola Bingo Live",
        text:
          `${game.game_name||"Tambola Bingo Live"}\n\n`+
          `Join the game:\n${url}`,
        files:[file]
      });

      return;
    }

    if(navigator.share){

      await navigator.share({
        title:game.game_name||"Tambola Bingo Live",
        text:
          `${game.game_name||"Tambola Bingo Live"}\n\n`+
          `Join the game:\n${url}`
      });

      return;
    }

    const a=document.createElement("a");

    a.href=URL.createObjectURL(poster);
    a.download=`tambola-${game.game_code}.png`;
    a.click();

    alert(
      "Poster created. The poster has been saved. Share this game link:\n\n"+
      url
    );

  }catch(e){

    if(e?.name==="AbortError")return;

    alert(
      "Could not open sharing.\n\nGame link:\n"+
      url
    );
  }
}

/* ---------------- BOOKINGS ---------------- */

function Bookings({game,setGame}){

  const r=game.bookingRequests||[];

  const pending=
    r.filter(x=>x.status==="pending");

  function update(id,status){

    setGame({
      ...game,
      bookingRequests:r.map(
        x=>x.id===id
          ?{...x,status}
          :x
      )
    });
  }

  return(
    <section>

      <h2>
        Ticket Bookings ({pending.length})
      </h2>

      {!r.length?
        <p>No pending bookings yet.</p>
        :
        r.map(x=>(
          <div
            key={x.id}
            style={{
              border:"1px solid #ccc",
              padding:10,
              margin:8
            }}
          >

            <b>{x.playerName}</b>

            <p>
              Tickets:{" "}
              {x.ticketNumbers
                .map(n=>`#${n}`)
                .join(", ")}
            </p>

            <p>
              Status: {x.status}
            </p>

            {x.status==="pending"&&(
              <>
                <button
                  onClick={()=>
                    update(x.id,"approved")
                  }
                >
                  Approve
                </button>

                {" "}

                <button
                  onClick={()=>
                    update(x.id,"rejected")
                  }
                >
                  Reject
                </button>
              </>
            )}

          </div>
        ))
      }

    </section>
  );
}

/* ---------------- LIVE GAME ---------------- */

function Live({game,setGame}){

  const called=game.calledNumbers||[];

  const last=called.at(-1);

  const remaining=
    nums.filter(n=>!called.includes(n));

  function call(){

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
      calledNumbers:[...called,n],
      status:"live"
    });
  }

  return(
    <section>

      <h2>Live Game</h2>

      <p>
        Current: <b>{last||"—"}</b>
        {" | "}
        Called: {called.length}/90
      </p>

      {!game.gameStarted?

        <button
          onClick={()=>
            setGame({
              ...game,
              gameStarted:true,
              status:"live",
              calledNumbers:[]
            })
          }
        >
          Start Game
        </button>

        :

        <>
          <button onClick={call}>
            Call Next Number
          </button>

          {" "}

          <button
            onClick={()=>
              setGame({
                ...game,
                gameStarted:false,
                status:"upcoming",
                calledNumbers:[]
              })
            }
          >
            Reset
          </button>
        </>
      }

      <p>
        {called.join(", ")||
        "No numbers called."}
      </p>

    </section>
  );
}

/* ---------------- HOST CONTROL ---------------- */

function Host({game,setGame,end}){

  const url=
    `${location.origin}${location.pathname}?game=${game.game_code}`;

  const prizes=(game.prizes||[])
    .filter(
      p=>String(p.amount||"").trim()!==""
    );

  return(
    <main>

      <h1>TAMBOLA BINGO LIVE</h1>

      <h2>Host Control Centre</h2>

      <button
        onClick={()=>{
          if(confirm("End game?")){
            end();
          }
        }}
      >
        End Game
      </button>

      <h2>{game.game_name}</h2>

      <p>
        Host: {game.host_name}
      </p>

      <p>
        Date: {game.game_date}
        {" | "}
        Time: {game.game_time}
      </p>

      <p>
        Price: ₹{game.ticket_price}
        {" | "}
        Tickets: {game.ticket_limit}
      </p>

      <p>
        Game Code: <b>{game.game_code}</b>
      </p>

      <h3>Share Game</h3>

      <button
        onClick={()=>{
          shareGame(game);
        }}
      >
        SHARE GAME + POSTER
      </button>

      <p>
        The poster will be automatically generated
        and shared together with the game link.
      </p>

      <input
        readOnly
        value={url}
        style={{width:"100%"}}
      />

      <button
        onClick={()=>
          navigator.clipboard?.writeText(url)
        }
      >
        Copy Link
      </button>

      <Bookings
        game={game}
        setGame={setGame}
      />

      <Live
        game={game}
        setGame={setGame}
      />

      <section>

        <h2>Prizes</h2>

        {!prizes.length&&(
          <p>No prizes added.</p>
        )}

        {prizes.map((p,i)=>(
          <div key={i}>

            {p.name}: ₹{p.amount}

            {" "}

            <button
              onClick={()=>
                setGame({
                  ...game,
                  prizes:game.prizes.map(
                    (x,j)=>
                      j===i
                        ?{
                            ...x,
                            approved:!x.approved
                          }
                        :x
                  )
                })
              }
            >
              {p.approved?
                "Approved":
                "Approve"
              }
            </button>

          </div>
        ))}

      </section>

    </main>
  );
}

/* ---------------- INVITATION ---------------- */

function Invitation({game,accept}){

  const prizes=(game.prizes||[])
    .filter(
      p=>String(p.amount||"").trim()!==""
    );

  return(
    <main>

      <h1>TAMBOLA BINGO LIVE</h1>

      <h2>{game.game_name}</h2>

      <p>
        Host: {game.host_name}
      </p>

      <h3>Prize List</h3>

      {!prizes.length?
        <p>No prizes listed.</p>
        :
        <ul>
          {prizes.map((p,i)=>(
            <li key={i}>
              {p.name}: ₹{p.amount}
            </li>
          ))}
        </ul>
      }

      <p>
        Available tickets: {game.ticket_limit}
      </p>

      <p>
        Ticket price: ₹{game.ticket_price}
      </p>

      <p>
        Status: {game.status}
      </p>

      <p>
        Game date: {game.game_date}
      </p>

      <p>
        Game time: {game.game_time}
      </p>

      <button onClick={accept}>
        I ACCEPT
      </button>

    </main>
  );
}

/* ---------------- PLAYER BOOKING ---------------- */

function Booking({game}){

  const[
    player,
    setPlayer
  ]=useState("");

  const[
    selected,
    setSelected
  ]=useState([]);

  const[
    sent,
    setSent
  ]=useState(false);

  const tickets=
    Array.from(
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

    if(
      !player.trim()||
      !selected.length
    ){
      alert(
        "Enter your name and select tickets."
      );
      return;
    }

    const request={
      id:Date.now(),
      playerName:player.trim(),
      ticketNumbers:[...selected]
        .sort((a,b)=>a-b),
      status:"pending",
      createdAt:new Date().toISOString()
    };

    const text=
      `Hi ${game.host_name||"Host"}, `+
      `${player.trim()} wants to book `+
      `${request.ticketNumbers
        .map(n=>`#${n}`)
        .join(", ")} `+
      `for ${game.game_name}. `+
      `Please approve my booking.`;

    localStorage.setItem(
      "tambola_player_request_"+game.game_code,
      JSON.stringify({
        player:player.trim(),
        tickets:request.ticketNumbers
      })
    );

    setSent(true);

    location.href=
      `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return(
    <main>

      <h1>Ticket Booking</h1>

      <p>
        {game.game_name}
      </p>

      <input
        placeholder="Player name"
        value={player}
        onChange={e=>
          setPlayer(e.target.value)
        }
        disabled={sent}
      />

      <h3>
        Ticket Numbers
      </h3>

      <div
        style={{
          display:"flex",
          flexWrap:"wrap",
          gap:4
        }}
      >

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

      {(selected.length?
        selected:
        [1]
      )
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
      ))}

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

/* ---------------- APP ---------------- */

function App(){

  const[
    page,
    setPage
  ]=useState("create");

  const[
    game,
    setGame
  ]=useState(null);

  const[
    playerGame,
    setPlayerGame
  ]=useState(null);

  const[
    error,
    setError
  ]=useState("");

  useEffect(()=>{

    const gc=gameCode();

    /* PLAYER LINK */

    if(gc){
      loadPlayer(gc);
      return;
    }

    /* HOST REFRESH */

    const saved=load();

    if(saved){
      setGame(saved);
      setPage("control");
    }

  },[]);

  useEffect(()=>{
    if(game){
      save(game);
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

    setPlayerGame({
      ...data,
      prizes:Array.isArray(data.prizes)
        ?data.prizes
        :prizes0,

      calledNumbers:
        Array.isArray(data.calledNumbers)
          ?data.calledNumbers
          :[],

      bookingRequests:
        Array.isArray(data.bookingRequests)
          ?data.bookingRequests
          :[]
    });

    setPage("invitation");
  }

  if(error){

    return(
      <main>
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

  if(
    page==="control"&&
    game
  ){

    return(
      <Host
        game={game}
        setGame={setGame}
        end={()=>{
          setGame(null);
          save(null);
          setPage("create");
        }}
      />
    );
  }

  /* NO HOME PAGE.
     CREATE GAME IS THE STARTING PAGE. */

  return(
    <Create
      done={g=>{
        setGame(g);
        setPage("control");
      }}
    />
  );
}

createRoot(
  document.getElementById("root")
).render(
  <App/>
);
