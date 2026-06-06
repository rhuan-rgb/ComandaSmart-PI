const STATIC_SESSION_KEY = "ComandaSmartStaticState";
const STATIC_PEDIDOS_VERSION = "pedidos-v2";

function getStaticState() {
    try {
        const state = JSON.parse(localStorage.getItem(STATIC_SESSION_KEY) || "{}");
        if (state.__pedidosVersion !== STATIC_PEDIDOS_VERSION) {
            delete state.pedidos;
            state.__pedidosVersion = STATIC_PEDIDOS_VERSION;
            localStorage.setItem(STATIC_SESSION_KEY, JSON.stringify(state));
        }
        return state;
    } catch (error) {
        return {};
    }
}

function setStaticState(key, value) {
    const state = getStaticState();
    state[key] = value;
    localStorage.setItem(STATIC_SESSION_KEY, JSON.stringify(state));
}

function getBancoPath(key) {
    const fromPagesFolder = window.location.pathname.includes("/pages/");
    return `${fromPagesFolder ? "../" : ""}banco/${key}.json`;
}

function getPagePath(page) {
    const fromPagesFolder = window.location.pathname.includes("/pages/");
    if (page === "index.html") return fromPagesFolder ? "../index.html" : "index.html";
    return fromPagesFolder ? page : `pages/${page}`;
}

function getEmptyValue(key) {
    return key === "configuracoes" || key === "statusTurno" ? {} : [];
}

async function getDB(key) {
    try {
        const response = await fetch(getBancoPath(key));
        if (!response.ok) throw new Error(`Arquivo nao encontrado: ${key}`);
        const data = await response.json();
        const state = getStaticState();
        return state[key] !== undefined ? state[key] : data;
    } catch (error) {
        console.warn(`Modo estatico: nao foi possivel carregar banco/${key}.json`, error);
        const state = getStaticState();
        return state[key] !== undefined ? state[key] : getEmptyValue(key);
    }
}

async function saveDB(key, data) {
    setStaticState(key, data);
    console.info("Modo estatico: alteracoes salvas no navegador.");
    return { status: "static" };
}

async function getConfig() {
    const cfg = await getDB("configuracoes");
    return {
        senha: cfg.senha || "1234",
        nome: cfg.nome || "ComandaSmart System",
        modoCozinha: cfg.modoCozinha || "geral",
        impressoraDesabilitada: true
    };
}

function avisoEstatico() {
    alert("Esta funcionalidade ainda nao esta disponivel nesta versao local.");
}

function exibirModalSenha(titulo) {
    return new Promise((resolve) => {
        const div = document.createElement("div");
        div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;";
        div.innerHTML = `
            <div style="background:#161616;padding:30px;border-radius:15px;border:1px solid #ff6600;width:350px;text-align:center;">
                <h3 style="color:#ff6600;margin-bottom:20px;font-family:sans-serif;">${titulo}</h3>
                <input type="password" id="passInput" placeholder="PIN" style="width:100%;padding:15px;background:#000;color:#fff;border:1px solid #333;border-radius:10px;text-align:center;font-size:1.5rem;margin-bottom:20px;outline:none;">
                <div style="display:flex;gap:10px;">
                    <button id="passCancel" class="btn" style="background:#444;">CANCELAR</button>
                    <button id="passConfirm" class="btn btn-submit">ENTRAR</button>
                </div>
            </div>`;
        document.body.appendChild(div);
        const input = document.getElementById("passInput");
        input.focus();
        document.getElementById("passConfirm").onclick = () => {
            const value = input.value;
            document.body.removeChild(div);
            resolve(value);
        };
        document.getElementById("passCancel").onclick = () => {
            document.body.removeChild(div);
            resolve(null);
        };
        input.onkeydown = (event) => {
            if (event.key === "Enter") document.getElementById("passConfirm").click();
        };
    });
}

