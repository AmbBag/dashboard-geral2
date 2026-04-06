// =======================
// FIREBASE
// =======================
const firebaseConfig = {
  databaseURL: "https://qrcodegw-b14df-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);

// =======================
// METAS
// =======================
const META_HORA = 51;
const META_DIA = 450;
const TOTAL_HORAS_DIA = 9;
const META_TOTAL_DIA = 1800; // <<< ADICIONADO

const MAPA_HORAS = [7,8,9,10,11,13,14,15,16];

// =======================
// UTIL
// =======================
function cor(v, m) {
  return v >= m ? "verde" : "vermelho";
}

function corHora(v, m) {
  if (v >= m) return "verde";
  if (v >= m * 0.8) return "amarelo";
  return "vermelho";
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function formatarData(d) {
  const [a,m,dd] = d.split("-");
  return `${dd}-${m}-${a}`;
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function normalizarPlanejado(valor) {
  if (valor === "-" || valor === undefined || valor === null || valor === "") return null;
  const numero = Number(String(valor).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

const OPS_LINHAS_POR_PAGINA = 4;
const OPS_TROCA_MS = 4000;
const opsEstado = {
  dados: [],
  paginaAtual: 0,
  expandido: false,
  timer: null
};

function atualizarEstadoTelaCheia() {
  const emTelaCheia = document.fullscreenElement === document.documentElement;
  document.body.classList.toggle("tv-fullscreen", emTelaCheia);

  const botao = document.getElementById("fullscreenToggle");
  if (botao) {
    botao.textContent = emTelaCheia ? "Sair da tela cheia" : "Tela cheia";
  }
}

function configurarTelaCheia() {
  const botao = document.getElementById("fullscreenToggle");
  if (!botao) return;

  botao.addEventListener("click", async (event) => {
    event.stopPropagation();

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (erro) {
      console.error("Nao foi possivel alternar tela cheia.", erro);
    }
  });

  document.addEventListener("fullscreenchange", atualizarEstadoTelaCheia);
  atualizarEstadoTelaCheia();
}

function atualizarStatusOps() {
  const hint = document.querySelector("[data-ops-hint]");
  const status = document.querySelector("[data-ops-status]");
  const totalPaginas = Math.max(1, Math.ceil(opsEstado.dados.length / OPS_LINHAS_POR_PAGINA));

  if (hint) {
    hint.textContent = opsEstado.expandido
      ? "Clique para voltar ao modo TV."
      : "Clique para ver a tabela completa.";
  }

  if (status) {
    status.textContent = opsEstado.expandido
      ? `Tabela completa (${opsEstado.dados.length} ops)`
      : `Pagina ${Math.min(opsEstado.paginaAtual + 1, totalPaginas)}/${totalPaginas} · 4 por vez`;
  }
}

function renderizarOpsTabela() {
  const tbodyOps = document.querySelector("#ops tbody");
  if (!tbodyOps) return;

  tbodyOps.innerHTML = "";

  const dadosVisiveis = opsEstado.expandido
    ? opsEstado.dados
    : opsEstado.dados.slice(
        opsEstado.paginaAtual * OPS_LINHAS_POR_PAGINA,
        opsEstado.paginaAtual * OPS_LINHAS_POR_PAGINA + OPS_LINHAS_POR_PAGINA
      );

  dadosVisiveis.forEach((item) => {
    const classePlanejado = item.planejadoNumero !== null && item.total >= item.planejadoNumero
      ? "verde"
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codCliente}</td>
      <td>${item.op}</td>
      <td class="${classePlanejado}">${item.qtdPlanejada === "-" ? "-" : formatarNumero(item.qtdPlanejada)}</td>
      <td>${formatarNumero(item.total)}</td>
    `;
    tbodyOps.appendChild(tr);
  });

  if (!opsEstado.expandido) {
    const faltantes = Math.max(0, OPS_LINHAS_POR_PAGINA - dadosVisiveis.length);
    for (let i = 0; i < faltantes; i++) {
      const tr = document.createElement("tr");
      tr.className = "ops-placeholder";
      tr.innerHTML = `
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      `;
      tbodyOps.appendChild(tr);
    }
  }

  atualizarStatusOps();
}

function iniciarRotacaoOps() {
  if (opsEstado.timer) clearInterval(opsEstado.timer);

  if (opsEstado.dados.length <= OPS_LINHAS_POR_PAGINA) return;

  opsEstado.timer = setInterval(() => {
    if (opsEstado.expandido) return;

    const totalPaginas = Math.ceil(opsEstado.dados.length / OPS_LINHAS_POR_PAGINA);
    opsEstado.paginaAtual = (opsEstado.paginaAtual + 1) % totalPaginas;
    renderizarOpsTabela();
  }, OPS_TROCA_MS);
}

function configurarPainelOps() {
  const painelOps = document.querySelector(".ops-panel");
  if (!painelOps || painelOps.dataset.ready === "true") return;

  painelOps.dataset.ready = "true";
  painelOps.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, label")) return;

    opsEstado.expandido = !opsEstado.expandido;
    painelOps.classList.toggle("is-expanded", opsEstado.expandido);
    renderizarOpsTabela();
  });
}

// =======================
// IDENTIFICA HORA
// =======================
function identificarHora(txt) {
  const m = txt.match(/"(\d{2}):(\d{2})/);
  if (!m) return -1;

  const h = Number(m[1]);
  const min = Number(m[2]);

  if (h === 7) return 0;
  if (h === 8) return 1;
  if (h === 9) return 2;
  if (h === 10) return 3;
  if (h === 11 || h === 12) return 4;
  if (h === 13) return 5;
  if (h === 14) return 6;
  if (h === 15) return 7;
  if (h === 16 && min <= 47) return 8;

  return -1;
}

// =======================
// IDENTIFICA HORA EXTRA
// =======================
function identificarHoraExtra(txt) {
  const m = txt.match(/"(\d{2}):(\d{2})/);
  if (!m) return false;

  const h = Number(m[1]);
  const min = Number(m[2]);

  if (h < 7) return true;
  return h > 16 || (h === 16 && min >= 48);
}

// =======================
// META DINÂMICA
// =======================
function metaHoraDinamica(indice) {
  const agora = new Date();
  const hAtual = agora.getHours();
  const mAtual = agora.getMinutes();
  const hTabela = MAPA_HORAS[indice];

  if (hTabela < hAtual) return META_HORA;
  if (hTabela > hAtual) return 0;

  return Math.round((META_HORA / 60) * mAtual);
}

function metaDiaDinamica() {
  const agora = new Date();
  const hAtual = agora.getHours();
  const mAtual = agora.getMinutes();

  let meta = 0;
  MAPA_HORAS.forEach(h => {
    if (h < hAtual) meta += META_HORA;
    else if (h === hAtual)
      meta += Math.round((META_HORA / 60) * mAtual);
  });

  return meta;
}

// =======================
// TABELA
// =======================
const tbody = document.getElementById("tbody");
const linhas = {};
const totalLinha = document.getElementById("total-geral");

function criarTabela() {
  tbody.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const nome = `CEL. ${String(i).padStart(2,"0")}`;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${nome}</td>
      ${'<td>0</td>'.repeat(9)}
      <td class="extra">0</td>
      <td>0</td>
      <td>0</td>
      <td>0%</td>
      <td>0</td>
    `;

    tbody.appendChild(tr);
    linhas[nome] = tr;
  }
}

// =======================
// BUSCAR PRINCIPAL
// =======================
function buscar() {
  const dataInput = document.getElementById("data").value;
  if (!dataInput) return;

  const hoje = hojeISO();
  const data = formatarData(dataInput);

  let totalHoras = Array(9).fill(0);
  let totalExtra = 0;
  let totalGeral = 0;
  let totalTendencia = 0;

  for (let i = 1; i <= 5; i++) {

    const celula = `Gw${String(i).padStart(2,"0")}`;
    const nome = `CEL. ${String(i).padStart(2,"0")}`;
    const tr = linhas[nome];

    firebase.database()
      .ref(`usuarios/${celula}/historico/${data}`)
      .once("value")
      .then(snap => {

        const horas = Array(9).fill(0);
        let extra = 0;

        Object.values(snap.val() || {}).forEach(item => {
          const txt = JSON.stringify(item);
          const h = identificarHora(txt);
          if (h >= 0) horas[h]++;
          if (identificarHoraExtra(txt)) extra++;
        });

        const totalNormal = horas.reduce((a,b)=>a+b,0);
        const total = totalNormal + extra; // 👈 EXTRA ENTRA NO TOTAL

        let metaBase;
        if (dataInput !== hoje) metaBase = META_DIA;
        else {
          const agora = new Date();
          metaBase =
            (agora.getHours() > 16 || (agora.getHours() === 16 && agora.getMinutes() >= 48))
              ? META_DIA
              : metaDiaDinamica();
        }

        let tendencia = metaBase > 0
          ? Math.round((totalNormal / metaBase) * META_DIA)
          : 0;

        const capacidade = Math.round((tendencia / META_DIA) * 100);
        const desvio = tendencia - META_DIA;

        const tds = tr.children;

        horas.forEach((v, idx) => {
          const metaH = dataInput === hoje ? metaHoraDinamica(idx) : META_HORA;
          tds[idx+1].textContent = v;
          tds[idx+1].className = corHora(v, metaH);
          totalHoras[idx] += v;
        });

        tds[10].textContent = extra;
        tds[11].textContent = total;
        tds[12].textContent = tendencia;
        tds[12].className = cor(tendencia, META_DIA);
        tds[13].textContent = capacidade + "%";
        tds[13].className = capacidade >= 100 ? "verde" : "vermelho";
        tds[14].textContent = desvio;
        tds[14].className = desvio >= 0 ? "verde" : "vermelho";

        totalExtra += extra;
        totalGeral += total; // 👈 EXTRA SOMA NO TOTAL GERAL
        totalTendencia += tendencia;

        // <<< ADICIONADO: CAPACIDADE E DESVIO DO TOTAL (META 4140) >>>
// <<< CAPACIDADE E DESVIO BASEADO NO TOTAL GERAL >>>
const capacidadeTotal = META_TOTAL_DIA > 0
  ? Math.round((totalTendencia / META_TOTAL_DIA) * 100)
  : 0;

const desvioTotal = totalTendencia - META_TOTAL_DIA;


        // TOTAL FINAL
        totalLinha.innerHTML = `
          <td><b>TOTAL</b></td>
          ${totalHoras.map(v => `<td>${v}</td>`).join("")}
          <td class="extra">${totalExtra}</td>
          <td>${totalGeral}</td>
          <td class="preto">${totalTendencia}</td>
          <td class="${capacidadeTotal >= 100 ? "verde" : "vermelho"}">${capacidadeTotal}%</td>
          <td class="${desvioTotal >= 0 ? "verde" : "vermelho"}">${desvioTotal}</td>
        `;
      });
  }
}
const SHEET_ID = "1Vn9PtS6VIG7N9edoBpWRYr9LsWqn1lXuQkxibYY7xiE";
const SHEET_API_KEY = "AIzaSyBg75NHA-Vi2F-CY9L-Kr4CMBzhWuUJayg";
const SHEET_RANGE = "A:C";

function buscarOpsDia() {
  const dataInput = document.getElementById("data").value;
  if (!dataInput) return;

  const data = formatarData(dataInput);

  const ops = {};
  const promessas = [];

  for (let i = 1; i <= 10; i++) {
    const celula = `Gw${String(i).padStart(2,"0")}`;

    promessas.push(
      firebase.database()
        .ref(`usuarios/${celula}/historico/${data}`)
        .once("value")
        .then(snap => {
          const dados = snap.val() || {};

          Object.entries(dados).forEach(([key, value]) => {

            if (!key.toLowerCase().includes("atualizada")) {
              const op = key.split("-")[0];
              ops[op] = (ops[op] || 0) + 1;
            } else {
              try {
                const arr = JSON.parse(value);
                if (Array.isArray(arr) && arr.length > 0) {
                  const op = arr[0].split("-")[0];
                  ops[op] = (ops[op] || 0) + 1;
                }
              } catch {}
            }

          });
        })
    );
  }

  Promise.all(promessas).then(() => {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${SHEET_API_KEY}`)
      .then(r => r.json())
      .then(sheet => {
        const linhas = sheet.values || [];
        opsEstado.dados = Object.entries(ops)
          .map(([op, total]) => {
            const linha = linhas.find(x => x[0] == op) || [];
            const codCliente = linha[1] || "-";
            const qtdPlanejada = linha[2] || "-";
            const planejadoNumero = normalizarPlanejado(qtdPlanejada);

            return {
              op,
              total,
              codCliente,
              qtdPlanejada,
              planejadoNumero
            };
          })
          .sort((a, b) => b.total - a.total || a.op.localeCompare(b.op));
        opsEstado.paginaAtual = 0;
        renderizarOpsTabela();
        iniciarRotacaoOps();
      });
  });
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const dataInput = document.getElementById("data");
  dataInput.value = hojeISO();

  configurarTelaCheia();
  configurarPainelOps();
  criarTabela();
  buscar();
  buscarOpsDia();

  // >>> ÚNICA ADIÇÃO <<< 
  dataInput.addEventListener("change", () => {
    buscar();
    buscarOpsDia();
  });

  setInterval(() => {
    buscar();
    buscarOpsDia();
  }, 90000);
});
