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
];

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
  <div style={{
   border:"1px solid #222",
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


/* CREATE GAME */

function CreateGame({onCreated}){

 const[name,setName]=useState("");
 const[limit,setLimit]=useState("100");
 const[price,setPrice]=useState("20");
 const[date,setDate]=useState("");
 const[time,setTime]=useState("");
 const[amounts,setAmounts]=useState({});
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");

 function setPrize(name,value){
  setAmounts(a=>({
   ...a,
   [name]:value
  }));
 }

 async function createGame(e){

  e.preventDefault();

  setBusy(true);
  setError("");

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

   const prizes=defaultPrizes
    .filter(p=>String(amounts[p]||"").trim()!=="")
    .map(p=>({
     name:p,
     amount:amounts[p],
     approved:false,
     winner:null
    }));

   const{data,error}=await supabase
    .from("games")
    .insert({
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

   const game={
    ...data,
    status:"upcoming",
    gameStarted:false,
    calledNumbers:[],
    prizes,
    bookingRequests:[]
   };

   onCreated(game);

  }catch(e){
   setError(e.message||"Could not create game");
  }finally{
   setBusy(false);
  }
 }

 return(
  <main style={{
   maxWidth:600,
   margin:"30px auto",
   padding:20,
   fontFamily:"Arial"
  }}>

   <h1>TAMBOLA BINGO LIVE</h1>

   <h2>Create Game</h2>

   {error&&(
    <p style={{color:"red"}}>{error}</p>
   )}

   <form onSubmit={createGame}>

    <input
     style={inputStyle}
     placeholder="Game name"
     value={name}
     onChange={e=>setName(e.target.value)}
     required
    />

    <input
     style={inputStyle}
     type="number"
     min="1"
     placeholder="Ticket limit"
     value={limit}
     onChange={e=>setLimit(e.target.value)}
     required
    />

    <input
     style={inputStyle}
     type="number"
     min="0"
     placeholder="Ticket price"
     value={price}
     onChange={e=>setPrice(e.target.value)}
     required
    />

    <input
     style={inputStyle}
     type="date"
     value={date}
     onChange={e=>setDate(e.target.value)}
     required
    />

    <input
     style={inputStyle}
     type="time"
     value={time}
     onChange={e=>setTime(e.target.value)}
     required
    />

    <h3>Prize Amounts</h3>

    <p style={{fontSize:14}}>
     Enter an amount only for prizes that will be played.
     Blank prizes will not appear in the game.
    </p>

    {defaultPrizes.map(p=>(
     <div
      key={p}
      style={{
       display:"flex",
       gap:10,
       alignItems:"center",
       marginBottom:8
      }}
     >

      <label style={{flex:1}}>
       {p}
      </label>

      <input
       style={{
        ...inputStyle,
        margin:0,
        width:120
       }}
       type="number"
       min="0"
       placeholder="Amount"
       value={amounts[p]||""}
       onChange={e=>setPrize(p,e.target.value)}
      />

     </div>
    ))}

    <button
     style={buttonStyle}
     disabled={busy}
    >
     {busy?"Creating...":"CREATE GAME"}
    </button>

   </form>

  </main>
 );
}


/* BOOKINGS */

function Bookings({game,setGame}){

 const requests=game.bookingRequests||[];

 const pending=requests.filter(
  x=>x.status==="pending"
 );

 function update(id,status){

  setGame({
   ...game,
   bookingRequests:requests.map(x=>
    x.id===id
     ?{...x,status}
     :x
   )
  });
 }

 return(
  <section style={panelStyle}>

   <h2>
    Ticket Bookings ({pending.length})
   </h2>

   {!requests.length&&(
    <p>No pending bookings yet.</p>
   )}

   {requests.map(x=>(
    <div
     key={x.id}
     style={{
      border:"1px solid #ccc",
      padding:12,
      margin:"10px 0"
     }}
    >

     <b>{x.playerName}</b>

     <p>
      Tickets:
      {" "}
      {x.ticketNumbers
       .map(n=>`#${n}`)
       .join(", ")}
     </p>

     <p>
      Status: <b>{x.status}</b>
     </p>

     {x.status==="pending"&&(
      <div>

       <button
        onClick={()=>update(x.id,"approved")}
       >
        Approve
       </button>

       {" "}

       <button
        onClick={()=>update(x.id,"rejected")}
       >
        Reject
       </button>

      </div>
     )}

    </div>
   ))}

  </section>
 );
}


/* LIVE GAME */

function Live({game,setGame}){

 const called=game.calledNumbers||[];
 const last=called.at(-1);

 const remaining=nums.filter(
  n=>!called.includes(n)
 );

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
   calledNumbers:[...called,n],
   status:"live"
  });
 }

 function start(){

  setGame({
   ...game,
   gameStarted:true,
   status:"live",
   calledNumbers:[]
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
  <section style={panelStyle}>

   <h2>Live Game</h2>

   <p>
    Current Number:
    {" "}
    <b style={{fontSize:28}}>
     {last||"—"}
    </b>
   </p>

   <p>
    Called: {called.length}/90
   </p>

   {!game.gameStarted?(
    <button
     style={buttonStyle}
     onClick={start}
    >
     START GAME
    </button>
   ):(
    <>
     <button
      style={buttonStyle}
      onClick={callNext}
     >
      CALL NEXT NUMBER
     </button>

     {" "}

     <button onClick={reset}>
      Reset
     </button>
    </>
   )}

   <p>
    {called.join(", ")||"No numbers called."}
   </p>

  </section>
 );
}


/* HOST CONTROL CENTRE */

function HostControl({game,setGame,end}){

 const url=
  `${location.origin}/?game=${game.game_code}`;

 const prizes=(game.prizes||[])
  .filter(
   p=>String(p.amount||"").trim()!==""
  );

 return(
  <main style={{
   maxWidth:800,
   margin:"20px auto",
   padding:20,
   fontFamily:"Arial"
  }}>

   <div style={{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center"
   }}>

    <div>
     <h1>TAMBOLA BINGO LIVE</h1>
     <h2>Host Control Centre</h2>
    </div>

    <button
     onClick={()=>{
      if(confirm("End this game?")){
       end();
      }
     }}
    >
     End Game
    </button>

   </div>


   <section style={panelStyle}>

    <h2>{game.game_name}</h2>

    <p>
     <b>Game Code:</b>{" "}
     {game.game_code}
    </p>

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

   </section>


   <section style={panelStyle}>

    <h2>Share Game</h2>

    <input
     style={{
      ...inputStyle,
      width:"100%",
      boxSizing:"border-box"
     }}
     readOnly
     value={url}
    />

    <button
     style={buttonStyle}
     onClick={()=>{
      navigator.clipboard?.writeText(url);
      alert("Game link copied");
     }}
    >
     COPY GAME LINK
    </button>

   </section>


   <section style={panelStyle}>

    <h2>Prize List</h2>

    {!prizes.length&&(
     <p>No prizes added.</p>
    )}

    {prizes.map((p,i)=>(
     <div
      key={i}
      style={{
       padding:"8px 0",
       borderBottom:"1px solid #ddd"
      }}
     >

      <b>{p.name}</b>

      {" — "}

      ₹{p.amount}

      {" "}

      <button
       onClick={()=>{
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
        });
       }}
      >
       {p.approved
        ?"Approved"
        :"Approve"}
      </button>

     </div>
    ))}

   </section>


   <Bookings
    game={game}
    setGame={setGame}
   />

   <Live
    game={game}
    setGame={setGame}
   />

  </main>
 );
}


