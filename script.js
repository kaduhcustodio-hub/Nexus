import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const FOTO_PADRAO = 'user_comun.png';
let usuarioAtual = null;
let perfilVisitado = null;
let chatAtivoId = null;

document.addEventListener("DOMContentLoaded", function() {
    vincularEventos();
    ouvirEstadoAutenticacao();
    window.addEventListener("hashchange", gerenciarRotas);
});

function vincularEventos() {
    document.getElementById("btnEntrar").addEventListener("click", realizarLogin);
    document.getElementById("btnIrCadastro").addEventListener("click", mostrarTelaCadastro);
    document.getElementById("btnVoltarLogin").addEventListener("click", mostrarTelaLogin);
    document.getElementById("btnCadastrar").addEventListener("click", realizarCadastro);
    document.getElementById("btnSair").addEventListener("click", fazerLogout);

    document.getElementById("caixaEmail").addEventListener("keypress", (e) => { if (e.key === "Enter") realizarLogin(); });
    document.getElementById("caixaSenha").addEventListener("keypress", (e) => { if (e.key === "Enter") realizarLogin(); });

    document.getElementById("btnHome").addEventListener("click", () => window.location.hash = "home");
    document.getElementById("btnMensagensNav").addEventListener("click", () => window.location.hash = "chat");
    document.getElementById("btnConfig").addEventListener("click", () => window.location.hash = "config");

    document.getElementById("imgNavAvatar").addEventListener("click", () => {
        if (usuarioAtual) window.location.hash = usuarioAtual.username;
    });

    document.getElementById("btnPublicar").addEventListener("click", criarPublicacao);
    document.getElementById("btnBuscarGlobal").addEventListener("click", buscarUsuarioGlobal);
    document.getElementById("txtBuscaGlobal").addEventListener("keypress", (e) => { if (e.key === "Enter") buscarUsuarioGlobal(); });

    document.getElementById("btnSeguirPerfil").addEventListener("click", alternarSeguir);
    document.getElementById("btnEnviarMsg").addEventListener("click", enviarMensagemChat);

    document.getElementById("btnTemaEscuro").addEventListener("click", () => mudarTema('dark'));
    document.getElementById("btnTemaClaro").addEventListener("click", () => mudarTema('light'));
}

function ouvirEstadoAutenticacao() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                usuarioAtual = { uid: user.uid, ...userDoc.data() };
                atualizarInterfaceLogada();
                gerenciarRotas();
            }
        } else {
            usuarioAtual = null;
            mostrarTelaLogin();
        }
    });
}

function atualizarInterfaceLogada() {
    if (!usuarioAtual) return;
    document.getElementById("welcomeUserTitle").innerText = "DASHBOARD - " + usuarioAtual.nome.toUpperCase();
    if (usuarioAtual.foto) {
        document.getElementById("imgNavAvatar").style.backgroundImage = `url('${usuarioAtual.foto}')`;
    }
}

// AUTENTICAÇÃO
async function realizarLogin() {
    const email = document.getElementById("caixaEmail").value.trim();
    const senha = document.getElementById("caixaSenha").value;
    if (!email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
        alert("Erro ao entrar: " + error.message);
    }
}

async function realizarCadastro() {
    const nome = document.getElementById("cadNome").value.trim();
    const username = document.getElementById("cadUsuario").value.trim().toLowerCase().replace(/\s+/g, '_');
    const email = document.getElementById("cadEmail").value.trim();
    const senha = document.getElementById("cadSenha").value;
    const fileInput = document.getElementById("cadFotoInput").files[0];

    if (!nome || !username || !email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }
    if (senha.length < 6) {
        alert("A senha precisa ter pelo menos 6 caracteres!");
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        let fotoUrl = FOTO_PADRAO;

        if (fileInput) {
            const storageRef = ref(storage, `avatars/${cred.user.uid}`);
            await uploadBytes(storageRef, fileInput);
            fotoUrl = await getDownloadURL(storageRef);
        }

        await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            nome: nome,
            username: username,
            email: email,
            foto: fotoUrl,
            bio: "Olá, estou usando o NEXUS!",
            seguidores: [],
            seguindo: []
        });

        alert("Conta criada com sucesso!");
    } catch (error) {
        alert("Erro no cadastro: " + error.message);
    }
}

