const $ = (id) => document.getElementById(id);

const LS_KEY = "rifa_site_data_v1";

// TROQUE SUA SENHA AQUI:
const ADMIN_PASSWORD = "Kaua2025";

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
function money(v){
  return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

let data = loadData();

$("btnLogin").onclick = () => {
  const pass = $("adminPass").value.trim();
  if(pass !== ADMIN_PASSWORD){
    $("loginMsg").innerHTML = "❌ Senha incorreta.";
    return;
  }
  $("loginMsg").innerHTML = "✅ Logado com sucesso!";
  $("adminPanel").classList.remove("hidden");
};

$("btnCreateRifa").onclick = () => {
  const title = $("newTitle").value.trim();
  const desc  = $("newDesc").value.trim();
  const img   = $("newImg").value.trim();
  const price = Number($("newPrice").value);
  const total = parseInt($("newTotal").value, 10);
  const pix   = $("newPix").value.trim();

  if(!title || !desc || !price || !total || !pix){
    alert("Preencha título, descrição, preço, total de números e pix.");
    return;
  }

  const numbers = [];
  for(let i=1;i<=total;i++){
    numbers.push({ num:i, status:"free", buyer:null });
  }

  const rifa = {
    id: "rifa_" + Date.now(),
    title, desc, img, price, pix,
    createdAt: new Date().toISOString(),
    numbers
  };

  data.rifas.push(rifa);
  saveData(data);

  $("newTitle").value = "";
  $("newDesc").value = "";
  $("newImg").value = "";
  $("newPrice").value = "";
  $("newTotal").value = "";
  $("newPix").value = "";

  renderAdmin();
};

function uniquePhonesFromOrders(){
  const set = new Set();
  data.orders.forEach(o=>{
    if(o.buyerPhone) set.add(o.buyerPhone);
  });
  return [...set];
}

function getFewLeftRifas(limit){
  const result = [];
  data.rifas.forEach(r=>{
    const freeCount = r.numbers.filter(n=>n.status==="free").length;
    if(freeCount > 0 && freeCount <= limit){
      result.push({ rifa:r, freeCount });
    }
  });
  return result;
}

function renderAdmin(){
  // rifas
  const adminRifas = $("adminRifas");
  adminRifas.innerHTML = "";

  data.rifas.forEach(r => {
    const soldCount = r.numbers.filter(n => n.status === "sold").length;
    const resCount  = r.numbers.filter(n => n.status === "reserved").length;
    const freeCount = r.numbers.filter(n => n.status === "free").length;

    const el = document.createElement("div");
    el.className = "card rifaCard";
    el.innerHTML = `
      <img src="${r.img || "https://images.unsplash.com/photo-1528826194825-0e0f1d5fdd8a?auto=format&fit=crop&w=1200&q=80"}">
      <h3>${r.title}</h3>
      <div class="rifaMeta">
        <span class="badge">Livres: ${freeCount}</span>
        <span class="badge warn">Reserv: ${resCount}</span>
        <span class="badge ok">Vend: ${soldCount}</span>
      </div>
      <button class="btn">Excluir rifa</button>
    `;

    el.querySelector("button").onclick = () => {
      if(confirm("Excluir essa rifa? (vai apagar também as reservas relacionadas)")){
        data.rifas = data.rifas.filter(x=>x.id!==r.id);
        data.orders = data.orders.filter(o=>o.rifaId!==r.id);
        saveData(data);
        renderAdmin();
      }
    };

    adminRifas.appendChild(el);
  });

  // pedidos
  const box = $("adminOrders");
  const orders = [...data.orders].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  if(orders.length===0){
    box.innerHTML = "Sem reservas ainda.";
  }else{
    box.innerHTML = orders.map(o=>`
      <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">
        <b>${o.rifaTitle}</b><br>
        Comprador: ${o.buyerName} (${o.buyerPhone})<br>
        Nº: ${o.numbers.join(", ")}<br>
        Total: ${money(o.total)}<br>
        Status: <b style="color:${o.status==='paid'?'#2fda8f':'#ffb020'}">${o.status==='paid'?'PAGO':'PENDENTE'}</b><br><br>

        <button class="btn primary" onclick="markPaid('${o.id}')">Confirmar Pago</button>
        <button class="btn" style="margin-top:8px" onclick="cancelOrder('${o.id}')">Cancelar</button>
      </div>
    `).join("");
  }

  // aviso whatsapp info
  const warnMsg = $("warnMsg");
  if(warnMsg && $("fewLeftLimit")){
    const limit = parseInt($("fewLeftLimit").value || "10", 10);
    const few = getFewLeftRifas(limit);
    if(few.length===0){
      warnMsg.innerHTML = `✅ Nenhuma rifa com poucos números no momento (limite: ${limit}).`;
    }else{
      warnMsg.innerHTML = `⚠️ Existem ${few.length} rifa(s) com poucos números (limite: ${limit}).`;
    }
  }
}

window.markPaid = (orderId) => {
  const order = data.orders.find(x=>x.id===orderId);
  if(!order) return;

  const rifa = data.rifas.find(x=>x.id===order.rifaId);
  if(!rifa) return;

  order.numbers.forEach(numTxt=>{
    const n = parseInt(numTxt,10);
    const obj = rifa.numbers.find(z=>z.num===n);
    if(obj){
      obj.status = "sold";
    }
  });

  order.status = "paid";
  saveData(data);
  renderAdmin();
};

window.cancelOrder = (orderId) => {
  const order = data.orders.find(x=>x.id===orderId);
  if(!order) return;

  const rifa = data.rifas.find(x=>x.id===order.rifaId);

  if(rifa){
    order.numbers.forEach(numTxt=>{
      const n = parseInt(numTxt,10);
      const obj = rifa.numbers.find(z=>z.num===n);
      if(obj && obj.status !== "sold"){
        obj.status = "free";
        obj.buyer = null;
      }
    });
  }

  data.orders = data.orders.filter(x=>x.id!==orderId);
  saveData(data);
  renderAdmin();
};

// =====================
// BOTÃO: AVISAR TODOS NO WHATSAPP
// =====================
const btnWarn = $("btnWarnWhatsapp");
if(btnWarn){
  btnWarn.onclick = () => {
    const limit = parseInt(($("fewLeftLimit")?.value || "10").trim(), 10);

    const few = getFewLeftRifas(limit);
    if(few.length === 0){
      alert("Nenhuma rifa com poucos números agora.");
      return;
    }

    // Pegar compradores (somente quem já reservou ou pagou)
    const phones = uniquePhonesFromOrders();
    if(phones.length === 0){
      alert("Não há compradores para avisar ainda.");
      return;
    }

    const rifasTxt = few.map(x => `• ${x.rifa.title} (restam ${x.freeCount})`).join("\n");

    const msg =
`🔥 ÚLTIMOS NÚMEROS DISPONÍVEIS!
🍀 Corre que tá acabando!

Rifas com poucos números:
${rifasTxt}

Garanta agora:
https://rifa-site-three.vercel.app/`;

    // Abre WhatsApp conversa por conversa
    alert(`Vai abrir o WhatsApp para ${phones.length} comprador(es).`);

    let i = 0;
    function openNext(){
      if(i >= phones.length) return;

      const phone = phones[i].replace(/\D/g,"");
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");

      i++;
      setTimeout(openNext, 900); // tempo entre abas
    }

    openNext();
  };
}

renderAdmin();
