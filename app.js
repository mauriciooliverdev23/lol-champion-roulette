const STORAGE_KEYS = {
  bans: "lol_roulette_bans_v1",
  history: "lol_roulette_history_v1",
};

const laneTagMap = {
  any: null,
  top: new Set(["Fighter", "Tank"]),
  jungle: new Set(["Assassin", "Fighter", "Tank"]),
  mid: new Set(["Mage", "Assassin"]),
  adc: new Set(["Marksman"]),
  support: new Set(["Support"]),
};

const itemSlots = ["Botas", "Principal", "Lendário", "Lendário", "Lendário", "Situacional"];

const playerCountEl = document.getElementById("playerCount");
const playersContainerEl = document.getElementById("playersContainer");
const aramModeEl = document.getElementById("aramMode");
const noRepeatEl = document.getElementById("noRepeat");

const btnSpin = document.getElementById("btnSpin");
const btnAgain = document.getElementById("btnAgain");
const btnReset = document.getElementById("btnReset");

const banInputEl = document.getElementById("banInput");
const championSuggestionsEl = document.getElementById("championSuggestions");
const btnAddBanEl = document.getElementById("btnAddBan");
const btnResetBansEl = document.getElementById("btnResetBans");
const banListEl = document.getElementById("banList");

const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const historyListEl = document.getElementById("historyList");
const btnClearHistoryEl = document.getElementById("btnClearHistory");

let ddragonVersion = "";
let champions = [];
let items = [];
let spinning = false;

const usedGlobal = new Set();
const bannedChampionIds = new Set(loadJson(STORAGE_KEYS.bans, []));
let historyEntries = loadJson(STORAGE_KEYS.history, []);

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setStatus(message) {
  statusEl.textContent = message || "";
}

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function randomFrom(pool) {
  return pool[randInt(pool.length)];
}

function ddragonSquareUrl(imageFull) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${imageFull}`;
}

function ddragonItemUrl(imageFull) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${imageFull}`;
}

function championByName(name) {
  const cleaned = (name || "").trim().toLowerCase();
  return champions.find((c) => c.name.toLowerCase() === cleaned || c.id.toLowerCase() === cleaned);
}

function buildPlayerRows() {
  const count = Number(playerCountEl.value);
  playersContainerEl.innerHTML = "";

  for (let i = 1; i <= count; i += 1) {
    const row = document.createElement("div");
    row.className = "playerRow";
    row.innerHTML = `
      <div class="playerTag">Jogador ${i}</div>
      <input class="playerNick" data-index="${i}" placeholder="Nick do jogador ${i}" autocomplete="off" />
      <select class="playerLane" data-index="${i}" ${aramModeEl.checked ? "disabled" : ""}>
        <option value="any">Any/Auto</option>
        <option value="top">Top</option>
        <option value="jungle">Jg</option>
        <option value="mid">Mid</option>
        <option value="adc">ADC</option>
        <option value="support">Sup</option>
      </select>
    `;
    playersContainerEl.appendChild(row);
  }
}

function getPlayersConfig() {
  const count = Number(playerCountEl.value);
  const nicks = [...document.querySelectorAll(".playerNick")];
  const lanes = [...document.querySelectorAll(".playerLane")];

  return Array.from({ length: count }, (_, idx) => ({
    nick: nicks[idx]?.value.trim() || `Jogador ${idx + 1}`,
    lane: aramModeEl.checked ? "any" : (lanes[idx]?.value || "any"),
  }));
}

function matchesLane(champion, lane) {
  if (lane === "any") return true;
  const allowed = laneTagMap[lane];
  return champion.tags.some((tag) => allowed.has(tag));
}

function getChampionPool(lane, blockedSet) {
  return champions.filter((c) => !blockedSet.has(c.id) && matchesLane(c, lane));
}

