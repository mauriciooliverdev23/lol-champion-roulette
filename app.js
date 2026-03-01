const nick1El = document.getElementById("nick1");
const nick2El = document.getElementById("nick2");
const lane1El = document.getElementById("lane1");
const lane2El = document.getElementById("lane2");
const noRepeatEl = document.getElementById("noRepeat");

const btnSpin = document.getElementById("btnSpin");
const btnAgain = document.getElementById("btnAgain");
const btnReset = document.getElementById("btnReset");

const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

const who1El = document.getElementById("who1");
const who2El = document.getElementById("who2");
const img1 = document.getElementById("img1");
const img2 = document.getElementById("img2");
const champ1El = document.getElementById("champ1");
const champ2El = document.getElementById("champ2");
const title1El = document.getElementById("title1");
const title2El = document.getElementById("title2");
const tags1El = document.getElementById("tags1");
const tags2El = document.getElementById("tags2");

let champions = []; // {id, name, title, imageFull, tags[]}
let ddragonVersion = null;

// “Não repetir” global (vale para qualquer lane)
const usedGlobal = new Set();

// Mapeamento lane -> tags (Data Dragon)
const laneTagMap = {
  any: null,
  top: new Set(["Fighter", "Tank"]),
  jungle: new Set(["Assassin", "Fighter", "Tank"]),
  mid: new Set(["Mage", "Assassin"]),
  adc: new Set(["Marksman"]),
  support: new Set(["Support"]),
};

function setStatus(msg) { statusEl.textContent = msg || ""; }
function randInt(max) { return Math.floor(Math.random() * max); }

function ddragonSquareUrl(imageFull) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${imageFull}`;
}

function updateButtons() {
  const ready = champions.length > 0;
  btnSpin.disabled = !ready;
  btnAgain.disabled = !ready;
  btnReset.disabled = !ready;
  btnSpin.textContent = ready ? "Girar 🎲" : "Carregando campeões...";
}

function validateNicks() {
  const n1 = nick1El.value.trim() || "Você";
  const n2 = nick2El.value.trim() || "Seu amigo";
  return { n1, n2 };
}

function matchesLane(champ, lane) {
  if (lane === "any") return true;
  const allowed = laneTagMap[lane];
  return champ.tags.some(t => allowed.has(t));
}

function poolForLane(lane, bannedSet) {
  return champions.filter(c => matchesLane(c, lane) && !bannedSet.has(c.id));
}

function pickOne(pool) {
  if (pool.length === 0) return null;
  return pool[randInt(pool.length)];
}

function render(n1, n2, c1, c2) {
  resultsEl.hidden = false;

  who1El.textContent = n1;
  who2El.textContent = n2;

  img1.src = ddragonSquareUrl(c1.imageFull);
  img2.src = ddragonSquareUrl(c2.imageFull);
  img1.alt = c1.name;
  img2.alt = c2.name;

  champ1El.textContent = c1.name;
  champ2El.textContent = c2.name;
  title1El.textContent = c1.title;
  title2El.textContent = c2.title;

  tags1El.textContent = (c1.tags || []).join(" • ") || "—";
  tags2El.textContent = (c2.tags || []).join(" • ") || "—";
}

function spin() {
  if (champions.length < 2) return;

  const { n1, n2 } = validateNicks();
  const lane1 = lane1El.value;
  const lane2 = lane2El.value;

  // Bans (se noRepeat estiver ligado, usa o global; se não, usa set vazio)
  const bannedBase = noRepeatEl.checked ? usedGlobal : new Set();

  // Pool do player 1
  let pool1 = poolForLane(lane1, bannedBase);

  // Se acabou a pool global (por conta do “não repetir”), reseta automaticamente
  if (noRepeatEl.checked && pool1.length === 0) {
    usedGlobal.clear();
    pool1 = poolForLane(lane1, usedGlobal);
  }

  const pick1 = pickOne(pool1);
  if (!pick1) {
    setStatus("Não achei campeão suficiente para a lane do Jogador 1.");
    return;
  }

  // Pool do player 2 (não pode repetir o do player 1 no mesmo giro)
  const banned2 = new Set(bannedBase);
  banned2.add(pick1.id);

  let pool2 = poolForLane(lane2, banned2);

  if (noRepeatEl.checked && pool2.length === 0) {
    // se a pool acabou por causa do global, reseta e tenta de novo
    usedGlobal.clear();
    const banned2AfterReset = new Set([pick1.id]);
    pool2 = poolForLane(lane2, banned2AfterReset);
  }

  const pick2 = pickOne(pool2);
  if (!pick2) {
    setStatus("Não achei campeão suficiente para a lane do Jogador 2 (sem repetir).");
    return;
  }

  // Efeito roleta
  setStatus("Girando...");
  const spinMs = 1200;
  const tickMs = 70;
  const endAt = Date.now() + spinMs;

  const interval = setInterval(() => {
    // só pra animar, vamos trocar picks temporários
    const temp1 = pickOne(pool1) || pick1;

    const tempBanned2 = new Set(banned2);
    tempBanned2.add(temp1.id);
    const tempPool2 = poolForLane(lane2, tempBanned2);
    const temp2 = pickOne(tempPool2) || pick2;

    render(n1, n2, temp1, temp2);

    if (Date.now() >= endAt) {
      clearInterval(interval);

      // Resultado final
      render(n1, n2, pick1, pick2);

      if (noRepeatEl.checked) {
        usedGlobal.add(pick1.id);
        usedGlobal.add(pick2.id);
      }

      setStatus(`Fechado! ${n1}: ${pick1.name} (${lane1.toUpperCase()}) | ${n2}: ${pick2.name} (${lane2.toUpperCase()})`);
    }
  }, tickMs);
}

btnSpin.addEventListener("click", spin);
btnAgain.addEventListener("click", spin);

btnReset.addEventListener("click", () => {
  usedGlobal.clear();
  setStatus("Histórico de 'não repetir' resetado.");
});

// Carregar Data Dragon
async function loadChampions() {
  try {
    setStatus("Buscando versão atual do LoL...");
    const versionsRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await versionsRes.json();
    ddragonVersion = versions[0];

    setStatus(`Carregando campeões (Data Dragon ${ddragonVersion})...`);
    const champsRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/pt_BR/championFull.json`
    );
    const champsJson = await champsRes.json();

    champions = Object.values(champsJson.data).map(c => ({
      id: c.id,
      name: c.name,
      title: c.title,
      imageFull: c.image.full,
      tags: c.tags || [],
    }));

    setStatus(`Pronto! ${champions.length} campeões carregados.`);
    updateButtons();
  } catch (err) {
    console.error(err);
    champions = [];
    setStatus("Erro ao carregar campeões. Verifique sua internet e recarregue.");
    updateButtons();
  }
}

loadChampions();
updateButtons();