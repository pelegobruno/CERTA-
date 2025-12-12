// ==============================
//        CONFIGURAÇÕES
// ==============================

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAp6QKQ_6VwSGvXEIFq9e-ilQWg6M1nX7COeP7c_cUALp2DoNmmGZ99Y2TCimiCNDoXa-3DCDP6J_B/pub?output=csv";

const LOGO_ESQUERDA_URL =
  "https://drive.google.com/thumbnail?id=1DCwjOxTkDmDM8sSnp1iI8PaIBhIZdK0s&sz=w1000";

const LOGO_DIREITA_URL =
  "https://drive.google.com/thumbnail?id=1z1gAJjd0xOzEG-1HzO-3IYcj19DwByj-&sz=w1000";

// Agora usando AUTO-DETECÇÃO dos índices corretos no cabeçalho
let IDX_RESPONSAVEL = null;
let IDX_NOME = null;
let IDX_CNS = null;

const HEADER_RESP = "NOME COMPLETO DO RESPONSÁVEL";
const HEADER_NOME = "NOME";
const HEADER_CNS = "CNS";

let pacientes = [];

// ==============================
//      TEMPLATE ORIGINAL
// ==============================

const TEMPLATE_TERMO = `
<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; margin-top:40px;">
  <img src="{{LOGO_ESQ}}" style="height:60px; max-width:30%; object-fit:contain;" />
  <div style="text-align:center; font-size:10px; line-height:1.2; opacity:0.75;">
      CENTRO DE REFERÊNCIA DO TRANSTORNO AUTISTA - CERTA<br/>
      Prefeitura Municipal de Porto Alegre<br/>
      Associação Hospitalar Vila Nova
  </div>
  <img src="{{LOGO_DIR}}" style="height:60px; max-width:30%; object-fit:contain;" />
</div>

<h2 style="text-align:center; margin-bottom:20px;">{{TITULO_TERMO}}</h2>

<p style="text-align: justify;">
Eu, <strong>{{NOME_RESPONSAVEL}}</strong>, responsável legal pelo paciente
<strong>{{NOME_FILHO}}</strong>, inscrito no CNS <strong>{{CNS}}</strong>, declaro que,
em virtude {{MOTIVO}}, solicito o afastamento do paciente das atividades terapêuticas do CERTA
no período de <strong>{{PERIODO}}</strong>, conforme orientação do Serviço Social.
</p>

<p style="text-align: justify;">{{PARAGRAFO_TIPO}}</p>

<p style="margin-top: 35px;">Porto Alegre, {{DATA_HOJE_EXTENSO}}.</p>

<br /><br />

<div style="text-align:center;">
____________________________________<br/>
<strong>{{NOME_RESPONSAVEL}}</strong><br/>
(Responsável legal por {{NOME_FILHO}})
</div>
`;


// ==============================
// PARSE CSV PROFISSIONAL (NOVO)
// ==============================

function detectarSeparador(linha) {
  if (linha.includes(";")) return ";";
  return ",";
}

function parseLinhaCSV(linha, sep) {
  const resultado = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    const prox = linha[i + 1];

    if (char === '"' && dentroAspas && prox === '"') {
      atual += '"';
      i++;
    } else if (char === '"') {
      dentroAspas = !dentroAspas;
    } else if (char === sep && !dentroAspas) {
      resultado.push(atual.trim());
      atual = "";
    } else {
      atual += char;
    }
  }

  resultado.push(atual.trim());
  return resultado;
}

function parseCSV(csv) {
  const linhas = csv.trim().split("\n");
  const sep = detectarSeparador(linhas[0]);

  const cabecalho = parseLinhaCSV(linhas[0], sep);

  // AUTO-DETEÇÃO dos índices corretos
  IDX_RESPONSAVEL = cabecalho.findIndex(c => c.toUpperCase() === HEADER_RESP.toUpperCase());
  IDX_NOME = cabecalho.findIndex(c => c.toUpperCase() === HEADER_NOME.toUpperCase());
  IDX_CNS = cabecalho.findIndex(c => c.toUpperCase() === HEADER_CNS.toUpperCase());

  console.log("Índices detectados:", { IDX_RESPONSAVEL, IDX_NOME, IDX_CNS });

  return linhas.slice(1).map(l => {
    const col = parseLinhaCSV(l, sep);
    return {
      responsavel: col[IDX_RESPONSAVEL] || "",
      nome: col[IDX_NOME] || "",
      cns: col[IDX_CNS] || ""
    };
  });
}