function assignChampions(players) {
  const picks = [];
  const blocked = new Set([...bannedChampionIds]);
  if (noRepeatEl.checked) {
    usedGlobal.forEach((id) => blocked.add(id));
  }

  for (const player of players) {
    const pool = getChampionPool(player.lane, blocked);
    if (!pool.length) return null;

    const champion = randomFrom(pool);
    blocked.add(champion.id);
    picks.push({ ...player, champion });
  }

  return picks;
}

function pickDistinct(pool, count, blocked = new Set()) {
  const candidates = pool.filter((item) => !blocked.has(item.id));
  const localBlocked = new Set(blocked);
  const selected = [];

  while (selected.length < count && candidates.length) {
    const idx = randInt(candidates.length);
    const choice = candidates[idx];
    if (!localBlocked.has(choice.id)) {
      selected.push(choice);
      localBlocked.add(choice.id);
    }
    candidates.splice(idx, 1);
  }

  return selected;
}

function isBoots(item) {
  return item.tags?.includes("Boots") || /bota|grevas|mercur|sabato/i.test(item.name);
}

function buildForMode() {
  const aram = aramModeEl.checked;
  const buyable = items.filter((it) => {
    if (!it.gold || it.gold.total <= 0 || it.gold.purchasable === false) return false;
    const mapAllowed = aram ? it.maps?.["12"] || it.maps?.["11"] : it.maps?.["11"];
    return Boolean(mapAllowed);
  });

  const bootsPool = buyable.filter(isBoots);
  const primaryPool = buyable.filter((it) => !isBoots(it) && it.gold.total >= 2800);
  const legendaryPool = buyable.filter((it) => !isBoots(it) && it.gold.total >= 2200);
  const situationalPool = buyable.filter((it) => !isBoots(it));

  return { buyable, bootsPool, primaryPool, legendaryPool, situationalPool };
}

function rollBuild() {
  const pools = buildForMode();
  const used = new Set();
  const build = [];

  const boot = pickDistinct(pools.bootsPool.length ? pools.bootsPool : pools.buyable, 1, used)[0];
  if (boot) {
    build.push({ slot: itemSlots[0], ...boot });
    used.add(boot.id);
  }

  const primary = pickDistinct(pools.primaryPool.length ? pools.primaryPool : pools.legendaryPool, 1, used)[0];
  if (primary) {
    build.push({ slot: itemSlots[1], ...primary });
    used.add(primary.id);
  }

  const legendaries = pickDistinct(pools.legendaryPool, 3, used);
  legendaries.forEach((item, idx) => {
    build.push({ slot: itemSlots[idx + 2], ...item });
    used.add(item.id);
  });

  const situational = pickDistinct(pools.situationalPool, 1, used)[0];
  if (situational) {
    build.push({ slot: itemSlots[5], ...situational });
  }

  return build;
}

function createResultCard(playerResult) {
  const card = document.createElement("div");
  card.className = "result";
  card.innerHTML = `
    <div class="who">${playerResult.nick} • ${aramModeEl.checked ? "ARAM" : playerResult.lane.toUpperCase()}</div>
    <div class="reelWindow"><div class="reelTrack"></div></div>
    <div class="champMeta">
      <div class="champName">—</div>
      <div class="champTitle">—</div>
      <div class="chip">—</div>
    </div>
    <div class="buildGrid"></div>
  `;
  return card;
}

function renderBuild(buildGridEl, build) {
  buildGridEl.innerHTML = "";
  build.forEach((item) => {
    const node = document.createElement("div");
    node.className = "itemCard";
    node.innerHTML = `<img src="${ddragonItemUrl(item.imageFull)}" alt="${item.name}" /><div>${item.slot}: ${item.name}</div>`;
    buildGridEl.appendChild(node);
  });
}