async function checarTurno() {
    const status = await getDB("statusTurno");
    const aberto = status && status.aberto === true;
    const config = await getConfig();
    const menu = document.getElementById("menuLateral");
    const path = window.location.pathname;

    if (path.includes("admin.html")) {
        const senha = await exibirModalSenha("ACESSO ADMIN");
        if (!senha || senha.trim() !== config.senha.toString().trim()) {
            window.location.href = getPagePath("index.html");
            return;
        }
    }

    if (menu) {
        let html = `<a href="${getPagePath("index.html")}" class="${path.includes("index.html") ? "active" : ""}">Painel</a>`;

        if (aberto) {
            html += `<a href="${getPagePath("preparar.html")}" class="${path.includes("preparar.html") ? "active" : ""}">Monitor</a>`;
            html += `<a href="${getPagePath("kitchen.html")}" class="${path.includes("kitchen.html") ? "active" : ""}">TV Cozinha</a>`;
            html += `
                <a href="${getPagePath("cadastro.html")}" class="${path.includes("cadastro.html") ? "active" : ""}">Pedido</a>
                <a href="${getPagePath("pagamentos.html")}" class="${path.includes("pagamentos.html") ? "active" : ""}">Caixa</a>
                <a href="${getPagePath("historico.html")}" class="${path.includes("historico.html") ? "active" : ""}">Historico</a>
                <a href="${getPagePath("disponibilidade.html")}" class="${path.includes("disponibilidade.html") ? "active" : ""}">Disponibilidade</a>`;
        }

        html += `<a href="${getPagePath("ajuda.html")}" class="${path.includes("ajuda.html") ? "active" : ""}">Ajuda</a>`;
        html += `<div class="nav-spacer"></div>`;
        html += `<a href="${getPagePath("admin.html")}" class="${path.includes("admin.html") ? "active" : ""}">Configuracao</a>`;
        menu.innerHTML = html;
    }

    const tituloHome = document.querySelector(".welcome-text h1");
    if (tituloHome && (path.includes("index.html") || path.endsWith("/"))) {
        tituloHome.innerText = config.nome;
    }

    if (path.includes("index.html") || path.endsWith("/")) {
        renderizarInterfacePainel(aberto);
    }
}

async function renderizarInterfacePainel(aberto) {
    const area = document.getElementById("areaTurno");
    if (!area) return;
    document.getElementById("txtStatusTurno").innerText = aberto ? "Turno estatico aberto" : "Turno fechado";
    area.innerHTML = `<button class="btn ${aberto ? "btn-red" : "btn-submit"}" onclick="gerenciarTurno('${aberto ? "fechar" : "abrir"}')">${aberto ? "FINALIZAR TURNO" : "INICIAR TURNO"}</button>`;
    const analytics = document.getElementById("areaAnalytics");
    if (analytics) analytics.style.display = aberto ? "block" : "none";
    if (aberto) carregarAnalytics();
    renderizarListaTurnos();
}

async function prepararCadastro() {
    const select = document.getElementById("selectProduto");
    if (!select) return;
    const catalogo = await getDB("catalogo");
    const disponiveis = catalogo.filter((produto) => !produto.indisponivel);
    select.innerHTML = '<option value="">Selecione um produto...</option>' +
        disponiveis.map((produto) => `<option value="${produto.nome}">${produto.nome}</option>`).join("");

    select.onchange = () => {
        const produto = catalogo.find((item) => item.nome === select.value);
        const info = document.getElementById("infoPrecoItem");
        if (info) info.innerText = produto ? `R$ ${parseFloat(produto.preco).toFixed(2)}` : "R$ 0,00";
    };

    const form = document.getElementById("formPedido");
    if (form) form.onsubmit = finalizarPedidoEstatico;
}

let itensNoPedidoAtual = [];
let totalGeralPedido = 0;

function atualizarListaTemporaria() {
    const lista = document.getElementById("listaTemporaria");
    if (!lista) return;

    if (itensNoPedidoAtual.length === 0) {
        lista.innerHTML = '<p style="color:#444; text-align:center;">Nenhum item adicionado.</p>';
    } else {
        lista.innerHTML = itensNoPedidoAtual.map((item, index) => `
            <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #222;">
                <span>${item.texto}</span>
                <span>R$ ${item.valor.toFixed(2)} <b onclick="removerItemTemp(${index})" style="color:red; cursor:pointer; margin-left:10px;">[x]</b></span>
            </div>`).join("");
    }

    const total = document.getElementById("totalComanda");
    if (total) total.innerText = `R$ ${totalGeralPedido.toFixed(2)}`;
}

function removerItemTemp(index) {
    totalGeralPedido -= itensNoPedidoAtual[index].valor;
    itensNoPedidoAtual.splice(index, 1);
    atualizarListaTemporaria();
}

