// ============================================================
//  実験ページ
//  中身は data/experiments.js に書きます。このファイルは基本的に触らなくてOK
// ============================================================

(function () {
    document.getElementById("experimentLog").innerHTML = (window.EXPERIMENTS || []).map(entry => `
        <div class="experiment-entry">
            <div class="experiment-date">${escapeHTML(entry.date)}</div>
            <h3 class="experiment-title-small">${escapeHTML(entry.title)}</h3>
            <div class="experiment-tags">
                ${(entry.tags || []).map(tag => `<span class="experiment-tag">${escapeHTML(tag)}</span>`).join("")}
            </div>
            ${entry.description ? `<p class="experiment-description">${escapeHTML(entry.description)}</p>` : ""}
            ${youtubeEmbedHTML(entry.video, `${entry.title} ${entry.date}`, "experiment-video")}
        </div>
    `).join("");
})();
