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
  if(g){
    localStorage.setItem(KEY,JSON.stringify(g));
  }else{
    localStorage.removeItem(KEY);
  }
}

function load(){
  try{
    const g=JSON.parse(localStorage.getItem(KEY));
    return g?.game_code?g:null;
  }catch{
    return null;
  }
}


/* =========================
   TAMBOLA TICKET
========================= */

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

    const v=vals.slice(shift).concat(
      vals.slice(0,shift)
    );

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
        maxWidth:360
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


/* =========================
   CREATE GAME
========================= */

function Create({done}){

  const[h,setH]=useState("");
  const[name,setName]=useState("");
  const[limit,setLimit]=useState("100");
  const[price,setPrice]=useState("20");
  const[date,setDate]=useState("");
  const[time,setTime]=useState("");
  const[ps,setPs]=useState(prizes0);
  const[custom,setCustom]=useState("");
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState("");

  function prize(i,v){

    setPs(p=>
      p.map((x,j)=>
        j===i
          ?{...x,amount:v}
          :x
      )
    );

  }

  function addCustom(){

    if(!custom.trim())return;

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


      /*
        IMPORTANT:
        Only prizes with an amount are saved.
        Blank prize rows are removed.
      */

      const activePrizes=ps
        .filter(p=>String(p.amount).trim()!=="")
        .map(p=>({
          ...p,
          amount:String(p.amount).trim()
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

        /*
          Only selected/filled prizes
        */
        prizes:activePrizes,

        bookingRequests:[]

      });


    }catch(e){

      setErr(
        e.message||
        "Could not create game"
      );

    }finally{

      setBusy(false);

    }

  }


  return(

    <main>

      <h1>Create Game</h1>

      {err&&(
        <p>{err}</p>
      )}


      <form onSubmit={submit}>

        <input
          placeholder="Host name"
          value={h}
          onChange={e=>setH(e.target.value)}
          required
        />

        <br/>

        <input
          placeholder="Game name"
          value={name}
          onChange={e=>setName(e.target.value)}
          required
        />

        <br/>

        <input
          type="number"
          min="1"
          placeholder="Ticket limit"
          value={limit}
          onChange={e=>setLimit(e.target.value)}
          required
        />

        <br/>

        <input
          type="number"
          min="0"
          placeholder="Ticket price"
          value={price}
          onChange={e=>setPrice(e.target.value)}
          required
        />

        <br/>

        <input
          type="date"
          value={date}
          onChange={e=>setDate(e.target.value)}
          required
        />

        <br/>

        <input
          type="time"
          value={time}
          onChange={e=>setTime(e.target.value)}
          required
        />


        <h2>Prizes</h2>


        {ps.map((p,i)=>(

          <div key={i}>

            <label>
              {p.name}
            </label>

            <input
              type="number"
              min="0"
              value={p.amount}
              onChange={
                e=>prize(i,e.target.value)
              }
              placeholder="Amount"
            />

          </div>

        ))}


        <div>

          <input
            placeholder="Custom prize"
            value={custom}
            onChange={
              e=>setCustom(e.target.value)
            }
          />

          <button
            type="button"
            onClick={addCustom}
          >
            Add
          </button>

        </div>


        <button
          disabled={busy}
        >
          {busy
            ?"Creating..."
            :"Create Game"
          }
        </button>

      </form>

    </main>

  );

}


/* =========================
   BOOKINGS
========================= */

function Bookings({game,setGame}){

  const r=game.bookingRequests||[];

  const pending=r.filter(
    x=>x.status==="pending"
  );


  function update(id,status){

    setGame({

      ...game,

      bookingRequests:r.map(
        x=>
          x.id===id
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


      {!r.length&&(
        <p>
          No pending bookings yet.
        </p>
      )}


      {r.map(x=>(

        <div
          key={x.id}
          style={{
            border:"1px solid #ccc",
            padding:10,
            margin:8
          }}
        >

          <b>
            {x.playerName}
          </b>

          <p>
            Tickets:{" "}
            {x.ticketNumbers
              .map(n=>`#${n}`)
              .join(", ")
            }
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

      ))}

    </section>

  );

}


/* =========================
   LIVE GAME
========================= */

function Live({game,setGame}){

  const called=game.calledNumbers||[];

  const last=called.at(-1);

  const remaining=nums.filter(
    n=>!called.includes(n)
  );


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

      calledNumbers:[
        ...called,
        n
      ],

      status:"live"

    });

  }


  return(

    <section>

      <h2>Live Game</h2>

      <p>
        Current:{" "}
        <b>{last||"—"}</b>
        {" | "}
        Called: {called.length}/90
      </p>


      {!game.gameStarted?(

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

      ):(

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

      )}


      <p>
        {called.join(", ")||
          "No numbers called."
        }
      </p>

    </section>

  );

}