async function finalizarPedidoEstatico(event) {
    event.preventDefault();
    if (itensNoPedidoAtual.length === 0) {
        alert("Adicione itens ao pedido!");
        return;
    }

    const mesa = document.getElementById("mesa").value.toString().trim();
    if (!mesa) {
        alert("Informe a mesa.");
        return;
    }

    const pedidos = await getDB("pedidos");
    const existente = pedidos.find((pedido) => pedido.mesa.toString() === mesa && ["preparando", "em_preparacao"].includes(pedido.status));

    if (existente) {
        existente.itens += "\n" + itensNoPedidoAtual.map((item) => item.texto).join("\n");
        existente.total = parseFloat(existente.total) + totalGeralPedido;
        existente.status = "preparando";
        existente.obs = [existente.obs, document.getElementById("obs").value.trim()].filter(Boolean).join(" | ");
    } else {
        pedidos.push({
            id: Date.now().toString().slice(-6),
            mesa,
            total: totalGeralPedido,
            status: "preparando",
            itens: itensNoPedidoAtual.map((item) => item.texto).join("\n"),
            obs: document.getElementById("obs").value.trim(),
            garcom: "Admin",
            hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        });
    }

    await saveDB("pedidos", pedidos);
    window.location.href = getPagePath("preparar.html");
}

