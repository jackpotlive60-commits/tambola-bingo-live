import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./lib/supabase";

const nums=Array.from({length:90},(_,i)=>i+1);
const KEY="tambola_bingo_live_host_game";

const defaultPrizes=[
 "First Five",
 "Four Corners",
 "Top Line",
 "Middle Line",
 "Bottom Line",
 "Full House"
].map(name=>({name,amount:"",approved:false,winner:null}));

function code6(){
 const s="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 return Array.from({length:6},()=>s[Math.floor(Math.random()*s.length)]).join("");
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
 }catch{return null}
}

const css=`
*{box-sizing:border-box}
body{
 margin:0;
 font-family:Arial,sans-serif;
 background:#f4f6f8;
 color:#17202a;
}
button,input{
 font:inherit;
}
button{
 border:0;
 border-radius:8px;
 padding:11px 15px;
 cursor:pointer;
 background:#111827;
 color:white;
 font-weight:600;
}
button:disabled{
 opacity:.5;
 cursor:not-allowed;
}
input{
 width:100%;
 padding:11px;
 border:1px solid #d1d5db;
 border-radius:8px;
 background:white;
}
.app{
 min-height:100vh;
}
.header{
 background:#111827;
 color:white;
 padding:18px 16px;
 text-align:center;
}
.header h1{
 margin:0;
 font-size:22px;
 letter-spacing:.5px;
}
.container{
 max-width:760px;
 margin:auto;
 padding:18px 14px 40px;
}
.card{
 background:white;
 border-radius:12px;
 padding:18px;
 margin-bottom:15px;
 box-shadow:0 2px 8px rgba(0,0,0,.06);
}
.card h2,.card h3{
 margin-top:0;
}
.title{
 font-size:25px;
 font-weight:700;
 margin:5px 0 8px;
}
.muted{
 color:#6b7280;
}
.grid2{
 display:grid;
 grid-template-columns:1fr 1fr;
 gap:10px;
}
.formrow{
 margin-bottom:12px;
}
.formrow label{
 display:block;
 font-size:13px;
 font-weight:bold;
 margin-bottom:5px;
}
.prize{
 display:grid;
 grid-template-columns:1fr 120px;
 gap:8px;
 align-items:center;
 margin-bottom:8px;
}
.info{
 display:grid;
 grid-template-columns:1fr 1fr;
 gap:10px;
}
.infoBox{
 background:#f8fafc;
 border:1px solid #e5e7eb;
 padding:12px;
 border-radius:8px;
}
.infoBox small{
 display:block;
 color:#6b7280;
 margin-bottom:4px;
}
.ticketNumbers{
 display:flex;
 flex-wrap:wrap;
 gap:5px;
}
.ticketNumbers button{
 padding:8px 10px;
 font-size:13px;
 background:#e5e7eb;
 color:#111827;
}
.ticketNumbers button.selected{
 background:#111827;
 color:white;
}
.actions{
 display:flex;
 flex-wrap:wrap;
 gap:8px;
}
.back{
 background:#6b7280;
 margin-bottom:12px;
}
.success{
 background:#ecfdf5;
 border:1px solid #a7f3d0;
 padding:12px;
 border-radius:8px;
}
.error{
 background:#fef2f2;
 border:1px solid #fecaca;
 padding:12px;
 border-radius:8px;
 color:#991b1b;
}
.invite{
 display:flex;
 gap:8px;
}
.invite input{
 flex:1;
}
.liveNumber{
 font-size:55px;
 font-weight:700;
 text-align:center;
 padding:20px;
 background:#f8fafc;
 border-radius:12px;
 margin-bottom:12px;
}
.called{
 display:flex;
 flex-wrap:wrap;
 gap:5px;
}
.called span{
 width:32px;
 height:32px;
 border-radius:50%;
 background:#e5e7eb;
 display:flex;
 align-items:center;
 justify-content:center;
 font-size:12px;
}
.ticket{
 border:2px solid #d1d5db;
 border-radius:8px;
 overflow:hidden;
 background:white;
 margin-top:10px;
}
.ticketTitle{
 padding:8px;
 font-weight:bold;
 background:#f3f4f6;
}
.ticketGrid{
 display:grid;
 grid-template-columns:repeat(9,1fr);
}
.ticketCell{
 min-height:34px;
 border:1px solid #d1d5db;
 display:flex;
 align-items:center;
 justify-content:center;
 font-size:13px;
}
.empty{
 color:#d1d5db;
}
.prizeLine{
 display:flex;
 justify-content:space-between;
 align-items:center;
 padding:10px 0;
 border-bottom:1px solid #eee;
}
@media(max-width:600px){
 .grid2,.info{
  grid-template-columns:1fr;
 }
 .prize{
  grid-template-columns:1fr 100px;
 }
 .invite{
  flex-direction:column;
 }
 .container{
  padding:12px 10px 30px;
 }
}
`;

