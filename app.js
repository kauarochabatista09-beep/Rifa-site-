const $ = (id) => document.getElementById(id);

const LS_KEY = "rifa_site_data_v1";
const RESULTS_KEY = "rifa_site_results_v1";

function loadData(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw) return JSON.parse(raw);
  const init = { rifas: [], orders: [] };
  localStorage.setItem(LS_KEY, JSON.stringify(init));
  return init;
}
function saveData(data){
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function loadResults(){
  const raw = localStorage.getItem(RESULTS_KEY);
  if(raw) return JSON.parse(raw);
  const init = { results: [] };
  localStorage.setItem(RESULTS_KEY, JSON.stringify(init));
  return init;
}

function money(v){
  return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}
function pad2(n){
  return String(n).padStart(2,"0");
}
function maskPhone(phone){
  if(!phone) return "-";
  const digits = String(phone).replace(/\D/g,"");
  if(digits.length < 8) return "*****";
  const last4 = digits.slice(-4);
  return `(**) *****-${last4}`;
}

let data = loadData();
let resultsData = loadResults();
let currentRifaId = null;

// ========== Sidebar ==========
function openSidebar(){ $("sidebar").classList.add("open"); }
function closeSidebar(){ $("sidebar").classList.remove("open"); }
$("menuBtn").onclick = openSidebar;
$("closeBtn").onclick = closeSidebar;
$("year").innerText = new Date().getFullYear();

// ========== Admin escondido ==========
(function secretAdminAccess(){
  const adminBtn = document.getElementById("adminHiddenLink");
  const logo = document.getElementById("secretLogo");
  if(!adminBtn || !logo) return;

  let taps = 0;
  let tapTimer = null;

  function showAdmin(){
    adminBtn.classList.remove("hidden");
    adminBtn.innerText = "Admin 🔒";
    setTimeout(() => adminBtn.classList.add("hidden"), 10000);
  }

  // Celular/Tablet: 5 toques no logo
  logo.addEventListener("click", () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(()=>taps=0, 1200);
    if(taps >= 5){
      taps = 0;
      showAdmin();
    }
  });

  // PC: Ctrl + Shift + A
  document.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    if(e.ctrlKey && e.shiftKey && k === "a"){
      showAdmin();
    }
  });
})();

// ========== Confete ==========
function fireConfetti(durationMs = 2500){
  const end = Date.now() + durationMs;
  const colors = ["#f5d76e", "#caa43a", "#ffffff", "#ffb020"];

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.zIndex = "9999";
  document.body.appendChild(container);

  function createPiece(){
    const piece = document.createElement("div");
    const size = Math.random() * 10 + 6;
    piece.style.position = "absolute";
    piece.style.width = size + "px";
    piece.style.height = (size * 0.6) + "px";
    piece.style.left = (Math.random() * 100) + "vw";
    piece.style.top = "-20px";
    piece.style.opacity = (Math.random() * 0.5 + 0.5).toFixed(2);
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = "4px";
    piece.style.transform = `rotate(${Math.random()*360}deg)`;

    const fall = Math.random() * 2 + 2.5;
    piece.animate(
      [{ transform:`translateY(0) rotate(0deg)` },{ transform:`translateY(110vh) rotate(${Math.random()*720}deg)` }],
      { duration: fall*1000, easing:"linear", fill:"forwards" }
    );

    container.appendChild(piece);
    setTimeout(()=>piece.remove(), fall*1000 + 200);
  }

  const interval = setInterval(()=>{
    for(let i=0;i<14;i++) createPiece();
    if(Date.now() > end){
      clearInterval(interval);
      setTimeout(()=>container.remove(), 1200);
    }
  }, 160);
}