function animateReel(cardEl, finalChampion) {
  const track = cardEl.querySelector(".reelTrack");
  const itemHeight = 74;
  const steps = 18 + randInt(4);

  const sequence = Array.from({ length: steps }, (_, index) => {
    if (index === steps - 1) return finalChampion;
    return champions[randInt(champions.length)];
  });

  track.innerHTML = "";
  sequence.forEach((champ) => {
    const item = document.createElement("div");
    item.className = "reelItem";
    item.innerHTML = `<img src="${ddragonSquareUrl(champ.imageFull)}" alt="${champ.name}" /><div>${champ.name}</div>`;
    track.appendChild(item);
  });

  track.style.transition = "none";
  track.style.transform = "translateY(0px)";

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.transition = "transform 2200ms cubic-bezier(0.08, 0.75, 0.14, 1)";
        track.style.transform = `translateY(-${(steps - 1) * itemHeight}px)`;
      });
    });

    track.addEventListener(
      "transitionend",
      () => {
        const nameEl = cardEl.querySelector(".champName");
        const titleEl = cardEl.querySelector(".champTitle");
        const tagsEl = cardEl.querySelector(".chip");
        nameEl.textContent = finalChampion.name;
        titleEl.textContent = finalChampion.title;
        tagsEl.textContent = finalChampion.tags.join(" • ") || "—";
        resolve();
      },
      { once: true }
    );
  });
}

function renderBans() {
  const bans = champions.filter((c) => bannedChampionIds.has(c.id));
  banListEl.innerHTML = "";

  if (!bans.length) {
    banListEl.innerHTML = '<span class="chip">Sem bans ativos</span>';
    return;
  }

  bans
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .forEach((champ) => {
      const chip = document.createElement("span");
      chip.className = "banChip";
      chip.innerHTML = `${champ.name} <button class="chipBtn" data-remove-ban="${champ.id}">x</button>`;
      banListEl.appendChild(chip);
    });
}

function renderHistory() {
  historyListEl.innerHTML = "";
  if (!historyEntries.length) {
    historyListEl.innerHTML = '<div class="historyEntry">Nenhuma rolagem ainda.</div>';
    return;
  }

  historyEntries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "historyEntry";
    const playersText = entry.players
      .map((p) => `${p.nick} (${p.lane.toUpperCase()}): ${p.champion}`)
      .join(" | ");
    const bansText = entry.bans.length ? entry.bans.join(", ") : "Nenhum";

    row.innerHTML = `
      <div><strong>${new Date(entry.at).toLocaleString("pt-BR")}</strong> • ${entry.mode}</div>
      <div>${playersText}</div>
      <div>Bans: ${bansText}</div>
    `;
    historyListEl.appendChild(row);
  });
}

function updateButtons() {
  const ready = champions.length > 0 && items.length > 0;
  btnSpin.disabled = !ready || spinning;
  btnAgain.disabled = !ready || spinning;
  btnReset.disabled = !ready || spinning;
  btnAddBanEl.disabled = !ready || spinning;
  btnSpin.textContent = ready ? "Girar 🎲" : "Carregando dados...";
}

async function spin() {
  if (spinning) return;

  const players = getPlayersConfig();
  if (!players.length) return;

  spinning = true;
  updateButtons();
  setStatus("Girando roleta...");

  let picks = assignChampions(players);
  if (!picks && noRepeatEl.checked) {
    usedGlobal.clear();
    picks = assignChampions(players);
  }

  if (!picks) {
    spinning = false;
    updateButtons();
    setStatus("Pool insuficiente para o sorteio atual. Remova bans ou ajuste lanes.");
    return;
  }

  picks = picks.map((p) => ({ ...p, build: rollBuild() }));

  resultsEl.hidden = false;
  resultsEl.innerHTML = "";

  const cards = picks.map((result) => {
    const card = createResultCard(result);
    resultsEl.appendChild(card);
    renderBuild(card.querySelector(".buildGrid"), result.build);
    return { card, result };
  });

  await Promise.all(cards.map(({ card, result }) => animateReel(card, result.champion)));

  if (noRepeatEl.checked) {
    picks.forEach((p) => usedGlobal.add(p.champion.id));
  }

  const entry = {
    at: new Date().toISOString(),
    mode: aramModeEl.checked ? "ARAM" : "Normal",
    bans: champions.filter((c) => bannedChampionIds.has(c.id)).map((c) => c.name),
    players: picks.map((p) => ({
      nick: p.nick,
      lane: p.lane,
      champion: p.champion.name,
      build: p.build.map((it) => ({ slot: it.slot, item: it.name })),
    })),
  };

  historyEntries.unshift(entry);
  historyEntries = historyEntries.slice(0, 20);
  saveJson(STORAGE_KEYS.history, historyEntries);
  renderHistory();

  spinning = false;
  updateButtons();
  setStatus(`Fechado! ${picks.map((p) => `${p.nick}: ${p.champion.name}`).join(" | ")}`);
}