function Layout({children}){
 return <div className="app">
  <style>{css}</style>
  <div className="header">
   <h1>TAMBOLA BINGO LIVE</h1>
  </div>
  <div className="container">{children}</div>
 </div>
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
  const vals=Array.from(
   {length:max-min+1},
   (_,i)=>min+i
  );
  const shift=(base*(c+3)+c*7)%vals.length;
  const v=vals.slice(shift).concat(vals.slice(0,shift));

  rows.forEach((r,ri)=>{
   if(r[c])r[c]=v[(base+c*3+ri*5)%v.length];
  });
 }

 return <div className="ticket">
  <div className="ticketTitle">
   Ticket #{n}{name?` - ${name}`:""}
  </div>
  <div className="ticketGrid">
   {rows.flat().map((v,i)=>
    <div className={`ticketCell ${v?"":"empty"}`} key={i}>
     {v||""}
    </div>
   )}
  </div>
 </div>;
}

function Home({create}){
 return <Layout>
  <div className="card" style={{textAlign:"center",padding:"35px 18px"}}>
   <div className="title">TAMBOLA BINGO LIVE</div>
   <p className="muted">
    Create and manage your Tambola game.
   </p>
   <button onClick={create}>CREATE GAME</button>
  </div>
 </Layout>;
}

function Create({back,done}){
 const[
  h,setH
 ]=useState("");

 const[
  name,setName
 ]=useState("");

 const[
  limit,setLimit
 ]=useState("100");

 const[
  price,setPrice
 ]=useState("20");

 const[
  date,setDate
 ]=useState("");

 const[
  time,setTime
 ]=useState("");

 const[
  ps,setPs
 ]=useState(defaultPrizes);

 const[
  custom,setCustom
 ]=useState("");

 const[
  busy,setBusy
 ]=useState(false);

 const[
  err,setErr
 ]=useState("");

 function prize(i,v){
  setPs(p=>p.map((x,j)=>
   j===i?{...x,amount:v}:x
  ));
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

   const cleanPrizes=ps
    .filter(p=>p.amount!==""&&Number(p.amount)>=0)
    .map(p=>({
     ...p,
     amount:String(p.amount)
    }));

   const{data,error}=await supabase
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
    prizes:cleanPrizes,
    bookingRequests:[]
   });

  }catch(e){
   setErr(e.message||"Could not create game");
  }finally{
   setBusy(false);
  }
 }

 return <Layout>
  <button className="back" onClick={back}>Back</button>

  <div className="card">
   <div className="title">Create Game</div>
   <p className="muted">
    Enter the details for your Tambola game.
   </p>

   {err&&<div className="error">{err}</div>}

   <form onSubmit={submit}>

    <div className="formrow">
     <label>HOST NAME</label>
     <input
      placeholder="Host name"
      value={h}
      onChange={e=>setH(e.target.value)}
      required
     />
    </div>

    <div className="formrow">
     <label>GAME NAME</label>
     <input
      placeholder="Game name"
      value={name}
      onChange={e=>setName(e.target.value)}
      required
     />
    </div>

    <div className="grid2">

     <div className="formrow">
      <label>TICKET LIMIT</label>
      <input
       type="number"
       min="1"
       value={limit}
       onChange={e=>setLimit(e.target.value)}
       required
      />
     </div>

     <div className="formrow">
      <label>PRICE / TICKET</label>
      <input
       type="number"
       min="0"
       value={price}
       onChange={e=>setPrice(e.target.value)}
       required
      />
     </div>

    </div>

    <div className="grid2">

     <div className="formrow">
      <label>GAME DATE</label>
      <input
       type="date"
       value={date}
       onChange={e=>setDate(e.target.value)}
       required
      />
     </div>

     <div className="formrow">
      <label>GAME TIME</label>
      <input
       type="time"
       value={time}
       onChange={e=>setTime(e.target.value)}
       required
      />
     </div>

    </div>

    <h3>Prize List</h3>
    <p className="muted">
     Only prizes where you enter an amount will appear in the game.
    </p>

    {ps.map((p,i)=>
     <div className="prize" key={i}>
      <span>{p.name}</span>
      <input
       type="number"
       min="0"
       placeholder="Amount"
       value={p.amount}
       onChange={e=>prize(i,e.target.value)}
      />
     </div>
    )}

    <div className="actions" style={{marginTop:10}}>
     <input
      placeholder="Add custom prize"
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

    <button
     style={{width:"100%",marginTop:15}}
     disabled={busy}
    >
     {busy?"Creating...":"CREATE GAME"}
    </button>

   </form>
  </div>
 </Layout>;
}