/* PLAYER INVITATION */

function Invitation({game,accept}){

 const prizes=(game.prizes||[])
  .filter(
   p=>String(p.amount||"").trim()!==""
  );

 return(
  <main style={{
   maxWidth:600,
   margin:"30px auto",
   padding:20,
   fontFamily:"Arial"
  }}>

   <h1>{game.game_name}</h1>

   <h2>Prize List</h2>

   {prizes.map((p,i)=>(
    <p key={i}>
     {p.name}: ₹{p.amount}
    </p>
   ))}

   <p>
    <b>Available Tickets:</b>{" "}
    {game.ticket_limit}
   </p>

   <p>
    <b>Status:</b>{" "}
    {game.status}
   </p>

   <p>
    <b>Game Date:</b>{" "}
    {game.game_date}
   </p>

   <p>
    <b>Game Time:</b>{" "}
    {game.game_time}
   </p>

   <button
    style={buttonStyle}
    onClick={accept}
   >
    I ACCEPT
   </button>

  </main>
 );
}


/* PLAYER BOOKING */

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
   `${player.trim()} wants to book `+
   `${request.ticketNumbers
    .map(n=>`#${n}`)
    .join(", ")} `+
   `for ${game.game_name}. `+
   `Please approve my booking.`;

  localStorage.setItem(
   "tambola_player_request_"+
   game.game_code,
   JSON.stringify(request)
  );

  setSent(true);

  location.href=
   `https://wa.me/?text=${
    encodeURIComponent(text)
   }`;
 }

 return(
  <main style={{
   maxWidth:700,
   margin:"20px auto",
   padding:20,
   fontFamily:"Arial"
  }}>

   <h1>Ticket Booking</h1>

   <h2>{game.game_name}</h2>

   <input
    style={inputStyle}
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
      style={{
       minWidth:45,
       padding:8,
       background:
        selected.includes(n)
         ?"black"
         :"white",
       color:
        selected.includes(n)
         ?"white"
         :"black"
      }}
     >
      {selected.includes(n)
       ?"✓ "
       :""}#{n}
     </button>
    ))}

   </div>

   <h3>Actual 3 × 9 Tickets</h3>

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
    ))}

   {!sent?(
    <button
     style={buttonStyle}
     onClick={send}
     disabled={
      !player.trim()||
      !selected.length
     }
    >
     BOOK TICKETS
    </button>
   ):(
    <p>
     Booking request sent.
     Waiting for host approval.
    </p>
   )}

  </main>
 );
}


/* APP */

function App(){

 const[game,setGame]=useState(null);
 const[playerGame,setPlayerGame]=useState(null);
 const[page,setPage]=useState("host");
 const[error,setError]=useState("");

 useEffect(()=>{

  const gc=gameCode();

  if(gc){
   loadPlayer(gc);
   return;
  }

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
    :[],
   calledNumbers:Array.isArray(
    data.calledNumbers
   )
    ?data.calledNumbers
    :[],
   bookingRequests:Array.isArray(
    data.bookingRequests
   )
    ?data.bookingRequests
    :[]
  });

  setPage("invitation");
 }


 function created(g){

  setGame(g);
  save(g);
  setPage("control");

  history.replaceState(
   {},
   "",
   location.pathname
  );
 }


 function endGame(){

  setGame(null);
  save(null);
  setPage("host");
 }


 if(error){

  return(
   <main style={{
    padding:30,
    fontFamily:"Arial"
   }}>
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
    accept={()=>setPage("booking")}
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


 if(!game){

  return(
   <CreateGame
    onCreated={created}
   />
  );
 }


 return(
  <HostControl
   game={game}
   setGame={setGame}
   end={endGame}
  />
 );
}


const inputStyle={
 display:"block",
 width:"100%",
 padding:"10px",
 marginBottom:"10px",
 boxSizing:"border-box",
 fontSize:16
};

const buttonStyle={
 padding:"11px 18px",
 fontSize:16,
 cursor:"pointer",
 marginTop:8
};

const panelStyle={
 border:"1px solid #ccc",
 padding:15,
 marginTop:15,
 background:"#fafafa"
};


createRoot(
 document.getElementById("root")
).render(
 <App/>
);
