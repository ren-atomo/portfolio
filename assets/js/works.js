// ============================================================
//  トップページ：作品一覧・作品詳細（モーダル）・写真の拡大表示
//  作品の中身は data/works.js に書きます。このファイルは基本的に触らなくてOK
// ============================================================

(function () {
    const works = window.WORKS || [];

    const grid = document.getElementById("worksMosaic");
    const modal = document.getElementById("workModal");
    const workDetail = document.getElementById("workDetail");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");

    let currentIndex = -1;          // 表示中の作品（works の何番目か）
    let galleryImages = [];         // 表示中の作品の写真（メイン画像 + gallery）
    let lightboxIndex = 0;

    function metaText(work) {
        return [work.category, work.year, work.place].filter(Boolean).join(" · ");
    }

    // ---- 一覧 ----

    grid.innerHTML = works.map((work, index) => `
        <div class="work size-${escapeHTML(work.size || "small")}" data-index="${index}">
            <div class="work-image">
                <img src="${escapeHTML(work.image)}" alt="${escapeHTML(work.title)}" loading="lazy">
                <div class="work-overlay">
                    <div class="work-title">${escapeHTML(work.title)}</div>
                    <div class="work-meta">${escapeHTML(metaText(work))}</div>
                </div>
            </div>
        </div>
    `).join("");

    grid.querySelectorAll(".work").forEach(el => {
        el.addEventListener("click", () => openWork(Number(el.dataset.index)));
    });

    // ---- 作品詳細 ----

    function openWork(index) {
        currentIndex = index;
        const work = works[index];
        const gallery = work.gallery || [];
        galleryImages = [work.image, ...gallery];

        const galleryHTML = gallery.length ? `
            <div class="work-gallery">
                ${gallery.map((src, i) => `
                    <div class="gallery-item" data-index="${i + 1}">
                        <img src="${escapeHTML(src)}" alt="${escapeHTML(work.title)} - ${i + 1}" loading="lazy">
                    </div>
                `).join("")}
            </div>
        ` : "";

        const meta = [work.category, work.year, work.place].filter(Boolean);

        workDetail.innerHTML = `
            <img src="${escapeHTML(work.image)}" alt="${escapeHTML(work.title)}" class="work-detail-hero" data-index="0">
            <div class="work-detail-container">
                <div class="work-detail-header">
                    <h2>${escapeHTML(work.title)}</h2>
                    <div class="work-detail-meta">
                        ${meta.map(m => `<span>${escapeHTML(m)}</span>`).join("")}
                    </div>
                </div>
                <div class="work-detail-content">
                    ${galleryHTML}
                    <div class="work-detail-info">
                        <div class="work-detail-description">${escapeHTML((work.description || "").trim())}</div>
                        ${youtubeEmbedHTML(work.video, `${work.title} - YouTube`, "work-video")}
                    </div>
                </div>

                <!-- 関連ページへのリンク -->
                <div class="related-links">
                    <div class="related-links-title">もっと見る</div>
                    <div class="related-links-buttons">
                        <a href="philosophy.html" class="related-link-btn">思想について</a>
                        <a href="experiments.html" class="related-link-btn">実験ノート</a>
                        <a href="profile.html" class="related-link-btn">プロフィール</a>
                    </div>
                </div>
            </div>
        `;

        // メイン画像・追加写真をクリックすると拡大表示
        workDetail.querySelectorAll(".work-detail-hero, .gallery-item").forEach(el => {
            el.addEventListener("click", () => openLightbox(Number(el.dataset.index)));
        });

        modal.classList.add("active");
        modal.scrollTop = 0;
        document.body.style.overflow = "hidden";
    }

    function closeWork() {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }

    function showWork(step) {
        openWork((currentIndex + step + works.length) % works.length);
    }

    document.getElementById("modalClose").addEventListener("click", closeWork);
    document.getElementById("prevWork").addEventListener("click", () => showWork(-1));
    document.getElementById("nextWork").addEventListener("click", () => showWork(1));
    modal.addEventListener("click", e => {
        if (e.target === modal) closeWork();
    });

    // ---- 写真の拡大表示 ----

    function openLightbox(index) {
        lightboxIndex = index;
        lightboxImage.src = galleryImages[index];
        lightbox.classList.add("active");
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
    }

    function showImage(step) {
        lightboxIndex = (lightboxIndex + step + galleryImages.length) % galleryImages.length;
        lightboxImage.src = galleryImages[lightboxIndex];
    }

    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    document.getElementById("lightboxPrev").addEventListener("click", () => showImage(-1));
    document.getElementById("lightboxNext").addEventListener("click", () => showImage(1));
    lightbox.addEventListener("click", e => {
        if (e.target === lightbox) closeLightbox();
    });

    // ---- キーボード操作 ----

    document.addEventListener("keydown", e => {
        if (lightbox.classList.contains("active")) {
            if (e.key === "Escape") closeLightbox();
            else if (e.key === "ArrowLeft") showImage(-1);
            else if (e.key === "ArrowRight") showImage(1);
        } else if (modal.classList.contains("active")) {
            if (e.key === "Escape") closeWork();
            else if (e.key === "ArrowLeft") showWork(-1);
            else if (e.key === "ArrowRight") showWork(1);
        }
    });
})();