function Bookings({game,setGame}){
 const r=game.bookingRequests||[];
 const pending=r.filter(x=>x.status==="pending");

 function update(id,status){
  setGame({
   ...game,
   bookingRequests:r.map(x=>
    x.id===id?{...x,status}:x
   )
  });
 }

 return <div className="card">
  <h2>Ticket Bookings</h2>
  <p className="muted">
   Pending requests: <b>{pending.length}</b>
  </p>

  {!r.length?
   <p className="muted">No pending bookings yet.</p>
  :
   r.map(x=>
    <div
     key={x.id}
     style={{
      border:"1px solid #e5e7eb",
      borderRadius:8,
      padding:12,
      marginTop:10
     }}
    >
     <b>{x.playerName}</b>
     <p>
      Tickets: {x.ticketNumbers.map(n=>`#${n}`).join(", ")}
     </p>
     <p>Status: {x.status}</p>

     {x.status==="pending"&&
      <div className="actions">
       <button onClick={()=>update(x.id,"approved")}>
        Approve
       </button>

       <button
        style={{background:"#6b7280"}}
        onClick={()=>update(x.id,"rejected")}
       >
        Reject
       </button>
      </div>
     }
    </div>
   )
  }
 </div>;
}

function Live({game,setGame}){
 const called=game.calledNumbers||[];
 const last=called.at(-1);

 const remaining=nums.filter(
  n=>!called.includes(n)
 );

 function call(){
  if(!game.gameStarted)return;
  if(!remaining.length)return;

  const n=remaining[
   Math.floor(Math.random()*remaining.length)
  ];

  setGame({
   ...game,
   calledNumbers:[...called,n],
   status:"live"
  });
 }

 return <div className="card">
  <h2>Live Game</h2>

  <div className="liveNumber">
   {last||"—"}
  </div>

  <p style={{textAlign:"center"}}>
   Called: <b>{called.length}/90</b>
  </p>

  <div className="actions">
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
     START GAME
    </button>
   :
    <>
     <button onClick={call}>
      CALL NEXT NUMBER
     </button>

     <button
      style={{background:"#6b7280"}}
      onClick={()=>
       setGame({
        ...game,
        gameStarted:false,
        status:"upcoming",
        calledNumbers:[]
       })
      }
     >
      RESET
     </button>
    </>
   }
  </div>

  {called.length>0&&
   <>
    <h3>Called Numbers</h3>
    <div className="called">
     {called.map(n=>
      <span key={n}>{n}</span>
     )}
    </div>
   </>
  }
 </div>;
}