// ========== Resultados ==========
function renderResultsBox(){
  const box = $("resultBox");
  const content = $("resultContent");
  if(!box || !content) return;

  resultsData = loadResults();
  if(!resultsData.results || resultsData.results.length === 0){
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");

  const list = [...resultsData.results].sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
  content.innerHTML = list.map(r => `
    <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">
      <b>${r.rifaTitle}</b><br>
      Número sorteado: <b>${pad2(r.luckyNumber)}</b><br>
      Ganhador(a): <b>${r.winnerName || "Não encontrado"}</b><br>
      Telefone: <b>${maskPhone(r.winnerPhone)}</b><br>
      <span style="color:rgba(255,255,255,.55);font-size:12px">
        Publicado em: ${new Date(r.publishedAt).toLocaleString("pt-BR")}
      </span>
    </div>
  `).join("");
}

// ========== Números aleatórios ==========
function getRandomFreeNumbers(rifa, qty){
  const free = rifa.numbers.filter(n => n.status === "free").map(n => n.num);
  if(qty > free.length) return null;

  for(let i=free.length-1;i>0;i--){
    const j = Math.floor(Math.random() * (i+1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free.slice(0, qty);
}

// ========== Render Rifas ==========
function renderRifas(){
  const grid = $("rifasGrid");
  grid.innerHTML = "";

  if(data.rifas.length === 0){
    grid.innerHTML = `<div class="card"><h3>Nenhuma rifa criada ainda</h3><p class="mini">O admin precisa criar uma rifa no painel.</p></div>`;
    return;
  }

  data.rifas.forEach(r => {
    const soldCount = r.numbers.filter(n => n.status === "sold").length;
    const resCount  = r.numbers.filter(n => n.status === "reserved").length;
    const freeCount = r.numbers.filter(n => n.status === "free").length;

    const badgeClass = freeCount > 0 ? "ok" : "bad";
    const badgeText  = freeCount > 0 ? "Disponível" : "Esgotado";

    const progressPct = Math.round(((soldCount + resCount) / r.numbers.length) * 100);

    const el = document.createElement("div");
    el.className = "card rifaCard";
    el.innerHTML = `
      <img src="${r.img || "https://images.unsplash.com/photo-1528826194825-0e0f1d5fdd8a?auto=format&fit=crop&w=1200&q=80"}" alt="Rifa">

      <div class="progressWrap">
        <div class="progressTop">
          <span>Progresso</span>
          <b>${progressPct}%</b>
        </div>
        <div class="progressBar">
          <div class="progressFill" style="width:${progressPct}%"></div>
        </div>
      </div>

      <h3>${r.title}</h3>
      <p class="mini">${r.desc}</p>

      <div class="rifaMeta">
        <span class="badge">${money(r.price)} / nº</span>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>

      <button class="btn primary">Comprar números</button>
    `;
    el.querySelector("button").onclick = () => openModal(r.id);
    grid.appendChild(el);
  });
}

// ========== Modal ==========
function openModal(rifaId){
  const rifa = data.rifas.find(x => x.id === rifaId);
  if(!rifa) return;
  currentRifaId = rifaId;

  $("modalTitle").innerText = rifa.title;
  $("modalDesc").innerText  = rifa.desc;
  $("modalImg").src         = rifa.img || "https://images.unsplash.com/photo-1528826194825-0e0f1d5fdd8a?auto=format&fit=crop&w=1200&q=80";

  $("buyerName").value = "";
  $("buyerPhone").value = "";
  $("buyerNumbers").value = "";
  if($("randomQty")) $("randomQty").value = "";

  $("payInfo").innerHTML =
    `<b>Pagamento via Pix:</b><br>
     Chave: <span style="color:#fff">${rifa.pix}</span><br><br>
     Após reservar, envie o comprovante para confirmação.`;

  renderNumbers(rifa);

  if($("btnRandom")){
    $("btnRandom").onclick = () => {
      const qty = parseInt(($("randomQty")?.value || "").trim(), 10);
      if(!qty || qty < 1){
        $("payInfo").innerHTML = "❌ Digite a quantidade de números aleatórios.";
        return;
      }

      const picks = getRandomFreeNumbers(rifa, qty);
      if(!picks){
        $("payInfo").innerHTML = `❌ Não há números livres suficientes para gerar ${qty}.`;
        return;
      }

      $("buyerNumbers").value = picks.map(pad2).join(", ");
      $("payInfo").innerHTML = `✅ Gerado ${qty} números aleatórios! 🍀`;
    };
  }

  $("modal").classList.add("show");
}
function closeModal(){ $("modal").classList.remove("show"); }
$("modalClose").onclick = closeModal;
$("modal").addEventListener("click",(e)=>{ if(e.target.id === "modal") closeModal(); });

// ========== Números ==========
function renderNumbers(rifa){
  const grid = $("numbersGrid");
  grid.innerHTML = "";

  rifa.numbers.forEach(n => {
    const el = document.createElement("div");
    el.className = `num ${n.status}`;
    el.innerText = pad2(n.num);

    el.onclick = () => {
      if(n.status === "sold") return;

      let val = $("buyerNumbers").value.trim();
      let arr = val ? val.split(",").map(x=>x.trim()).filter(Boolean) : [];

      const numTxt = pad2(n.num);
      if(arr.includes(numTxt)){
        arr = arr.filter(x=>x!==numTxt);
      }else{
        if(n.status === "reserved") return;
        arr.push(numTxt);
      }

      $("buyerNumbers").value = arr.join(", ");
    };

    grid.appendChild(el);
  });
}

// ========== Finalizar compra ==========
$("btnReserve").onclick = () => {
  const name = $("buyerName").value.trim();
  const phone = $("buyerPhone").value.trim();
  const nums = $("buyerNumbers").value.trim();

  if(!name || !phone || !nums){
    $("payInfo").innerHTML = "❌ Preencha nome, telefone e números.";
    return;
  }

  const rifa = data.rifas.find(x => x.id === currentRifaId);
  if(!rifa) return;

  const chosen = nums.split(",").map(x=>x.trim()).filter(Boolean);
  const chosenInts = chosen.map(x => parseInt(x,10)).filter(n=>!isNaN(n));

  for(const n of chosenInts){
    const numObj = rifa.numbers.find(z => z.num === n);
    if(!numObj || numObj.status !== "free"){
      $("payInfo").innerHTML = `❌ Número ${pad2(n)} não está disponível.`;
      return;
    }
  }

  chosenInts.forEach(n=>{
    const numObj = rifa.numbers.find(z => z.num === n);
    numObj.status = "reserved";
    numObj.buyer = {name, phone};
  });

  const order = {
    id: "ord_" + Date.now(),
    rifaId: rifa.id,
    rifaTitle: rifa.title,
    buyerName: name,
    buyerPhone: phone,
    numbers: chosenInts.map(pad2),
    total: chosenInts.length * rifa.price,
    status: "reserved",
    createdAt: new Date().toISOString()
  };

  data.orders.push(order);
  saveData(data);

  $("payInfo").innerHTML = `✅ Reserva feita com sucesso!<br><br>
🍀 <b>BOA SORTE!</b> Você já está concorrendo.<br><br>
<b>Total:</b> ${money(order.total)}<br>
<b>Pix:</b> <span style="color:#fff">${rifa.pix}</span><br><br>
Envie o comprovante para o admin confirmar.`;

  fireConfetti(2500);
  renderNumbers(rifa);
  renderRifas();
};

// ========== Minhas compras ==========
$("btnLookup").onclick = () => {
  const phone = $("lookupPhone").value.trim();
  if(!phone){
    $("lookupResult").innerText = "Digite seu telefone.";
    return;
  }

  const list = data.orders
    .filter(o => o.buyerPhone === phone)
    .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));

  if(list.length === 0){
    $("lookupResult").innerText = "Nenhuma compra encontrada.";
    return;
  }

  $("lookupResult").innerHTML = list.map(o=>`
    <div style="margin-bottom:10px">
      <b>${o.rifaTitle}</b><br>
      Nº: ${o.numbers.join(", ")}<br>
      Total: ${money(o.total)}<br>
      Status: <b style="color:${o.status==='paid'?'#2fda8f':'#ffb020'}">
        ${o.status==='paid'?'PAGO':'PENDENTE'}
      </b>
    </div>
  `).join("");
};

// init
renderResultsBox();
renderRifas();
// força esconder Admin na home (garantido)
(function forceHideAdmin(){
  const adminBtn = document.getElementById("adminHiddenLink") || document.querySelector('a[href="./admin.html"], a[href="admin.html"]');
  if(adminBtn) adminBtn.classList.add("hidden");
})();