/* =========================
   HOST CONTROL
========================= */

function Host({game,setGame,end}){

  const url=
    `${location.origin}/?game=${game.game_code}`;


  /*
    Safety filter:
    Only prizes having an amount
    are displayed.
  */

  const activePrizes=
    (game.prizes||[])
      .filter(
        p=>String(p.amount||"").trim()!==""
      );


  return(

    <main>

      <button
        onClick={()=>{
          if(confirm("End game?")){
            end();
          }
        }}
      >
        End Game
      </button>


      <h1>
        {game.game_name}
      </h1>


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
        Invite:
        {" "}

        <input
          readOnly
          value={url}
        />

        <button
          onClick={()=>
            navigator.clipboard?.writeText(url)
          }
        >
          Copy
        </button>

      </p>


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


        {activePrizes.length===0&&(
          <p>
            No prizes added.
          </p>
        )}


        {activePrizes.map((p,i)=>(

          <div key={i}>

            {p.name}: ₹{p.amount}

            {" "}

            <button
              onClick={()=>
                setGame({
                  ...game,

                  prizes:
                    game.prizes.map(
                      x=>
                        x===p
                          ?{
                              ...x,
                              approved:!x.approved
                            }
                          :x
                    )

                })
              }
            >
              {p.approved
                ?"Approved"
                :"Approve"
              }
            </button>

          </div>

        ))}

      </section>

    </main>

  );

}


/* =========================
   PLAYER INVITATION
========================= */

function Invitation({game,accept,back}){

  /*
    Only prizes with amounts
    are shown to players.
  */

  const activePrizes=
    (game.prizes||[])
      .filter(
        p=>String(p.amount||"").trim()!==""
      );


  return(

    <main>

      <button onClick={back}>
        ←
      </button>


      <h1>
        {game.game_name}
      </h1>


      <p>
        Host: {game.host_name}
      </p>


      <p>
        Prize list:
      </p>


      {activePrizes.length===0?(
        <p>
          No prizes added.
        </p>
      ):(
        <ul>

          {activePrizes.map((p,i)=>(

            <li key={i}>
              {p.name}: ₹{p.amount}
            </li>

          ))}

        </ul>
      )}


      <p>
        Available tickets:{" "}
        {game.ticket_limit}
      </p>


      <p>
        Status: {game.status}
      </p>


      <p>
        Game:{" "}
        {game.game_date}{" "}
        {game.game_time}
      </p>


      <button onClick={accept}>
        I ACCEPT
      </button>

    </main>

  );

}


/* =========================
   PLAYER BOOKING
========================= */

function Booking({game,back}){

  const[player,setPlayer]=useState("");

  const[selected,setSelected]=useState([]);

  const[sent,setSent]=useState(false);


  const tickets=
    Array.from(
      {
        length:
          Math.max(
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

      playerName:
        player.trim(),

      ticketNumbers:
        [...selected].sort(
          (a,b)=>a-b
        ),

      status:"pending",

      createdAt:
        new Date().toISOString()

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
      `https://wa.me/?text=${
        encodeURIComponent(text)
      }`;

  }


  return(

    <main>

      <button onClick={back}>
        ← Back
      </button>


      <h1>
        Ticket Booking
      </h1>


      <p>
        {game.game_name}
      </p>


      <input
        placeholder="Player name"
        value={player}
        onChange={
          e=>setPlayer(e.target.value)
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

            {selected.includes(n)
              ?"✓ "
              :""
            }

            #{n}

          </button>

        ))}

      </div>


      <h3>
        Actual 3 × 9 Tickets
      </h3>


      {(selected.length
        ?selected
        :[1]
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


      {!sent?(

        <button
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


/* =========================
   APP
========================= */

function App(){

  /*
    No Home page anymore.
    Default page is Create Game.
  */

  const[page,setPage]=
    useState("create");

  const[game,setGame]=
    useState(null);

  const[playerGame,setPlayerGame]=
    useState(null);

  const[error,setError]=
    useState("");


  useEffect(()=>{

    const saved=load();

    if(saved){

      setGame(saved);

      setPage("control");

    }


    const gc=gameCode();

    if(gc){

      loadPlayer(gc);

    }

  },[]);


  useEffect(()=>{

    if(game){
      save(game);
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


    setPlayerGame({

      ...data,

      prizes:
        Array.isArray(data.prizes)
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

        <h2>
          Game Not Found
        </h2>

        <p>
          {error}
        </p>

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
        back={()=>{
          history.replaceState(
            {},
            "",
            location.pathname
          );

          setPlayerGame(null);

          setPage("create");

        }}
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
        back={()=>
          setPage("invitation")
        }
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