async function renderizarPedidos() {
    const grid = document.querySelector(".orders-grid");
    if (!grid || window.location.pathname.includes("kitchen.html") || window.location.pathname.includes("admin.html") || window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) return;

    const pedidos = await getDB("pedidos");
    const path = window.location.pathname;
    const filtrados = pedidos.filter((pedido) => {
        if (path.includes("preparar.html")) return ["preparando", "em_preparacao", "pronto"].includes(pedido.status);
        if (path.includes("pagamentos.html")) return pedido.status === "pagamento";
        if (path.includes("historico.html")) return pedido.status === "entregue";
        return false;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#444; margin-top:50px;">Nenhum registro encontrado.</p>';
        return;
    }

    grid.innerHTML = filtrados.map((pedido) => `
        <div class="order-card">
            <div class="order-header">MESA ${pedido.mesa} - #${pedido.id}</div>
            <div style="font-size:0.8rem; color:#888;">Garcom: ${pedido.garcom || "Admin"} | ${pedido.hora || ""}</div>
            <div class="order-details" style="white-space:pre-wrap; margin:10px 0; font-weight:500;">${pedido.itens}</div>
            ${pedido.obs ? `<div class="obs-box alert">${pedido.obs}</div>` : ""}
            <div style="text-align:right; font-weight:bold; color:var(--primary-orange); font-size:1.5rem;">Total: R$ ${parseFloat(pedido.total).toFixed(2)}</div>
            <div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">${renderizarBotoesAcao(pedido)}</div>
        </div>`).join("");
}

function renderizarBotoesAcao(pedido) {
    if (window.location.pathname.includes("historico.html")) return '<b style="color:var(--green-btn); text-align:center;">PAGO</b>';
    if (pedido.status === "pagamento") {
        return `<button class="btn btn-green" style="height:60px;" onclick="confirmarPagamento('${pedido.id}')">CONFIRMAR PAGAMENTO</button>
                <button class="btn btn-red" onclick="deletarPedido('${pedido.id}')">CANCELAR MESA</button>`;
    }

    const pronto = pedido.status === "pronto";
    return `
        <div style="display:flex; gap:5px;">
            <button class="btn" style="background:${pronto ? "#444" : "var(--red-btn)"}; flex:3;" onclick="mudarStatus('${pedido.id}', '${pronto ? "em_preparacao" : "pronto"}')">${pronto ? "REABRIR" : "PRONTO"}</button>
            <button class="btn btn-red" style="flex:1;" onclick="deletarPedido('${pedido.id}')">X</button>
        </div>
        <button class="btn" style="background:#222;" onclick="reimprimirRecibo('${pedido.id}')">REIMPRIMIR</button>
        <button class="btn" style="background:var(--green-btn); opacity:${pronto ? 1 : 0.45};" onclick="mudarStatus('${pedido.id}', 'pagamento')">ENVIAR P/ CONTA</button>`;
}

async function carregarAnalytics() {
    const pedidos = await getDB("pedidos");
    const total = pedidos.reduce((acc, pedido) => acc + (parseFloat(pedido.total) || 0), 0);
    const vendaTotal = document.getElementById("vendaTotalDia");
    const qtdPedidos = document.getElementById("qtdPedidosDia");
    if (vendaTotal) vendaTotal.innerText = `R$ ${total.toFixed(2)}`;
    if (qtdPedidos) qtdPedidos.innerText = pedidos.length;
}

async function renderizarCatalogo() {
    const lista = document.getElementById("listaCatalogo");
    if (!lista) return;
    const catalogo = await getDB("catalogo");
    lista.innerHTML = catalogo.map((produto) => `
        <div class="order-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; padding:10px; ${produto.indisponivel ? "opacity:0.5;" : ""}">
            <div><b>${produto.nome}</b><br><small>${produto.categoria} | R$ ${parseFloat(produto.preco).toFixed(2)}${produto.descricao ? "<br><i>" + produto.descricao + "</i>" : ""}</small></div>
            <div style="display:flex; gap:5px;">
                <button class="btn" style="background:#ff6600; width:auto; padding:5px 10px;" onclick="toggleIndisponivel('${produto.id}')">${produto.indisponivel ? "Disponivel" : "Indisponivel"}</button>
                <button class="btn btn-red" style="width:auto; padding:5px 10px;" onclick="removerCat('${produto.id}')">Remover</button>
            </div>
        </div>`).join("");
}

async function renderizarGarcons() {
    const lista = document.getElementById("listaGarcons") || document.getElementById("listaGarçons");
    if (!lista) return;
    const garcons = await getDB("colaboradores");
    lista.innerHTML = garcons.map((garcom) => `
        <div class="order-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; padding:10px;">
            <span><b>${garcom.nome}</b> (PIN: ****)</span>
            <button class="btn btn-red" style="width:auto; padding:5px 10px;" onclick="removerGarcom('${garcom.nome}')">Remover</button>
        </div>`).join("");
}

async function configurarFormCatalogo() {
    const form = document.getElementById("formCatalogo");
    if (form) form.onsubmit = (event) => {
        event.preventDefault();
        adicionarProdutoCatalogo();
    };
}

async function salvarConfiguracoes() {
    const atual = await getConfig();
    await saveDB("configuracoes", {
        senha: document.getElementById("cfgNovaSenha").value || atual.senha,
        nome: document.getElementById("cfgNomeRestaurante").value || atual.nome,
        modoCozinha: document.getElementById("cfgModoCozinha").value || atual.modoCozinha,
        impressoraDesabilitada: document.getElementById("cfgImpressoraDesabilitada").checked
    });
    alert("Configuracoes salvas neste navegador.");
    window.location.reload();
}

async function adicionarProdutoCatalogo() {
    const nome = document.getElementById("catNome").value.trim();
    const preco = Number(document.getElementById("catPreco").value.replace(",", "."));
    if (!nome || Number.isNaN(preco)) {
        alert("Dados invalidos.");
        return;
    }

    const catalogo = await getDB("catalogo");
    catalogo.push({
        id: Date.now(),
        categoria: document.getElementById("catCategoria").value,
        nome,
        preco,
        descricao: document.getElementById("catDescricao").value.trim(),
        indisponivel: false
    });
    await saveDB("catalogo", catalogo);
    document.getElementById("formCatalogo").reset();
    await renderizarCatalogo();
}

function configurarFormGarcom() {
    const form = document.getElementById("formGarcom");
    if (!form) return;

    form.onsubmit = async (event) => {
        event.preventDefault();
        const nome = document.getElementById("nomeGarcom").value.trim();
        const pin = document.getElementById("pinGarcom").value.trim();
        if (!nome || !pin) return;

        const garcons = await getDB("colaboradores");
        garcons.push({ nome, pin });
        await saveDB("colaboradores", garcons);
        form.reset();
        await renderizarGarcons();
    };
}

async function renderizarListaTurnos() {
    const lista = document.getElementById("listaTurnos");
    if (!lista) return;
    const historico = await getDB("historicoTurnos");
    lista.innerHTML = historico.map((turno) => `
        <div class="order-card" onclick="toggleTurno(${turno.id})" style="cursor:pointer; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between"><b>${turno.nome} - ${turno.data}</b> <span>v</span></div>
            <div id="detalhe-${turno.id}" style="display:none; margin-top:10px; border-top:1px dashed #444; padding-top:10px;">
                <p><b>Abertura:</b> ${turno.abertura || "N/A"}</p>
                <p><b>Fechamento:</b> ${turno.fechamento || "N/A"}</p>
                <p style="margin:10px 0;"><b>Vendas Totais: R$ ${turno.vendas}</b></p>
                <p style="font-size:0.9rem; color:#ccc;">Total de comandas: ${turno.qtd}</p>
                <button class="btn" style="background:#444; font-size:0.7rem; width:auto; padding:5px 15px; margin-top:10px;" onclick="baixarTxtTurno('${turno.id}', event)">Baixar .txt</button>
            </div>
        </div>`).join("");
}

function toggleTurno(id) {
    const detalhe = document.getElementById(`detalhe-${id}`);
    if (detalhe) detalhe.style.display = detalhe.style.display === "none" ? "block" : "none";
}

async function baixarTxtTurno(id, event) {
    if (event) event.stopPropagation();
    const config = await getConfig();
    const historico = await getDB("historicoTurnos");
    const turno = historico.find((item) => item.id.toString() === id.toString());
    if (!turno) return;

    let conteudo = `RELATORIO: ${config.nome.toUpperCase()}\nDATA: ${turno.data}\nABERTURA: ${turno.abertura || "N/A"}\nFECHAMENTO: ${turno.fechamento || "N/A"}\n`;
    conteudo += `TOTAL VENDIDO NO TURNO: R$ ${turno.vendas}\n`;
    const blob = new Blob([conteudo], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Resumo_${turno.nome}_${turno.data.replace(/\//g, "-")}.txt`;
    link.click();
}

async function mudarStatus(id, novoStatus) {
    const pedidos = await getDB("pedidos");
    const index = pedidos.findIndex((pedido) => pedido.id.toString() === id.toString());
    if (index === -1) return;

    pedidos[index].status = novoStatus;
    await saveDB("pedidos", pedidos);
    await renderizarPedidos();
    if (typeof renderizarMonitorCozinha === "function") renderizarMonitorCozinha();
}

async function deletarPedido(id) {
    const senha = await exibirModalSenha("SENHA ADMIN PARA DELETAR");
    const config = await getConfig();
    if (senha === null) return;
    if (senha.trim() !== config.senha.toString().trim()) {
        alert("Senha Incorreta!");
        return;
    }

    const pedidos = await getDB("pedidos");
    await saveDB("pedidos", pedidos.filter((pedido) => pedido.id.toString() !== id.toString()));
    await renderizarPedidos();
    if (typeof renderizarMonitorCozinha === "function") renderizarMonitorCozinha();
}

async function confirmarPagamento(id) {
    const pedidos = await getDB("pedidos");
    const index = pedidos.findIndex((pedido) => pedido.id.toString() === id.toString());
    if (index === -1) return;

    pedidos[index].status = "entregue";
    pedidos[index].meioPagamento = pedidos[index].meioPagamento || "pix";
    await saveDB("pedidos", pedidos);
    await renderizarPedidos();
    alert("Pagamento confirmado.");
}
async function gerenciarTurno(acao) {
    const config = await getConfig();
    const titulo = acao === "abrir" ? "ABRIR NOVO TURNO" : "FECHAR TURNO E CAIXA";
    const senha = await exibirModalSenha(titulo);

    if (senha === null) return;
    if (senha.trim() !== config.senha.toString().trim()) {
        alert("Senha Incorreta!");
        return;
    }

    if (acao === "abrir") {
        await saveDB("statusTurno", {
            aberto: true,
            tipo: new Date().getHours() < 18 ? "DIURNO" : "NOTURNO",
            abertura: new Date().toLocaleString("pt-BR")
        });
    } else {
        await saveDB("statusTurno", {
            aberto: false,
            tipo: "STATIC",
            abertura: "Modo estatico"
        });
    }

    window.location.href = getPagePath("index.html");
}
async function removerCat(id) {
    if (!confirm("Remover do catalogo?")) return;
    const catalogo = await getDB("catalogo");
    await saveDB("catalogo", catalogo.filter((produto) => produto.id.toString() !== id.toString()));
    await renderizarCatalogo();
}

async function toggleIndisponivel(id) {
    const catalogo = await getDB("catalogo");
    const produto = catalogo.find((item) => item.id.toString() === id.toString());
    if (!produto) return;

    produto.indisponivel = !produto.indisponivel;
    await saveDB("catalogo", catalogo);
    await renderizarCatalogo();
}

async function removerGarcom(nome) {
    if (!confirm("Remover colaborador?")) return;
    const garcons = await getDB("colaboradores");
    await saveDB("colaboradores", garcons.filter((garcom) => garcom.nome !== nome));
    await renderizarGarcons();
}

window.onload = async () => {
    await checarTurno();
    const path = window.location.pathname;

    if (path.includes("admin.html")) {
        const config = await getConfig();
        await renderizarCatalogo();
        await renderizarGarcons();
        await configurarFormCatalogo();
        configurarFormGarcom();
        const nome = document.getElementById("cfgNomeRestaurante");
        const modo = document.getElementById("cfgModoCozinha");
        const impressora = document.getElementById("cfgImpressoraDesabilitada");
        if (nome) nome.value = config.nome;
        if (modo) modo.value = config.modoCozinha;
        if (impressora) impressora.checked = true;
    }

    if (path.includes("cadastro.html")) await prepararCadastro();
    if (path.includes("index.html") || path.endsWith("/")) await carregarAnalytics();
    if (!path.includes("kitchen.html") && !path.includes("admin.html") && !path.includes("index.html")) await renderizarPedidos();
};

document.addEventListener("click", async (event) => {
    if (event.target && event.target.id === "btnAddItem") {
        const select = document.getElementById("selectProduto");
        const catalogo = await getDB("catalogo");
        const produto = catalogo.find((item) => item.nome === select.value);
        const qtd = parseInt(document.getElementById("qtd").value, 10) || 1;
        if (!produto) return alert("Selecione um produto primeiro!");
        const subtotal = produto.preco * qtd;
        totalGeralPedido += subtotal;
        itensNoPedidoAtual.push({ texto: `${qtd}x ${produto.nome}`, valor: subtotal });
        atualizarListaTemporaria();
    }
});

document.addEventListener("submit", (event) => {
    if (event.target && ["formPedido", "formCatalogo", "formGarcom"].includes(event.target.id)) return;
    event.preventDefault();
    avisoEstatico();
});

window.getDB = getDB;
window.saveDB = saveDB;
window.getConfig = getConfig;
window.avisoEstatico = avisoEstatico;
window.exibirModalSenha = exibirModalSenha;
window.prepararCadastro = prepararCadastro;
window.finalizarPedidoEstatico = finalizarPedidoEstatico;
window.renderizarPedidos = renderizarPedidos;
window.carregarAnalytics = carregarAnalytics;
window.renderizarCatalogo = renderizarCatalogo;
window.renderizarGarcons = renderizarGarcons;
window.salvarConfiguracoes = salvarConfiguracoes;
window.toggleTurno = toggleTurno;
window.baixarTxtTurno = baixarTxtTurno;
window.mudarStatus = mudarStatus;
window.deletarPedido = deletarPedido;
window.confirmarPagamento = confirmarPagamento;
window.gerenciarTurno = gerenciarTurno;
window.removerCat = removerCat;
window.toggleIndisponivel = toggleIndisponivel;
window.removerGarcom = removerGarcom;
window.removerItemTemp = removerItemTemp;
window.encerrarSessaoAdmin = () => {
    window.location.href = getPagePath("index.html");
};
window.exportarCatalogo = async () => {
    const catalogo = await getDB("catalogo");
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(catalogo, null, 2));
    const link = document.createElement("a");
    link.href = data;
    link.download = "catalogo.json";
    link.click();
};
window.importarCatalogo = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
        try {
            const imported = JSON.parse(loadEvent.target.result);
            if (!Array.isArray(imported)) {
                alert("O arquivo precisa conter uma lista JSON de produtos.");
                return;
            }

            const catalogo = imported.map((item, index) => {
                const preco = Number(String(item.preco ?? "").replace(",", "."));
                if (!item.nome || Number.isNaN(preco)) {
                    throw new Error(`Produto invalido na linha ${index + 1}`);
                }

                return {
                    id: item.id || Date.now() + index,
                    categoria: item.categoria || "Lanches",
                    nome: item.nome,
                    preco,
                    descricao: item.descricao || "",
                    indisponivel: Boolean(item.indisponivel)
                };
            });

            await saveDB("catalogo", catalogo);
            event.target.value = "";
            await renderizarCatalogo();
            alert("Catalogo importado. Ele sera usado nos pedidos neste navegador.");
        } catch (error) {
            console.error(error);
            alert("Erro ao importar catalogo. Verifique se o arquivo e um JSON valido.");
        }
    };

    reader.readAsText(file);
};
window.resetarHistoricoTurnos = async () => {
    if (!confirm("Limpar historico de turnos?")) return;
    await saveDB("historicoTurnos", []);
    await renderizarListaTurnos();
};
window.resetarCatalogoInteiro = async () => {
    if (!confirm("Zerar catalogo?")) return;
    await saveDB("catalogo", []);
    await renderizarCatalogo();
};
window.reimprimirRecibo = avisoEstatico;
window.imprimirReciboCozinha = avisoEstatico;