function Host({game,setGame,end}){
 const url=`${location.origin}/?game=${game.game_code}`;

 const activePrizes=(game.prizes||[])
  .filter(p=>p.amount!==""&&p.amount!==null&&p.amount!==undefined);

 return <Layout>

  <div className="card">

   <div className="title">
    {game.game_name}
   </div>

   <p className="muted">
    Host Control Centre
   </p>

   <div className="info">

    <div className="infoBox">
     <small>HOST</small>
     <b>{game.host_name}</b>
    </div>

    <div className="infoBox">
     <small>STATUS</small>
     <b>{game.status}</b>
    </div>

    <div className="infoBox">
     <small>DATE</small>
     <b>{game.game_date}</b>
    </div>

    <div className="infoBox">
     <small>TIME</small>
     <b>{game.game_time}</b>
    </div>

    <div className="infoBox">
     <small>TICKET PRICE</small>
     <b>Rs {game.ticket_price}</b>
    </div>

    <div className="infoBox">
     <small>TICKET LIMIT</small>
     <b>{game.ticket_limit}</b>
    </div>

   </div>
  </div>

  <div className="card">
   <h2>Share Game</h2>

   <div className="invite">
    <input readOnly value={url}/>

    <button
     onClick={()=>
      navigator.clipboard?.writeText(url)
     }
    >
     Copy Link
    </button>
   </div>

   <p className="muted">
    Share this link with your players.
   </p>
  </div>

  <Bookings
   game={game}
   setGame={setGame}
  />

  <Live
   game={game}
   setGame={setGame}
  />

  <div className="card">
   <h2>Prize List</h2>

   {!activePrizes.length?
    <p className="muted">
     No prizes added yet.
    </p>
   :
    activePrizes.map((p,i)=>
     <div className="prizeLine" key={i}>
      <span>{p.name}</span>

      <span>
       Rs {p.amount}

       <button
        style={{
         marginLeft:8,
         padding:"7px 10px"
        }}
        onClick={()=>
         setGame({
          ...game,
          prizes:game.prizes.map(x=>
           x.name===p.name
            ?{...x,approved:!x.approved}
            :x
          )
         })
        }
       >
        {p.approved?"Approved":"Approve"}
       </button>
      </span>
     </div>
    )
   }
  </div>

  <div className="card">
   <button
    style={{
     background:"#b91c1c",
     width:"100%"
    }}
    onClick={()=>{
     if(confirm("End game?"))end();
    }}
   >
    END GAME
   </button>
  </div>

 </Layout>;
}

function Invitation({game,accept}){
 const prizes=(game.prizes||[])
  .filter(p=>p.amount!==""&&p.amount!==null&&p.amount!==undefined);

 return <Layout>

  <div className="card">

   <div className="title">
    {game.game_name}
   </div>

   <p className="muted">
    You have been invited to join this Tambola game.
   </p>

   <div className="info">

    <div className="infoBox">
     <small>HOST</small>
     <b>{game.host_name}</b>
    </div>

    <div className="infoBox">
     <small>STATUS</small>
     <b>{game.status}</b>
    </div>

    <div className="infoBox">
     <small>DATE</small>
     <b>{game.game_date}</b>
    </div>

    <div className="infoBox">
     <small>TIME</small>
     <b>{game.game_time}</b>
    </div>

   </div>

  </div>

  <div className="card">
   <h2>Prize List</h2>

   {!prizes.length?
    <p className="muted">Prize details not added.</p>
   :
    prizes.map((p,i)=>
     <div className="prizeLine" key={i}>
      <span>{p.name}</span>
      <b>Rs {p.amount}</b>
     </div>
    )
   }
  </div>

  <div className="card">
   <h2>Game Details</h2>

   <p>
    Available Tickets:
    <b> {game.ticket_limit}</b>
   </p>

   <p>
    Price per Ticket:
    <b> Rs {game.ticket_price}</b>
   </p>

   <p>
    Game Date:
    <b> {game.game_date}</b>
   </p>

   <p>
    Game Time:
    <b> {game.game_time}</b>
   </p>

   <button
    style={{width:"100%",marginTop:10}}
    onClick={accept}
   >
    I ACCEPT
   </button>

  </div>

 </Layout>;
}

