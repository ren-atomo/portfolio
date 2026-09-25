// ============================================================
//  思想ページ
//  中身は data/philosophy.js に書きます。このファイルは基本的に触らなくてOK
// ============================================================

(function () {
    const data = window.PHILOSOPHY;

    // 本文の1段落（空行で区切られたかたまり）をHTMLにする
    //   「・」で始まる行だけ → 箇条書き
    //   「>」で始まる行だけ  → 引用ブロック
    //   それ以外             → 段落（改行はそのまま改行）
    function blockHTML(block, emphasis) {
        const lines = block.split("\n").map(line => line.trim());

        if (lines.every(line => line.startsWith("・"))) {
            return `<ul class="concept-list">${lines.map(line =>
                `<li>${escapeHTML(line.replace(/^・\s*/, ""))}</li>`).join("")}</ul>`;
        }
        if (lines.every(line => line.startsWith(">"))) {
            return `<div class="thought-block">${lines.map(line =>
                escapeHTML(line.replace(/^>\s?/, ""))).join("<br>")}</div>`;
        }
        return `<p class="philosophy-text${emphasis ? " emphasis" : ""}">${lines.map(escapeHTML).join("<br>")}</p>`;
    }

    function sectionHTML(section) {
        const blocks = String(section.body || "")
            .split(/\n\s*\n/)
            .map(block => block.trim())
            .filter(Boolean);
        return `
            <div class="philosophy-section">
                ${section.heading ? `<h2 class="section-title">${escapeHTML(section.heading)}</h2>` : ""}
                ${blocks.map(block => blockHTML(block, section.emphasis)).join("")}
            </div>
        `;
    }

    document.getElementById("philosophy").innerHTML = `
        <h1 class="philosophy-title">${escapeHTML(data.title)}</h1>
        ${(data.sections || []).map(sectionHTML).join("")}
    `;
})();