function setupBanActions() {
  btnAddBanEl.addEventListener("click", () => {
    const champ = championByName(banInputEl.value);
    if (!champ) {
      setStatus("Campeão não encontrado para ban. Selecione um nome válido.");
      return;
    }

    bannedChampionIds.add(champ.id);
    saveJson(STORAGE_KEYS.bans, [...bannedChampionIds]);
    banInputEl.value = "";
    renderBans();
    setStatus(`${champ.name} adicionado aos bans.`);
  });

  banListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-ban]");
    if (!button) return;
    bannedChampionIds.delete(button.getAttribute("data-remove-ban"));
    saveJson(STORAGE_KEYS.bans, [...bannedChampionIds]);
    renderBans();
  });

  btnResetBansEl.addEventListener("click", () => {
    bannedChampionIds.clear();
    saveJson(STORAGE_KEYS.bans, []);
    renderBans();
    setStatus("Bans resetados.");
  });
}

function setupHistoryActions() {
  btnClearHistoryEl.addEventListener("click", () => {
    historyEntries = [];
    saveJson(STORAGE_KEYS.history, historyEntries);
    renderHistory();
    setStatus("Histórico limpo.");
  });
}

async function loadDataDragon() {
  try {
    setStatus("Buscando versão atual do LoL...");
    const versionsRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await versionsRes.json();
    ddragonVersion = versions[0];

    setStatus(`Carregando campeões e itens (${ddragonVersion})...`);
    const [champRes, itemRes] = await Promise.all([
      fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/pt_BR/championFull.json`),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/pt_BR/item.json`),
    ]);

    const champJson = await champRes.json();
    const itemJson = await itemRes.json();

    champions = Object.values(champJson.data).map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      imageFull: c.image.full,
      tags: c.tags || [],
    }));

    items = Object.entries(itemJson.data).map(([id, item]) => ({
      id,
      name: item.name,
      imageFull: item.image.full,
      gold: item.gold,
      maps: item.maps,
      tags: item.tags || [],
    }));

    championSuggestionsEl.innerHTML = champions.map((c) => `<option value="${c.name}"></option>`).join("");

    renderBans();
    setStatus(`Pronto! ${champions.length} campeões e ${items.length} itens carregados.`);
  } catch (error) {
    console.error(error);
    champions = [];
    items = [];
    setStatus("Erro ao carregar Data Dragon. Verifique internet e recarregue.");
  } finally {
    updateButtons();
  }
}

playerCountEl.addEventListener("change", buildPlayerRows);
aramModeEl.addEventListener("change", () => {
  buildPlayerRows();
  setStatus(aramModeEl.checked ? "Modo ARAM ativo: lanes ignoradas." : "Modo normal ativo.");
});

btnSpin.addEventListener("click", spin);
btnAgain.addEventListener("click", spin);
btnReset.addEventListener("click", () => {
  usedGlobal.clear();
  setStatus("Histórico de não repetição global resetado.");
});

buildPlayerRows();
renderHistory();
setupBanActions();
setupHistoryActions();
updateButtons();
loadDataDragon();