// ==============================
//     FUNÇÕES AUXILIARES
// ==============================

function formatarDiaMes(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function dataHojeExtenso() {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}


// ==============================
//     CARREGAR PACIENTES
// ==============================

async function carregarPacientes() {
  const resp = await fetch(CSV_URL, { cache: "no-store" });
  const csv = await resp.text();
  pacientes = parseCSV(csv);
}


// ==============================
//      BUSCA DO PACIENTE
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  const busca = document.getElementById("pacienteBusca");
  const lista = document.getElementById("listaPacientes");
  const idxInput = document.getElementById("pacienteIndex");

  carregarPacientes().then(() => {

    busca.addEventListener("input", () => {
      const termo = busca.value.toLowerCase();
      lista.innerHTML = "";

      if (!termo) {
        lista.style.display = "none";
        idxInput.value = "";
        return;
      }

      const filtrados = pacientes.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        p.responsavel.toLowerCase().includes(termo)
      );

      if (filtrados.length === 0) {
        lista.style.display = "none";
        return;
      }

      filtrados.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = `${p.nome} – ${p.responsavel}`;
        li.onclick = () => {
          busca.value = li.textContent;
          idxInput.value = pacientes.indexOf(p);
          lista.style.display = "none";
        };
        lista.appendChild(li);
      });

      lista.style.display = "block";
    });
  });

  document.getElementById("btnAtualizar").onclick = gerarTermo;
  document.getElementById("btnImprimir").onclick = imprimirTermo;
});


// ==============================
//       GERAR TERMO
// ==============================

function gerarTermo() {
  const idx = document.getElementById("pacienteIndex").value;
  const preview = document.getElementById("previewTermo");

  if (!idx) {
    preview.innerHTML = "<em>Selecione um paciente.</em>";
    return;
  }

  const p = pacientes[idx];
  const tipo = document.getElementById("tipoTermo").value;
  const saida = document.getElementById("dataSaida").value;
  const retorno = document.getElementById("dataRetorno").value;
  const motivo = document.getElementById("motivo").value.trim();

  if (!saida || !retorno) {
    preview.innerHTML = "<em>Informe as datas.</em>";
    return;
  }

  const periodo = `${formatarDiaMes(saida)} a ${formatarDiaMes(retorno)}`;

  const paragrafo =
    tipo === "RECESSO"
      ? "Tratando-se de recesso, o período informado corresponde ao intervalo compreendido entre o Natal e Ano Novo."
      : "Tratando-se de férias, o período informado refere-se a afastamento regular de até 30 dias, fora do recesso.";

  let texto = TEMPLATE_TERMO
    .replaceAll("{{LOGO_ESQ}}", LOGO_ESQUERDA_URL)
    .replaceAll("{{LOGO_DIR}}", LOGO_DIREITA_URL)
    .replaceAll("{{TITULO_TERMO}}", `TERMO DE ${tipo}`)
    .replaceAll("{{NOME_RESPONSAVEL}}", p.responsavel)
    .replaceAll("{{NOME_FILHO}}", p.nome)
    .replaceAll("{{CNS}}", p.cns)
    .replaceAll("{{MOTIVO}}", motivo || "do motivo informado")
    .replaceAll("{{PERIODO}}", periodo)
    .replaceAll("{{PARAGRAFO_TIPO}}", paragrafo)
    .replaceAll("{{DATA_HOJE_EXTENSO}}", dataHojeExtenso());

  preview.innerHTML = texto;
}


// ==============================
//          IMPRESSÃO
// ==============================

function imprimirTermo() {
  const conteudo = document.getElementById("previewTermo").innerHTML;
  if (!conteudo) return;

  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Termo</title>
        <style>
          body { font-family: Arial, sans-serif; margin:60px; line-height:1.5; }
          p { text-align: justify; font-size:14px; }
          h2 { text-align:center; }
        </style>
      </head>
      <body>${conteudo}</body>
    </html>
  `);
  w.document.close();

  w.onload = () => w.print();
}