async function fazerLogout() {
    await signOut(auth);
    window.location.hash = "";
}

// ROTEAMENTO
function gerenciarRotas() {
    if (!usuarioAtual) return;
    const hash = window.location.hash.replace("#", "").trim();

    ocultarTodasSubTelas();

    if (hash === "" || hash === "home") {
        document.getElementById("subTelaHome").classList.remove("display-none");
        carregarFeed();
    } else if (hash === "chat") {
        document.getElementById("subTelaChat").classList.remove("display-none");
        carregarContatosChat();
    } else if (hash === "config") {
        document.getElementById("subTelaConfig").classList.remove("display-none");
    } else {
        carregarPerfilPublico(hash);
    }
}

function ocultarTodasSubTelas() {
    document.getElementById("subTelaHome").classList.add("display-none");
    document.getElementById("subTelaChat").classList.add("display-none");
    document.getElementById("subTelaPerfil").classList.add("display-none");
    document.getElementById("subTelaConfig").classList.add("display-none");
}

function mostrarTelaCadastro() {
    document.getElementById("telaLogin").classList.add("display-none");
    document.getElementById("telaCadastro").classList.remove("display-none");
}

function mostrarTelaLogin() {
    document.getElementById("telaCadastro").classList.add("display-none");
    document.getElementById("telaPrincipal").classList.add("display-none");
    document.getElementById("telaLogin").classList.remove("display-none");
}

function atualizarInterfaceLogada() {
    document.getElementById("telaLogin").classList.add("display-none");
    document.getElementById("telaCadastro").classList.add("display-none");
    document.getElementById("telaPrincipal").classList.remove("display-none");
    if (usuarioAtual && usuarioAtual.foto) {
        document.getElementById("imgNavAvatar").style.backgroundImage = `url('${usuarioAtual.foto}')`;
    }
}

// POSTAGENS, CURTIDAS E COMENTÁRIOS
async function criarPublicacao() {
    const texto = document.getElementById("postTextoInput").value.trim();
    const file = document.getElementById("postMidiaInput").files[0];
    if (!texto && !file) return;

    let mediaUrl = "";
    if (file) {
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "posts"), {
        autorUid: usuarioAtual.uid,
        autorNome: usuarioAtual.nome,
        autorUsername: usuarioAtual.username,
        autorFoto: usuarioAtual.foto,
        texto: texto,
        mediaUrl: mediaUrl,
        curtidas: [],
        descurtidas: [],
        data: Date.now()
    });

    document.getElementById("postTextoInput").value = "";
    document.getElementById("postMidiaInput").value = "";
    carregarFeed();
}

