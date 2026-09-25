// ============================================================
//  実験ページ
//  中身は data/experiments.js に書きます。このファイルは基本的に触らなくてOK
// ============================================================

(function () {
    const entries = window.EXPERIMENTS || [];
    const log = document.getElementById("experimentLog");

    function photosHTML(entry, index) {
        const images = entry.images || [];
        if (!images.length) return "";
        return `
            <div class="experiment-photos${images.length === 1 ? " single" : ""}">
                ${images.map((src, i) => `
                    <button type="button" class="experiment-photo" data-entry="${index}" data-index="${i}">
                        <img src="${escapeHTML(src)}" alt="${escapeHTML(entry.title)} - ${i + 1}" loading="lazy">
                    </button>
                `).join("")}
            </div>
        `;
    }

    log.innerHTML = entries.map((entry, index) => `
        <div class="experiment-entry">
            <div class="experiment-date">${escapeHTML(entry.date)}</div>
            <h3 class="experiment-title-small">${escapeHTML(entry.title)}</h3>
            <div class="experiment-tags">
                ${(entry.tags || []).map(tag => `<span class="experiment-tag">${escapeHTML(tag)}</span>`).join("")}
            </div>
            ${entry.description ? `<p class="experiment-description">${escapeHTML(entry.description)}</p>` : ""}
            ${photosHTML(entry, index)}
            ${youtubeEmbedHTML(entry.video, `${entry.title} ${entry.date}`, "experiment-video")}
        </div>
    `).join("");

    // ---- 写真の拡大表示 ----

    document.body.insertAdjacentHTML("beforeend", `
        <div class="lightbox" id="lightbox">
            <div class="lightbox-close" id="lightboxClose"></div>
            <div class="lightbox-nav lightbox-prev" id="lightboxPrev"></div>
            <div class="lightbox-nav lightbox-next" id="lightboxNext"></div>
            <div class="lightbox-content">
                <img src="" alt="" class="lightbox-image" id="lightboxImage">
            </div>
        </div>
    `);

    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    let images = [];
    let current = 0;

    function show(i) {
        current = (i + images.length) % images.length;
        lightboxImage.src = images[current];
        const single = images.length < 2;
        document.getElementById("lightboxPrev").hidden = single;
        document.getElementById("lightboxNext").hidden = single;
    }

    function close() {
        lightbox.classList.remove("active");
    }

    log.addEventListener("click", e => {
        const photo = e.target.closest(".experiment-photo");
        if (!photo) return;
        images = entries[Number(photo.dataset.entry)].images || [];
        show(Number(photo.dataset.index));
        lightbox.classList.add("active");
    });

    document.getElementById("lightboxClose").addEventListener("click", close);
    document.getElementById("lightboxPrev").addEventListener("click", () => show(current - 1));
    document.getElementById("lightboxNext").addEventListener("click", () => show(current + 1));
    lightbox.addEventListener("click", e => {
        if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", e => {
        if (!lightbox.classList.contains("active")) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft" && images.length > 1) show(current - 1);
        else if (e.key === "ArrowRight" && images.length > 1) show(current + 1);
    });
})();
