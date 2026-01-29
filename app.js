const $ = (id) => document.getElementById(id);

const LS_KEY = "rifa_site_data_v1";

function loadData(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw) return JSON.parse(raw);

  const init = {
    rifas: [],
    orders: []
  };
  localStorage.setItem(LS_KEY, JSON.stringify(init));
  return init;
}

function saveData(data){
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function money(v){
  return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function pad2(n){
  return String(n).padStart(2,"0");
}

let data = loadData();
let currentRifaId = null;

function openSidebar(){
  $("sidebar").classList.add("open");
}
function closeSidebar(){
  $("sidebar").classList.remove("open");
}

$("menuBtn").onclick = openSidebar;
$("closeBtn").onclick = closeSidebar;

$("year").innerText = new Date().getFullYear();

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

    // ✅ porcentagem (conta vendidos + reservados)
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

  $("payInfo").innerHTML = `<b>Pagamento via Pix:</b><br>Chave: <span style="color:#fff">${rifa.pix}</span><br><br>Após reservar, envie o comprovante para confirmação.`;

  renderNumbers(rifa);

  $("modal").classList.add("show");
}

function closeModal(){
  $("modal").classList.remove("show");
}

$("modalClose").onclick = closeModal;

$("modal").addEventListener("click",(e)=>{
  if(e.target.id === "modal") closeModal();
});

function renderNumbers(rifa){
  const grid = $("numbersGrid");
  grid.innerHTML = "";

  rifa.numbers.forEach(n => {
    const el = document.createElement("div");
    el.className = `num ${n.status}`;
    el.innerText = pad2(n.num);

    el.onclick = () => {
      if(n.status === "sold") return;

      // seleciona/desseleciona no input
      let val = $("buyerNumbers").value.trim();
      let arr = val ? val.split(",").map(x=>x.trim()).filter(Boolean) : [];

      const numTxt = pad2(n.num);
      if(arr.includes(numTxt)){
        arr = arr.filter(x=>x!==numTxt);
      }else{
        if(n.status === "reserved") return; // já reservado
        arr.push(numTxt);
      }
      $("buyerNumbers").value = arr.join(", ");
    };

    grid.appendChild(el);
  });
}

$("btnReserve").onclick = () => {
  const name = $("buyerName").value.trim();
  const phone = $("buyerPhone").value.trim();
  let nums = $("buyerNumbers").value.trim();

  if(!name || !phone || !nums){
    $("payInfo").innerHTML = "❌ Preencha nome, telefone e números.";
    return;
  }

  const rifa = data.rifas.find(x => x.id === currentRifaId);
  if(!rifa) return;

  const chosen = nums.split(",").map(x=>x.trim()).filter(Boolean);
  const chosenInts = chosen.map(x => parseInt(x,10)).filter(n=>!isNaN(n));

  // validar números
  for(const n of chosenInts){
    const numObj = rifa.numbers.find(z => z.num === n);
    if(!numObj || numObj.status !== "free"){
      $("payInfo").innerHTML = `❌ Número ${pad2(n)} não está disponível.`;
      return;
    }
  }

  // reservar
  chosenInts.forEach(n=>{
    const numObj = rifa.numbers.find(z => z.num === n);
    numObj.status = "reserved";
    numObj.buyer = {name, phone};
  });

  // criar pedido
  const order = {
    id: "ord_" + Date.now(),
    rifaId: rifa.id,
    rifaTitle: rifa.title,
    buyerName: name,
    buyerPhone: phone,
    numbers: chosenInts.map(pad2),
    total: chosenInts.length * rifa.price,
    status: "reserved", // admin confirma pago
    createdAt: new Date().toISOString()
  };

  data.orders.push(order);
  saveData(data);

  $("payInfo").innerHTML = `✅ Reserva feita!<br><br>
  <b>Total:</b> ${money(order.total)}<br>
  <b>Pix:</b> <span style="color:#fff">${rifa.pix}</span><br><br>
  Envie o comprovante para o admin confirmar.`;

  renderNumbers(rifa);
  renderRifas();
};

// lookup compras do comprador
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
      Status: <b style="color:${o.status==='paid'?'#2fda8f':'#ffb020'}">${o.status==='paid'?'PAGO':'PENDENTE'}</b>
    </div>
  `).join("");
};

renderRifas();
