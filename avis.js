(function () {
  const SUPABASE_URL = "https://npymhvlxxmnatxcuibun.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weW1odmx4eG1uYXR4Y3VpYnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MjQ3NzksImV4cCI6MjEwNTQwMDc3OX0.-BBRDGWFyvB1udeHiUNavPpWkCpWRyUadXOYGdaMP9c";

  if (!window.supabase) {
    console.error("La librairie Supabase n'est pas chargée : vérifie la balise <script> dans la page.");
    return;
  }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const style = document.createElement("style");
  style.textContent = `
    .avis { margin-top: 10px; font-family: system-ui, sans-serif; }
    .avis-toggle { background: #1e1e28; border: 1px solid #333; color: #f2f2f2;
      padding: 10px 18px; border-radius: 24px; cursor: pointer; font-size: 0.9rem; }
    .avis-toggle:hover { background: #262632; }
    .avis-panel { display: none; margin-top: 14px; background: #1a1a22; border-radius: 10px; padding: 16px; }
    .avis-panel.open { display: block; }
    .avis-stars { font-size: 2rem; text-align: center; }
    .avis-stars span { color: #444; cursor: pointer; }
    .avis-stars span.filled { color: #f5c518; }
    .avis-info { text-align: center; font-size: 0.85rem; color: #999; margin: 6px 0 16px; }
    .avis-panel input, .avis-panel textarea { width: 100%; box-sizing: border-box; background: #1e1e28;
      border: 1px solid #2a2a38; border-radius: 6px; padding: 10px; color: #f2f2f2;
      font-size: 0.9rem; font-family: inherit; margin-bottom: 8px; }
    .avis-panel textarea { min-height: 70px; resize: vertical; }
    .avis-send { background: #e63946; color: #fff; border: none; border-radius: 6px;
      padding: 10px 16px; cursor: pointer; }
    .avis-comment { background: #1e1e28; border-radius: 8px; padding: 12px 14px; margin-top: 10px; }
    .avis-pseudo-nom { font-weight: bold; color: #f5c518; font-size: 0.9rem; }
    .avis-date { font-size: 0.75rem; color: #777; margin-left: 8px; }
    .avis-msg { margin-top: 6px; font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; }
    .avis-vide { color: #777; font-size: 0.85rem; margin-top: 12px; }
  `;
  document.head.appendChild(style);

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  document.querySelectorAll(".avis[data-chapter]").forEach(initAvis);

  function initAvis(root) {
    const chapterId = root.dataset.chapter;
    const storageKey = "note_" + chapterId;

    root.innerHTML = `
      <button class="avis-toggle">⭐ Noter et commenter <span class="avis-moyenne"></span></button>
      <div class="avis-panel">
        <div class="avis-stars">${[1, 2, 3, 4, 5].map(n => `<span data-value="${n}">★</span>`).join("")}</div>
        <div class="avis-info">Chargement...</div>
        <input class="avis-pseudo" type="text" placeholder="Ton pseudo" maxlength="40">
        <textarea class="avis-message" placeholder="Ton commentaire..." maxlength="1000"></textarea>
        <button class="avis-send">Envoyer</button>
        <div class="avis-list"></div>
      </div>`;

    const toggle = root.querySelector(".avis-toggle");
    const moyenne = root.querySelector(".avis-moyenne");
    const panel = root.querySelector(".avis-panel");
    const stars = root.querySelectorAll(".avis-stars span");
    const info = root.querySelector(".avis-info");
    const list = root.querySelector(".avis-list");
    let commentsLoaded = false;

    function paint(value) {
      stars.forEach(s => s.classList.toggle("filled", parseInt(s.dataset.value) <= value));
    }
    function paintSaved() {
      const saved = localStorage.getItem(storageKey);
      paint(saved ? parseInt(saved) : 0);
    }

    stars.forEach(s => {
      s.addEventListener("mouseenter", () => paint(parseInt(s.dataset.value)));
      s.addEventListener("click", () => rate(parseInt(s.dataset.value)));
    });
    root.querySelector(".avis-stars").addEventListener("mouseleave", paintSaved);
    paintSaved();

    toggle.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open") && !commentsLoaded) {
        commentsLoaded = true;
        loadComments();
      }
    });

    async function loadSummary() {
      const { data, error } = await sb.from("ratings").select("stars").eq("chapter_id", chapterId);
      if (error) {
        console.error(error);
        info.textContent = "Erreur de chargement de la note.";
        return;
      }
      if (!data.length) {
        info.textContent = "Sois le premier à noter !";
        moyenne.textContent = "";
        return;
      }
      const moy = data.reduce((s, r) => s + r.stars, 0) / data.length;
      info.textContent = moy.toFixed(1) + " / 5 — " + data.length + " vote(s)";
      moyenne.textContent = "· " + moy.toFixed(1) + "/5 (" + data.length + ")";
    }

    async function rate(value) {
      if (localStorage.getItem(storageKey)) {
        info.textContent = "Tu as déjà noté ce chapitre. Merci !";
        return;
      }
      paint(value);
      localStorage.setItem(storageKey, value);
      const { error } = await sb.from("ratings").insert({ chapter_id: chapterId, stars: value });
      if (error) {
        console.error(error);
        info.textContent = "Erreur lors de l'envoi de la note.";
        localStorage.removeItem(storageKey);
        paint(0);
        return;
      }
      loadSummary();
    }

    async function loadComments() {
      const { data, error } = await sb.from("comments").select("*")
        .eq("chapter_id", chapterId).order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        list.innerHTML = '<p class="avis-vide">Impossible de charger les commentaires.</p>';
        return;
      }
      if (!data.length) {
        list.innerHTML = '<p class="avis-vide">Aucun commentaire pour l’instant. Sois le premier !</p>';
        return;
      }
      list.innerHTML = data.map(c =>
        '<div class="avis-comment"><span class="avis-pseudo-nom">' + escapeHtml(c.pseudo) + '</span>' +
        '<span class="avis-date">' + formatDate(c.created_at) + '</span>' +
        '<div class="avis-msg">' + escapeHtml(c.message) + '</div></div>'
      ).join("");
    }

    root.querySelector(".avis-send").addEventListener("click", async () => {
      const pseudoEl = root.querySelector(".avis-pseudo");
      const messageEl = root.querySelector(".avis-message");
      const pseudo = pseudoEl.value.trim();
      const message = messageEl.value.trim();
      if (!pseudo || !message) {
        alert("Merci de remplir ton pseudo et ton commentaire.");
        return;
      }
      const { error } = await sb.from("comments").insert({ chapter_id: chapterId, pseudo: pseudo, message: message });
      if (error) {
        console.error(error);
        alert("Erreur lors de l'envoi, réessaie.");
        return;
      }
      messageEl.value = "";
      loadComments();
    });

    loadSummary(); // affiche la moyenne à côté du bouton dès le chargement
  }
})();