function Booking({game,back}){
 const[
  player,setPlayer
 ]=useState("");

 const[
  selected,setSelected
 ]=useState([]);

 const[
  sent,setSent
 ]=useState(false);

 const tickets=Array.from(
  {length:Math.max(1,Number(game.ticket_limit||100))},
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
   alert("Enter your name and select tickets.");
   return;
  }

  const request={
   id:Date.now(),
   playerName:player.trim(),
   ticketNumbers:[...selected].sort((a,b)=>a-b),
   status:"pending",
   createdAt:new Date().toISOString()
  };

  const text=
   `Hi ${game.host_name||"Host"}, `+
   `${player.trim()} wants to book `+
   `${request.ticketNumbers.map(n=>`#${n}`).join(", ")} `+
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

 return <Layout>

  <button
   className="back"
   onClick={back}
  >
   Back
  </button>

  <div className="card">

   <div className="title">
    Ticket Booking
   </div>

   <p className="muted">
    {game.game_name}
   </p>

   <div className="formrow">
    <label>PLAYER NAME</label>

    <input
     placeholder="Enter player name"
     value={player}
     onChange={e=>setPlayer(e.target.value)}
     disabled={sent}
    />
   </div>

  </div>

  <div className="card">

   <h2>Choose Ticket Number</h2>

   <div className="ticketNumbers">

    {tickets.map(n=>
     <button
      key={n}
      className={
       selected.includes(n)
        ?"selected"
        :""
      }
      onClick={()=>toggle(n)}
      disabled={sent}
     >
      #{n}
     </button>
    )}

   </div>

  </div>

  <div className="card">

   <h2>Actual 3 x 9 Tickets</h2>

   <p className="muted">
    Tap a ticket to select or remove it.
   </p>

   {(selected.length?selected:[1])
    .sort((a,b)=>a-b)
    .map(n=>
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
    )
   }

  </div>

  <div className="card">

   {!sent?
    <button
     style={{width:"100%"}}
     onClick={send}
     disabled={!player.trim()||!selected.length}
    >
     BOOK TICKETS
    </button>
   :
    <div className="success">
     Booking request sent.
     Waiting for host approval.
    </div>
   }

  </div>

 </Layout>;
}

function App(){

 const[
  page,setPage
 ]=useState("home");

 const[
  game,setGame
 ]=useState(null);

 const[
  playerGame,setPlayerGame
 ]=useState(null);

 const[
  error,setError
 ]=useState("");

 useEffect(()=>{

  const saved=load();

  const gc=gameCode();

  /*
   If this is the host's already-created game,
   keep the host control centre after refresh.
  */
  if(saved){
   setGame(saved);
   setPage("control");
  }

  if(gc){
   loadPlayer(gc);
  }

 },[]);

 useEffect(()=>{
  if(game)save(game);
 },[game]);

 async function loadPlayer(gc){

  const{
   data,
   error
  }=await supabase
   .from("games")
   .select("*")
   .eq("game_code",gc.toUpperCase())
   .maybeSingle();

  if(error||!data){
   setError(
    error?.message||"Game not found"
   );
   return;
  }

  setPlayerGame({
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
  });

  setPage("invitation");
 }

 if(error){
  return <Layout>
   <div className="card">
    <h2>Game Not Found</h2>
    <p>{error}</p>
   </div>
  </Layout>;
 }

 if(
  playerGame&&
  page==="invitation"
 ){
  return <Invitation
   game={playerGame}
   accept={()=>{
    setPage("booking");
   }}
  />;
 }

 if(
  playerGame&&
  page==="booking"
 ){
  return <Booking
   game={playerGame}
   back={()=>{
    setPage("invitation");
   }}
  />;
 }

 if(page==="create"){
  return <Create
   back={()=>
    setPage(
     game?"control":"home"
    )
   }
   done={g=>{
    setGame(g);
    setPage("control");
   }}
  />;
 }

 if(
  page==="control"&&
  game
 ){
  return <Host
   game={game}
   setGame={setGame}
   end={()=>{
    setGame(null);
    save(null);
    setPage("home");
   }}
  />;
 }

 return <Home
  create={()=>
   setPage("create")
  }
 />;
}

createRoot(
 document.getElementById("root")
).render(<App/>);