async function carregarFeed() {
    const lista = document.getElementById("feedPostsList");
    lista.innerHTML = "<p class='txt-muted text-center'>Carregando publicações...</p>";

    const querySnapshot = await getDocs(collection(db, "posts"));
    lista.innerHTML = "";

    const posts = [];
    querySnapshot.forEach((docSnap) => {
        posts.push({ id: docSnap.id, ...docSnap.data() });
    });
    posts.sort((a, b) => b.data - a.data);

    if (posts.length === 0) {
        lista.innerHTML = "<p class='txt-muted text-center'>Nenhuma publicação no momento.</p>";
        return;
    }

    posts.forEach(post => {
        const curtidas = post.curtidas || [];
        const descurtidas = post.descurtidas || [];
        const jaCurtiu = curtidas.includes(usuarioAtual.uid);
        const jaDescurtiu = descurtidas.includes(usuarioAtual.uid);

        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
            <div class="post-header">
                <div class="post-avatar" style="background-image: url('${post.autorFoto || FOTO_PADRAO}')"></div>
                <div>
                    <span class="post-author-name cursor-pointer" onclick="window.location.hash='${post.autorUsername}'">${post.autorNome}</span>
                    <p class="post-date">@${post.autorUsername}</p>
                </div>
            </div>
            <p class="post-content-text">${post.texto || ""}</p>
            ${post.mediaUrl ? `<div class="post-media-box"><img src="${post.mediaUrl}"></div>` : ''}
            <div class="post-actions-row">
                <button onclick="votarPost('${post.id}', 'curtir')">👍 (${curtidas.length}) ${jaCurtiu ? '<b>[Seu voto]</b>' : ''}</button>
                <button onclick="votarPost('${post.id}', 'descurtir')">👎 (${descurtidas.length}) ${jaDescurtiu ? '<b>[Seu voto]</b>' : ''}</button>
            </div>
        `;
        lista.appendChild(card);
    });
}

window.votarPost = async function(postId, tipo) {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;

    let curtidas = postSnap.data().curtidas || [];
    let descurtidas = postSnap.data().descurtidas || [];
    const uid = usuarioAtual.uid;

    if (tipo === 'curtir') {
        if (curtidas.includes(uid)) {
            curtidas = curtidas.filter(id => id !== uid);
        } else {
            curtidas.push(uid);
            descurtidas = descurtidas.filter(id => id !== uid);
        }
    } else {
        if (descurtidas.includes(uid)) {
            descurtidas = descurtidas.filter(id => id !== uid);
        } else {
            descurtidas.push(uid);
            curtidas = curtidas.filter(id => id !== uid);
        }
    }

    await updateDoc(postRef, { curtidas, descurtidas });
    carregarFeed();
};

// PERFIS E SEGUIR
async function carregarPerfilPublico(username) {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        alert("Usuário não encontrado!");
        window.location.hash = "home";
        return;
    }

    querySnapshot.forEach((docSnap) => {
        perfilVisitado = { id: docSnap.id, ...docSnap.data() };
    });

    document.getElementById("subTelaPerfil").classList.remove("display-none");
    document.getElementById("profilePageName").innerText = perfilVisitado.nome;
    document.getElementById("profilePageUser").innerText = "@" + perfilVisitado.username;
    document.getElementById("profilePageBio").innerText = `"${perfilVisitado.bio}"`;
    document.getElementById("profilePageAvatar").style.backgroundImage = `url('${perfilVisitado.foto}')`;

    const seguidores = perfilVisitado.seguidores || [];
    const seguindo = perfilVisitado.seguindo || [];
    document.getElementById("statSeguidores").innerText = `${seguidores.length} Seguidores`;
    document.getElementById("statSeguindo").innerText = `${seguindo.length} Seguindo`;

    const btnSeguir = document.getElementById("btnSeguirPerfil");
    if (perfilVisitado.id === usuarioAtual.uid) {
        btnSeguir.classList.add("display-none");
    } else {
        btnSeguir.classList.remove("display-none");
        if (seguidores.includes(usuarioAtual.uid)) {
            btnSeguir.innerText = "DEIXAR DE SEGUIR";
            btnSeguir.className = "btn btn-danger btn-full";
        } else {
            btnSeguir.innerText = "SEGUIR";
            btnSeguir.className = "btn btn-primary btn-full";
        }
    }
}

async function alternarSeguir() {
    if (!perfilVisitado) return;
    const targetRef = doc(db, "users", perfilVisitado.id);
    const myRef = doc(db, "users", usuarioAtual.uid);

    const seguidores = perfilVisitado.seguidores || [];
    const meunovoSeguindo = usuarioAtual.seguindo || [];

    if (seguidores.includes(usuarioAtual.uid)) {
        await updateDoc(targetRef, { seguidores: arrayRemove(usuarioAtual.uid) });
        await updateDoc(myRef, { seguindo: arrayRemove(perfilVisitado.id) });
    } else {
        await updateDoc(targetRef, { seguidores: arrayUnion(usuarioAtual.uid) });
        await updateDoc(myRef, { seguindo: arrayUnion(perfilVisitado.id) });
    }

    const updatedMyDoc = await getDoc(myRef);
    usuarioAtual = { uid: usuarioAtual.uid, ...updatedMyDoc.data() };
    carregarPerfilPublico(perfilVisitado.username);
}

// CHAT E MENSAGENS
async function carregarContatosChat() {
    const lista = document.getElementById("chatContactsList");
    lista.innerHTML = "<p class='txt-muted text-11'>Carregando contatos...</p>";

    const mySeguidores = usuarioAtual.seguidores || [];
    const mySeguindo = usuarioAtual.seguindo || [];
    const mutuos = mySeguidores.filter(id => mySeguindo.includes(id));

    if (mutuos.length === 0) {
        lista.innerHTML = "<p class='txt-muted text-11'>Você só pode conversar com quem você segue e que te segue de volta (seguidores mútuos).</p>";
        return;
    }

    lista.innerHTML = "";
    for (let uid of mutuos) {
        const uSnap = await getDoc(doc(db, "users", uid));
        if (uSnap.exists()) {
            const uData = uSnap.data();
            const item = document.createElement("div");
            item.className = "chat-contact-item";
            item.innerHTML = `
                <div class="post-avatar" style="background-image: url('${uData.foto || FOTO_PADRAO}'); width: 30px; height: 30px;"></div>
                <span class="text-12 font-bold">${uData.nome}</span>
            `;
            item.onclick = () => abrirConversa(uData);
            lista.appendChild(item);
        }
    }
}

function abrirConversa(contato) {
    chatAtivoId = [usuarioAtual.uid, contato.uid].sort().join("_");
    document.getElementById("chatHeaderInfo").innerText = `Conversando com: ${contato.nome}`;
    document.getElementById("chatInputRow").classList.remove("display-none");
    ouvirMensagensChat();
}

function ouvirMensagensChat() {
    if (!chatAtivoId) return;
    const container = document.getElementById("chatMessagesContainer");
    
    const q = query(collection(db, "chats", chatAtivoId, "mensagens"), orderBy("data", "asc"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const bubble = document.createElement("div");
            bubble.className = `chat-msg-bubble ${msg.remetente === usuarioAtual.uid ? 'chat-msg-sent' : 'chat-msg-received'}`;
            bubble.innerText = msg.texto;
            container.appendChild(bubble);
        });
        container.scrollTop = container.scrollHeight;
    });
}

async function enviarMensagemChat() {
    const input = document.getElementById("chatMsgInput");
    const texto = input.value.trim();
    if (!texto || !chatAtivoId) return;

    await addDoc(collection(db, "chats", chatAtivoId, "mensagens"), {
        remetente: usuarioAtual.uid,
        texto: texto,
        data: Date.now()
    });
    input.value = "";
}

// BUSCA GLOBAL
async function buscarUsuarioGlobal() {
    const termo = document.getElementById("txtBuscaGlobal").value.trim().toLowerCase();
    if (!termo) return;

    const q = query(collection(db, "users"), where("username", "==", termo));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        querySnapshot.forEach((docSnap) => {
            window.location.hash = docSnap.data().username;
        });
        document.getElementById("txtBuscaGlobal").value = "";
    } else {
        alert("Nenhum usuário encontrado com este nome exato.");
    }
}

// TEMAS
function mudarTema(tema) {
    if (tema === "light") {
        document.body.classList.add("theme-light");
        localStorage.setItem("nexus_theme", "light");
    } else {
        document.body.classList.remove("theme-light");
        localStorage.setItem("nexus_theme", "dark");
    }
}