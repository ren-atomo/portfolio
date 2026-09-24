// ============================================================
//  全ページ共通：ヘッダー・メニュー・フッター・トップへ戻るボタン
//  メニューの項目やサイト名を変えるときは、下の SITE だけを直せばOK
// ============================================================

const SITE = {
    name: "堤 廉太郎",
    // page は各HTMLの <body data-page="..."> と対応していて、現在のページに下線が付きます
    nav: [
        { page: "works",       label: "Works",       href: "index.html#works" },
        { page: "philosophy",  label: "Philosophy",  href: "philosophy.html" },
        { page: "profile",     label: "Profile",     href: "profile.html" },
        { page: "experiments", label: "Experiments", href: "experiments.html" }
    ]
};

// ---- 各ページのスクリプトから使う小さな道具 ----

// 文字列をHTMLとして安全に埋め込むためのエスケープ
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
}

// YouTube の URL（watch?v= / youtu.be / shorts / embed）でも動画IDでも受け付けて、IDを返す
function youtubeId(value) {
    if (!value) return "";
    const match = String(value).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
    return match ? match[1] : String(value).trim();
}

function youtubeEmbedHTML(value, title, className) {
    const id = youtubeId(value);
    if (!id) return "";
    return `
        <div class="${className}">
            <iframe
                src="https://www.youtube.com/embed/${escapeHTML(id)}"
                title="${escapeHTML(title)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
            </iframe>
        </div>
    `;
}

// ---- ヘッダー・フッターの描画 ----

(function renderSiteChrome() {
    const current = document.body.dataset.page;
    const links = SITE.nav.map(item => `
        <a href="${item.href}"${item.page === current ? ' class="current"' : ""}>${escapeHTML(item.label)}</a>
    `).join("");

    document.body.insertAdjacentHTML("afterbegin", `
        <header>
            <div class="header-content">
                <a href="index.html" class="logo">${escapeHTML(SITE.name)}</a>
                <nav>${links}</nav>
                <div class="mobile-menu-btn" id="mobileMenuBtn">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </header>

        <div class="mobile-menu" id="mobileMenu">${links}</div>
    `);

    document.body.insertAdjacentHTML("beforeend", `
        <div class="scroll-to-top" id="scrollToTop"></div>

        <footer>
            <p>© ${new Date().getFullYear()} ${escapeHTML(SITE.name)}</p>
        </footer>
    `);

    // モバイルメニュー
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    function closeMobileMenu() {
        mobileMenuBtn.classList.remove("active");
        mobileMenu.classList.remove("active");
        document.body.style.overflow = "";
    }

    mobileMenuBtn.addEventListener("click", () => {
        mobileMenuBtn.classList.toggle("active");
        mobileMenu.classList.toggle("active");
        document.body.style.overflow = mobileMenu.classList.contains("active") ? "hidden" : "";
    });

    mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMobileMenu));

    // トップへ戻るボタン
    const scrollToTop = document.getElementById("scrollToTop");

    window.addEventListener("scroll", () => {
        scrollToTop.classList.toggle("show", window.pageYOffset > 300);
    });

    scrollToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();
