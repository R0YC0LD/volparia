/* VOLPARIA — vitrin (storefront) */
(() => {
  "use strict";

  /* tilki logosunu yerleştir */
  $$("[data-fox]").forEach(el => { el.innerHTML = foxMark; });

  const GENDER_TONES = { kadin: ["#f0d8ca", "#ddb49c"], erkek: ["#e4d8c6", "#bfa585"], unisex: ["#eee0c9", "#d7bd93"], cocuk: ["#f4ddc0", "#e5b586"] };
  const isHome = !!$("#genderGrid");
  const isCategoryPage = !!$("#categoryView");
  const PARAMS = new URLSearchParams(location.search);

  /* ---------- render ---------- */
  function renderGenders() {
    if (!$("#genderGrid")) return;
    const tones = GENDER_TONES;
    const copy = { kadin: "Zarafetin günlük hali", erkek: "Net çizgiler, rahat duruş", unisex: "Herkese ait parçalar", cocuk: "Konforlu ve dayanıklı" };
    $("#genderGrid").innerHTML = Object.entries(GENDERS).map(([key, label], i) => {
      const count = state.products.filter(p => p.active !== false && p.gender === key).length;
      return `<button class="gender-card" data-gender-card="${key}" style="--tone:${tones[key][0]};--tone2:${tones[key][1]}"><span class="num">0${i + 1}</span><div class="silhouette"></div><h3>${label}</h3><p>${copy[key]}</p><small class="count">${count} ÜRÜN</small></button>`;
    }).join("");
  }
  function renderCategoryChips() {
    const host = $("#categoryChips"); if (!host) return;
    host.innerHTML = `<button class="chip ${!state.activeCategory ? "active" : ""}" data-category-chip="">Tümü</button>` +
      getCategories().map(c => `<button class="chip ${c === state.activeCategory ? "active" : ""}" data-category-chip="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function filteredProducts() {
    let list = state.products.filter(p => p.active !== false);
    if (state.activeFilter !== "all") list = list.filter(p => (p.tags || []).includes(state.activeFilter));
    if (state.activeGender) list = list.filter(p => p.gender === state.activeGender);
    if (state.activeCategory) list = list.filter(p => p.category === state.activeCategory);
    if (state.search) { const q = state.search.toLocaleLowerCase("tr"); list = list.filter(p => `${p.name} ${p.brand} ${p.sku} ${p.category}`.toLocaleLowerCase("tr").includes(q)); }
    const sort = $("#productSort")?.value;
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") list = [...list].sort((a, b) => (ratingInfo(b).score || 0) - (ratingInfo(a).score || 0));
    return list;
  }
  function productArt(p) {
    return p.imageUrl
      ? `<img class="product-photo" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy">`
      : `<div class="product-placeholder">${hangerSvg}<small>${esc((p.brand || "VOLPARIA").toUpperCase())}</small></div>`;
  }
  function sizeStripHtml(p) {
    const c = critical(p);
    return `<div class="size-strip">${sizesOf(p).map(s => {
      const st = Number(s.stock) || 0;
      const cls = st <= 0 ? "sold" : (st <= Math.min(2, c) ? "low" : "");
      return `<span class="size-chip ${cls}" title="${st <= 0 ? `${esc(s.name)} bedeni tükendi` : `${esc(s.name)}: ${st} adet`}">${esc(s.name)}</span>`;
    }).join("")}</div>`;
  }
  function productBadges(p) {
    const b = [];
    if (p.oldPrice && Number(p.oldPrice) > p.price) b.push(`<span class="pbadge sale">%${Math.round((1 - p.price / p.oldPrice) * 100)}</span>`);
    const label = p.badge || ((p.tags || []).includes("new") ? "Yeni" : "");
    if (label) b.push(`<span class="pbadge">${esc(label)}</span>`);
    return b.length ? `<div class="pbadges">${b.join("")}</div>` : "";
  }
  function productCard(p) {
    const fav = state.favorites.includes(p.id);
    const out = isSoldOut(p), low = isLowStock(p), t = totalStock(p), r = ratingInfo(p);
    return `<article class="product-card ${out ? "soldout" : ""}">
      <button class="product-art" data-product="${p.id}" style="--tone:${esc(p.tone || "#e8e2d6")}" aria-label="${esc(p.name)} detayını aç">
        ${productBadges(p)}
        ${out ? `<span class="badge out">Tükendi</span>` : ""}
        ${low ? `<span class="badge-flame"><i>🔥</i>Son ${t} ürün</span>` : ""}
        ${productArt(p)}
      </button>
      <button class="favorite ${fav ? "active" : ""}" data-favorite="${p.id}" aria-label="Favoriye ekle">${heartSvg}</button>
      <div class="product-meta">
        <small>${esc((p.brand || "").toUpperCase())} · ${esc(GENDERS[p.gender] || "")}</small>
        <h3>${esc(p.name)}</h3>
        <span class="sku">Kod: ${esc(p.sku)}${r.count ? ` · ★ ${r.score} (${r.count})` : ""}</span>
        ${sizeStripHtml(p)}
        <div class="price-row"><strong>${money(p.price)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</div>
      </div>
    </article>`;
  }
  function renderProducts() {
    if (!$("#productGrid")) return;
    const list = filteredProducts();
    $("#productGrid").innerHTML = list.length ? list.map(productCard).join("") : `<div class="empty">Aramana uygun ürün bulunamadı.</div>`;
    $("#resultCount").textContent = `${list.length} ürün gösteriliyor`;
    $("#productsTitle").textContent = state.activeCategory ? state.activeCategory : state.activeGender ? `${GENDERS[state.activeGender]} koleksiyonu` : "Öne çıkanlar";
    $$("#categoryNav a").forEach(a => {
      const g = a.dataset.genderLink, f = a.dataset.filterLink;
      a.classList.toggle("active", (g !== undefined && g === state.activeGender && state.activeFilter === "all") || (f && f === state.activeFilter));
    });
    renderCategoryChips();
  }
  /* ---------- kombinler ---------- */
  function bundleCard(b) {
    const members = bundleMembers(b), avail = bundleAvailable(b);
    return `<article class="bundle-card ${avail ? "" : "soldout"}">
      <button class="bundle-visual" data-bundle="${b.id}" style="--tone:${esc(b.tone || "#e8e2d6")}" aria-label="${esc(b.name)} kombinini incele">
        <span class="bundle-badge">🦊 %${bundleDiscountPct(b)} indirim</span>
        ${b.badge ? `<span class="badge right">${esc(b.badge)}</span>` : ""}
        ${!avail ? `<span class="badge out">Kombin tükendi</span>` : ""}
        <div class="bundle-thumbs">${members.slice(0, 3).map(p => `<span class="bundle-thumb" style="--tone:${esc(p.tone || "#e8e2d6")}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : hangerSvg}</span>`).join("")}</div>
      </button>
      <div class="bundle-meta">
        <small>KOMBİN · ${members.length} PARÇA</small>
        <h3>${esc(b.name)}</h3>
        <div class="bundle-price"><strong>${money(bundlePrice(b))}</strong><del>${money(bundleGross(b))}</del></div>
        <span class="bundle-save">Tek tek almaktansa ${money(bundleSavings(b))} kazan</span>
        <button class="button dark full" data-bundle="${b.id}" ${avail ? "" : "disabled"}>${avail ? "Kombini incele →" : "Tükendi"}</button>
      </div>
    </article>`;
  }
  function renderBundles() {
    const host = $("#bundleGrid"); if (!host) return;
    const list = activeBundles();
    const section = $("#bundles");
    if (section) section.style.display = list.length ? "" : "none";
    host.innerHTML = list.map(bundleCard).join("");
  }
  let bundleSizes = {};
  function openBundle(id) {
    const b = getBundle(id); if (!b) return;
    bundleSizes = {};
    bundleMembers(b).forEach(p => { const first = sizesOf(p).find(s => (Number(s.stock) || 0) > 0); bundleSizes[p.id] = first ? first.name : null; });
    renderBundleDetail(b);
    openLayer($("#productModal"));
  }
  function bundlePieceHtml(p) {
    const out = isSoldOut(p);
    return `<div class="bundle-piece-card">
      <div class="bundle-piece-art" style="--tone:${esc(p.tone || "#e8e2d6")}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : hangerSvg}</div>
      <div class="bundle-piece-info">
        <small>${esc((p.brand || "").toUpperCase())} · ${esc(GENDERS[p.gender] || "")}</small>
        <h4>${esc(p.name)}</h4>
        <span class="piece-price">${money(p.price)}</span>
        ${out ? `<span class="size-soldnote">Bu parça tükendi</span>` : `<div class="size-options mini">${sizesOf(p).map(s => { const st = Number(s.stock) || 0; return `<button class="size-option ${bundleSizes[p.id] === s.name ? "active" : ""}" data-bundle-size="${p.id}" data-size="${esc(s.name)}" ${st <= 0 ? "disabled" : ""} title="${st <= 0 ? "Tükendi" : st + " adet"}">${esc(s.name)}</button>`; }).join("")}</div>`}
      </div>
    </div>`;
  }
  function renderBundleDetail(b) {
    const members = bundleMembers(b);
    const ready = members.every(p => bundleSizes[p.id]);
    $("#productDetail").innerHTML = `<button class="round-close modal-close" data-close>×</button>
      <div class="bundle-detail">
        <div class="bundle-detail-head">
          <span class="eyebrow">🦊 KOMBİN · %${bundleDiscountPct(b)} İNDİRİM</span>
          <h2>${esc(b.name)}</h2>
          <p>${esc(b.description || "")}</p>
          <div class="bundle-detail-price"><strong>${money(bundlePrice(b))}</strong><del>${money(bundleGross(b))}</del><span class="bundle-save">${money(bundleSavings(b))} tasarruf</span></div>
        </div>
        <div class="bundle-detail-note">Her parça için kendi bedenini seç; kombini indirimli fiyattan tek seferde sepete ekle.</div>
        <div class="bundle-detail-pieces">${members.map(bundlePieceHtml).join("")}</div>
        <button class="button dark full" id="bundleAdd" data-bundle-add="${b.id}" ${ready ? "" : "disabled"}>${ready ? `Kombini sepete ekle · ${money(bundlePrice(b))}` : "Her parça için beden seçin"}</button>
      </div>`;
  }
  function addBundleToCart(id) {
    const b = getBundle(id); if (!b) return;
    for (const p of bundleMembers(b)) {
      const sz = bundleSizes[p.id];
      if (!sz) { toast(`${p.name} için beden seçin`, false); return; }
      const s = sizeOf(p, sz);
      if (!s || (Number(s.stock) || 0) <= 0) { toast(`${p.name} — ${sz} tükendi`, false); return; }
    }
    state.cart.push({ bundle: true, bundleId: id, sizes: { ...bundleSizes }, quantity: 1 });
    persist(); renderHeader(); renderCart();
    const cb = $("#cartButton"); if (cb) { cb.classList.remove("pop"); void cb.offsetWidth; cb.classList.add("pop"); setTimeout(() => cb.classList.remove("pop"), 520); }
    toast(`${b.name} sepete eklendi`);
    openLayer($("#cartDrawer"));
  }

  function renderMobileMenu() {
    const host = $("#mobileNav"); if (!host) return;
    const cats = getCategories();
    host.innerHTML = `
      <a href="kategori.html">Tüm Ürünler</a>
      <span class="md-label">CİNSİYET</span>
      ${Object.entries(GENDERS).map(([k, v]) => `<a href="kategori.html?cinsiyet=${k}">${esc(v)}</a>`).join("")}
      <span class="md-label">KATEGORİLER</span>
      ${cats.map(c => `<a href="kategori.html?kategori=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}
      <span class="md-label">KEŞFET</span>
      <a class="md-accent" href="kategori.html?kombin=1">🦊 Kombinler</a>
      <a href="kategori.html?filtre=new">Yeni Gelenler</a>
      <a class="md-sale" href="kategori.html?filtre=sale">İndirim</a>
      <span class="md-label">YARDIM</span>
      <button data-page="shipping">Kargo ve teslimat</button>
      <button data-page="returns">İade ve değişim</button>
      <button data-page="sizes">Beden rehberi</button>
      <button data-page="contact">İletişim</button>`;
  }
  function renderSocial() {
    const host = $("#footerSocial"); if (!host) return;
    const s = state.settings;
    const links = [["instagram", safeExternalUrl(s.instagram)], ["tiktok", safeExternalUrl(s.tiktok)], ["twitter", safeExternalUrl(s.twitter)], ["whatsapp", s.whatsapp ? `https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}` : ""]].filter(([, url]) => url);
    host.innerHTML = links.map(([key, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${key}">${ICONS[key]}</a>`).join("");
  }
  function renderHeader() {
    $("#cartCount").textContent = state.cart.reduce((s, l) => s + l.quantity, 0);
    $("#favoriteCount").textContent = state.favorites.length;
    if ($("#announcement")) $("#announcement").textContent = state.settings.announcement;
    if ($("#heroEyebrow")) {
      $("#heroEyebrow").textContent = state.settings.heroEyebrow;
      const [a, b] = String(state.settings.heroTitle || "").split("|");
      $("#heroTitle").innerHTML = `${esc(a || "")}<em>${esc(b || "")}</em>`;
      $("#heroCopy").textContent = state.settings.heroCopy;
    }
    if ($("#footerContact")) $("#footerContact").textContent = [state.settings.supportEmail, state.settings.supportPhone].filter(Boolean).join(" · ");
    if (isHome) {
      document.title = state.settings.seoTitle || defaultSettings.seoTitle;
      $('meta[name="description"]')?.setAttribute("content", state.settings.seoDescription || defaultSettings.seoDescription);
    }
  }
  function renderAll() {
    renderHeader(); renderGenders(); renderProducts(); renderBundles(); renderCart(); renderFavorites(); renderSocial();
    if (isCategoryPage) renderCategoryPage();
    checkWatchlist();
  }
  window.onDataRefresh = renderAll;

  /* ======================= MEGA-MENÜ (Trendyol tarzı) ======================= */
  const categoryCount = (gender, cat) => state.products.filter(p => p.active !== false && (!gender || p.gender === gender) && p.category === cat).length;
  const genderProductCount = gender => state.products.filter(p => p.active !== false && p.gender === gender).length;
  function megaBodyHtml(gender) {
    const cats = getCategories();
    const half = Math.ceil(cats.length / 2);
    const colLinks = list => list.map(c => `<a href="kategori.html?cinsiyet=${encodeURIComponent(gender)}&kategori=${encodeURIComponent(c)}">${esc(c)}<span>${categoryCount(gender, c)}</span></a>`).join("");
    return `<div class="mega-group"><b>KATEGORİLER</b>${colLinks(cats.slice(0, half))}</div>
      <div class="mega-group"><b>&nbsp;</b>${colLinks(cats.slice(half))}
        <a class="strong" style="margin-top:10px;border-top:1px solid var(--line);padding-top:12px" href="kategori.html?cinsiyet=${encodeURIComponent(gender)}">Tüm ${esc(GENDERS[gender])} ürünleri →</a>
      </div>
      <div class="mega-promo">
        <div><span class="eyebrow">VOLPARIA SEÇKİSİ</span><h4>${esc(GENDERS[gender])} yeni sezon</h4><p>Zamansız parçalar, gerçek beden stoğu.</p></div>
        <a class="button dark" href="kategori.html?cinsiyet=${encodeURIComponent(gender)}&filtre=new">Yeni gelenler →</a>
        <i class="promo-fox">${foxMark}</i>
      </div>`;
  }
  function megaInnerHtml(gender) {
    return `<div class="mega-inner">
      <div class="mega-side">
        ${Object.entries(GENDERS).map(([k, v]) => `<button data-mega-gender="${k}" class="${k === gender ? "active" : ""}">${v}<i>${genderProductCount(k)} ›</i></button>`).join("")}
        <div class="mega-side-sep"></div>
        <a href="kategori.html?kombin=1" class="mega-kombin">🦊 Kombinler<i>›</i></a>
        <button data-mega-link="new">Yeni Gelenler<i>›</i></button>
        <button data-mega-link="sale">İndirimdekiler<i>›</i></button>
        <button data-mega-link="bestseller">Çok Satanlar<i>›</i></button>
      </div>
      <div class="mega-body">${megaBodyHtml(gender)}</div>
    </div>`;
  }
  let currentMega = "kadin", megaOpen = false;
  function openMega(gender) {
    const menu = $("#megaMenu"), nav = $("#categoryNav"); if (!menu) return;
    if (gender !== currentMega || !menu.classList.contains("show")) { currentMega = gender; menu.innerHTML = megaInnerHtml(gender); }
    menu.classList.add("show"); nav.classList.add("mega-open"); megaOpen = true;
  }
  function closeMega() { const menu = $("#megaMenu"), nav = $("#categoryNav"); if (!menu) return; menu.classList.remove("show"); nav.classList.remove("mega-open"); megaOpen = false; }
  function toggleMega() { megaOpen ? closeMega() : openMega(currentMega); }
  function initMegaMenu() {
    const nav = $("#categoryNav"), menu = $("#megaMenu"); if (!nav || !menu) return;
    // Menü tıklamayla açılır; açıkken cinsiyet sekmesi/başlık üzerine gelince panel değişir.
    menu.addEventListener("mouseover", e => { const g = e.target.closest("[data-mega-gender]"); if (g && g.dataset.megaGender !== currentMega) openMega(g.dataset.megaGender); });
    nav.addEventListener("mouseover", e => { if (!megaOpen) return; const a = e.target.closest("[data-nav-gender]"); if (a) openMega(a.dataset.navGender); });
  }

  /* ======================= KATEGORİ SAYFASI ======================= */
  const catState = {
    gender: PARAMS.get("cinsiyet") || "",
    category: PARAMS.get("kategori") || "",
    filter: PARAMS.get("filtre") || "",
    q: PARAMS.get("ara") || "",
    kombin: PARAMS.get("kombin") === "1",
    sizes: new Set(), inStock: false, sort: "featured"
  };
  const FILTER_LABEL = { new: "Yeni Gelenler", sale: "İndirimdekiler", bestseller: "Çok Satanlar" };
  function catScope() {
    let list = state.products.filter(p => p.active !== false);
    if (catState.gender) list = list.filter(p => p.gender === catState.gender);
    if (catState.filter) list = list.filter(p => (p.tags || []).includes(catState.filter));
    if (catState.q) { const q = catState.q.toLocaleLowerCase("tr"); list = list.filter(p => `${p.name} ${p.brand} ${p.sku} ${p.category}`.toLocaleLowerCase("tr").includes(q)); }
    return list;
  }
  function catFinalList() {
    let list = catScope();
    if (catState.category) list = list.filter(p => p.category === catState.category);
    if (catState.sizes.size) list = list.filter(p => sizesOf(p).some(s => catState.sizes.has(s.name) && (!catState.inStock || (Number(s.stock) || 0) > 0)));
    if (catState.inStock) list = list.filter(p => !isSoldOut(p));
    const s = catState.sort;
    if (s === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (s === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (s === "rating") list = [...list].sort((a, b) => (ratingInfo(b).score || 0) - (ratingInfo(a).score || 0));
    else if (s === "newest") list = [...list].sort((a, b) => ((b.tags || []).includes("new") ? 1 : 0) - ((a.tags || []).includes("new") ? 1 : 0));
    return list;
  }
  function catTitle() {
    if (catState.kombin) return "Kombinler";
    if (catState.category) return catState.category;
    if (catState.filter) return FILTER_LABEL[catState.filter] || "Ürünler";
    if (catState.gender) return `${GENDERS[catState.gender]} Koleksiyonu`;
    return "Tüm Ürünler";
  }
  function updateCatUrl(replace) {
    const p = new URLSearchParams();
    if (catState.gender) p.set("cinsiyet", catState.gender);
    if (catState.category) p.set("kategori", catState.category);
    if (catState.filter) p.set("filtre", catState.filter);
    if (catState.q) p.set("ara", catState.q);
    const url = `kategori.html${p.toString() ? "?" + p.toString() : ""}`;
    history[replace ? "replaceState" : "pushState"](null, "", url);
    document.title = `${catTitle()} — VOLPARIA`;
  }
  function renderCatHead() {
    const crumbs = [`<a href="index.html">Ana Sayfa</a>`];
    if (catState.kombin) crumbs.push(`<span class="sep">/</span><b>Kombinler</b>`);
    else {
      if (catState.gender) crumbs.push(`<span class="sep">/</span><a href="kategori.html?cinsiyet=${catState.gender}">${esc(GENDERS[catState.gender])}</a>`);
      if (catState.category) crumbs.push(`<span class="sep">/</span><b>${esc(catState.category)}</b>`);
      else if (catState.filter) crumbs.push(`<span class="sep">/</span><b>${esc(FILTER_LABEL[catState.filter] || "")}</b>`);
      else if (!catState.gender) crumbs.push(`<span class="sep">/</span><b>Tüm Ürünler</b>`);
    }
    $("#catBreadcrumb").innerHTML = crumbs.join("");
    $("#catTitle").textContent = catTitle();
    if ($("#catSub")) $("#catSub").textContent = catState.kombin ? "Birlikte alınca kazandıran, özenle eşleştirilmiş parçalar." : "";
  }
  function renderCatSidebar() {
    const scope = catScope();
    const genderRows = [["", "Tümü", state.products.filter(p => p.active !== false).length]]
      .concat(Object.entries(GENDERS).map(([k, v]) => [k, v, genderProductCount(k)]))
      .map(([k, v, n]) => `<button data-cat-gender="${k}" class="${catState.gender === k ? "active" : ""}">${esc(v)}<span>${n}</span></button>`).join("");
    const catRows = [`<button data-cat-cat="" class="${!catState.category ? "active" : ""}">Tümü<span>${scope.length}</span></button>`]
      .concat(getCategories().map(c => {
        const n = scope.filter(p => p.category === c).length;
        return `<button data-cat-cat="${esc(c)}" class="${catState.category === c ? "active" : ""}">${esc(c)}<span>${n}</span></button>`;
      })).join("");
    const sizeSet = [...new Set(scope.flatMap(p => sizesOf(p).map(s => s.name)))];
    const sizeRows = sizeSet.length ? sizeSet.map(sz => `<button data-cat-size="${esc(sz)}" class="${catState.sizes.has(sz) ? "active" : ""}">${esc(sz)}</button>`).join("") : `<span style="font-size:12px;color:var(--muted)">—</span>`;
    const hasActive = catState.category || catState.sizes.size || catState.inStock || catState.filter;
    $("#catSidebar").innerHTML = `
      <div class="sidebar-close">Filtreler<button class="round-close" data-cat-filter-close>×</button></div>
      <div class="filter-group"><h4>Cinsiyet</h4><div class="filter-list">${genderRows}</div></div>
      <div class="filter-group"><h4>Kategori</h4><div class="filter-list">${catRows}</div></div>
      <div class="filter-group"><h4>Beden</h4><div class="size-filter">${sizeRows}</div></div>
      <div class="filter-group"><h4>Durum</h4><label class="filter-toggle"><input type="checkbox" id="catInStock" ${catState.inStock ? "checked" : ""}>Sadece stoktakiler</label></div>
      ${hasActive ? `<button class="filter-clear" data-cat-clear>× Filtreleri temizle</button>` : ""}`;
  }
  function renderCatGrid() {
    const list = catFinalList();
    $("#categoryGrid").innerHTML = list.length ? list.map(productCard).join("") : `<div class="empty">Bu filtrelere uygun ürün bulunamadı. Filtreleri temizleyip tekrar deneyin.</div>`;
    $("#catCount").textContent = `${list.length} ürün`;
    const chips = [];
    if (catState.category) chips.push(["kategori", catState.category]);
    if (catState.filter) chips.push(["filtre", FILTER_LABEL[catState.filter]]);
    catState.sizes.forEach(s => chips.push(["beden", s, s]));
    if (catState.inStock) chips.push(["stok", "Stoktakiler"]);
    $("#catChips").innerHTML = chips.map(([type, label, val]) => `<span class="achip">${esc(label)}<button data-chip-remove="${type}" data-chip-val="${esc(val || "")}">×</button></span>`).join("");
  }
  function renderCategoryPage() {
    renderCatHead();
    if (catState.kombin) {
      const list = activeBundles();
      $("#catSidebar").innerHTML = `<div class="filter-group"><h4>Kombinler</h4><p style="font-size:12.5px;color:var(--muted);line-height:1.6">Kombinler, birbirini tamamlayan parçaların indirimli paketleridir. İncele düğmesiyle her parçanın bedenini seçebilirsin.</p></div><div class="filter-group"><a class="filter-clear" href="kategori.html" style="text-decoration:none">← Tüm ürünlere dön</a></div>`;
      $("#categoryGrid").innerHTML = list.length ? list.map(bundleCard).join("") : `<div class="empty">Şu an aktif kombin yok.</div>`;
      $("#catCount").textContent = `${list.length} kombin`;
      $("#catChips").innerHTML = "";
      const sortSel = $("#catSort"); if (sortSel) sortSel.style.display = "none";
      return;
    }
    const sortSel = $("#catSort"); if (sortSel) sortSel.style.display = "";
    renderCatSidebar(); renderCatGrid();
  }

  /* ---------- ürün detay ---------- */
  let detailQty = 1, detailSize = null;
  function openProduct(id) {
    const p = state.products.find(x => x.id === id); if (!p) return;
    const out = isSoldOut(p), r = ratingInfo(p);
    const firstAvailable = sizesOf(p).find(s => (Number(s.stock) || 0) > 0);
    detailSize = firstAvailable ? firstAvailable.name : null;
    detailQty = 1;
    $("#productDetail").innerHTML = `<button class="round-close modal-close" data-close>×</button>
      <div class="detail-art" style="--tone:${esc(p.tone || "#e8e2d6")}">${productArt(p)}</div>
      <div class="detail-copy">
        <span class="eyebrow">${esc((p.brand || "").toUpperCase())} · ${esc(GENDERS[p.gender] || "")}</span>
        <h2>${esc(p.name)}</h2>
        <div class="sku-line">ÜRÜN KODU: ${esc(p.sku)} · ${esc(p.category || "")}${r.count ? ` · ★ ${r.score} (${r.count} değerlendirme)` : ""}</div>
        <div class="detail-price">${money(p.price)}${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</div>
        <p>${esc(p.description || "")}</p>
        <div class="size-select">
          <b>BEDEN SEÇ <span class="size-note" data-page="sizes" style="cursor:pointer;text-decoration:underline">Beden rehberi</span></b>
          <div class="size-options">${sizesOf(p).map(s => {
            const st = Number(s.stock) || 0;
            return `<button class="size-option ${s.name === detailSize ? "active" : ""}" data-size-pick="${esc(s.name)}" ${st <= 0 ? "disabled" : ""} title="${st <= 0 ? "Bu beden tükendi" : `${st} adet stokta`}">${esc(s.name)}</button>`;
          }).join("")}</div>
          <div id="sizeStockNote">${sizeNoteHtml(p, detailSize)}</div>
        </div>
        ${watchRowHtml(p)}
        <div class="detail-qty"><b style="font-size:12px;letter-spacing:1px">ADET</b><div class="qty"><button data-detail-qty="-1">−</button><span id="detailQtyValue">1</span><button data-detail-qty="1">+</button></div></div>
        <button class="button dark full" id="detailAdd" data-add-to-cart="${p.id}" ${out || !detailSize ? "disabled" : ""}>${out ? "Bu ürün tükendi" : "Sepete ekle →"}</button>
        <div class="detail-list">
          ${p.fabric ? `<div><b>KUMAŞ</b><span>${esc(p.fabric)}</span></div>` : ""}
          ${p.care ? `<div><b>BAKIM</b><span>${esc(p.care)}</span></div>` : ""}
          <div><b>TESLİMAT</b><span>15.00'e kadar verilen siparişler aynı gün kargoda. 14 gün iade, ilk beden değişimi ücretsiz.</span></div>
        </div>
        <div class="review-block">
          <h3>Değerlendirmeler</h3>
          <div id="reviewList" class="review-list"></div>
          <form id="reviewForm" class="review-form">
            <b>Deneyimini paylaş</b>
            <div class="review-fields">
              <input name="name" placeholder="Adın" required maxlength="60">
              <select name="rating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${starFull.repeat(n)}${starEmpty.repeat(5 - n)}</option>`).join("")}</select>
            </div>
            <textarea name="comment" rows="3" placeholder="Ürün hakkında düşüncelerin" required maxlength="800"></textarea>
            <button class="button outline" type="submit">Yorumu gönder</button>
            <small>Yorumlar onaylandıktan sonra yayınlanır.</small>
          </form>
        </div>
      </div>`;
    openLayer($("#productModal"));
    loadReviews(p.id);
    $("#reviewForm").onsubmit = async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const review = { productId: p.id, name: String(data.name).trim(), rating: Number(data.rating), comment: String(data.comment).trim() };
      if (state.apiOnline) {
        try { await api("/api/reviews", { method: "POST", body: JSON.stringify(review) }); }
        catch (err) { toast(err.message, false); return; }
      } else {
        state.reviews.unshift({ id: uid("rev"), ...review, status: "pending", createdAt: new Date().toISOString() });
        persist();
      }
      e.target.reset();
      toast("Yorumun onaya gönderildi, teşekkürler");
    };
  }
  async function loadReviews(productId) {
    const host = $("#reviewList"); if (!host) return;
    let list = [];
    if (state.apiOnline) {
      host.innerHTML = `<div class="empty">Yorumlar yükleniyor…</div>`;
      try { list = (await api(`/api/reviews?product=${encodeURIComponent(productId)}`)).reviews || []; } catch { list = []; }
      list = list.map(r => ({ name: r.name, rating: r.rating, comment: r.comment, createdAt: r.created_at }));
    } else {
      list = state.reviews.filter(r => r.productId === productId && r.status === "approved");
    }
    host.innerHTML = list.length ? list.map(r => `<article class="review-item"><div><b>${esc(r.name)}</b><span class="stars">${starFull.repeat(r.rating)}${starEmpty.repeat(5 - r.rating)}</span></div><p>${esc(r.comment)}</p><small>${dateTr(r.createdAt)}</small></article>`).join("") : `<div class="empty">Henüz onaylanmış yorum yok — ilk değerlendirmeyi sen yap.</div>`;
  }
  function watchRowHtml(p) {
    const sold = sizesOf(p).filter(s => (Number(s.stock) || 0) <= 0);
    if (!sold.length) return "";
    return `<div class="watch-row"><b>🔔 Tükenen bedenler için haber ver</b><div class="watch-sizes">${sold.map(s => { const on = state.watchlist.some(w => w.productId === p.id && w.size === s.name); return `<button class="watch-size ${on ? "watching" : ""}" data-watch="${p.id}" data-watch-size="${esc(s.name)}">${esc(s.name)}${on ? " ✓" : ""}</button>`; }).join("")}</div><small>Seçtiğin beden stoğa gelince, siteye girdiğinde bildirim alırsın.</small></div>`;
  }
  function sizeNoteHtml(p, sizeName) {
    if (!sizeName) return isSoldOut(p) ? `<span class="size-soldnote">Bu ürünün tüm bedenleri tükendi.</span>` : "";
    const s = sizeOf(p, sizeName); if (!s) return "";
    const st = Number(s.stock) || 0, c = critical(p);
    if (st <= 0) return `<span class="size-soldnote">${esc(sizeName)} bedeni tükendi.</span>`;
    if (st <= c) return `<span class="size-flame"><i>🔥</i>${esc(sizeName)} bedeninden son ${st} adet!</span>`;
    return "";
  }

  /* ---------- sepet & favoriler ---------- */
  function cartLineStock(p, sizeName) { const s = sizeOf(p, sizeName); return s ? Number(s.stock) || 0 : 0; }
  function addToCart(id, sizeName, qty = 1) {
    const p = state.products.find(x => x.id === id); if (!p) return;
    if (!sizeName) { toast("Lütfen bir beden seçin", false); return; }
    const stock = cartLineStock(p, sizeName);
    if (stock <= 0) { toast(`${sizeName} bedeni tükendi`, false); return; }
    const line = state.cart.find(x => x.id === id && x.size === sizeName);
    const already = line ? line.quantity : 0;
    if (already + qty > stock) { toast(`${sizeName} bedeninden en fazla ${stock} adet ekleyebilirsin`, false); return; }
    if (line) line.quantity += qty; else state.cart.push({ id, size: sizeName, quantity: qty });
    persist(); renderHeader(); renderCart();
    const cb = $("#cartButton"); if (cb) { cb.classList.remove("pop"); void cb.offsetWidth; cb.classList.add("pop"); setTimeout(() => cb.classList.remove("pop"), 520); }
    toast(`${p.name} (${sizeName}) sepete eklendi`);
  }
  function lineUnitPrice(l) {
    if (l.bundle) { const b = getBundle(l.bundleId); return b ? bundlePrice(b) : 0; }
    const p = state.products.find(x => x.id === l.id); return p ? p.price : 0;
  }
  function lineFullPrice(l) {
    if (l.bundle) { const b = getBundle(l.bundleId); return b ? bundleGross(b) : 0; }
    return lineUnitPrice(l);
  }
  function cartGross() { return state.cart.reduce((s, l) => s + lineUnitPrice(l) * l.quantity, 0); }
  function cartFull() { return state.cart.reduce((s, l) => s + lineFullPrice(l) * l.quantity, 0); }
  function cartTotals() {
    const full = cartFull(), gross = cartGross();
    const bundleSavings = full - gross;
    const discount = couponDiscount(gross);
    return { full, bundleSavings, gross, discount, total: Math.max(0, gross - discount) };
  }
  function bundleLineMax(l) {
    const b = getBundle(l.bundleId); if (!b) return 0;
    return Math.min(...bundleMembers(b).map(p => { const sz = (l.sizes || {})[p.id]; const s = sz && sizeOf(p, sz); return s ? Number(s.stock) || 0 : 0; }));
  }
  function cartLineHtml(l, i) {
    if (l.bundle) {
      const b = getBundle(l.bundleId); if (!b) return "";
      const pieces = bundleMembers(b).map(p => `<span class="bundle-piece">${esc(p.name)} <b>[${esc((l.sizes || {})[p.id] || "?")}]</b></span>`).join("");
      return `<article class="cart-line bundle-line">
        <div class="line-art bundle-art" style="--tone:${esc(b.tone || "#e8e2d6")}">${foxMark}</div>
        <div><small>KOMBİN · ${bundleMembers(b).length} PARÇA</small><h4>${esc(b.name)}</h4>
        <div class="bundle-pieces">${pieces}</div>
        <b>${money(bundlePrice(b))} <del style="font-weight:600;color:var(--muted);font-size:11px">${money(bundleGross(b))}</del></b>
        <div class="qty"><button data-line-qty="${i}" data-delta="-1">−</button><span>${l.quantity}</span><button data-line-qty="${i}" data-delta="1">+</button></div></div>
        <button class="remove" data-line-remove="${i}">×</button></article>`;
    }
    const p = state.products.find(x => x.id === l.id); if (!p) return "";
    return `<article class="cart-line">
      <div class="line-art" style="--tone:${esc(p.tone || "#e8e2d6")}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : hangerSvg}</div>
      <div><small>${esc(p.brand || "")}</small><h4>${esc(p.name)}<span class="variant-tag">${esc(l.size)}</span></h4><b>${money(p.price)}</b>
      <div class="qty"><button data-line-qty="${i}" data-delta="-1">−</button><span>${l.quantity}</span><button data-line-qty="${i}" data-delta="1">+</button></div></div>
      <button class="remove" data-line-remove="${i}">×</button></article>`;
  }
  function renderCart() {
    const valid = l => l.bundle ? getBundle(l.bundleId) : state.products.find(p => p.id === l.id);
    const hasItems = state.cart.some(valid);
    $("#cartLines").innerHTML = hasItems ? state.cart.map((l, i) => cartLineHtml(l, i)).join("") : `<div class="empty"><b>Sepetin henüz boş.</b><p>Sana iyi gelecek parçaları keşfet.</p></div>`;
    const t = cartTotals(), threshold = Number(state.settings.shippingThreshold) || 0;
    const remaining = Math.max(0, threshold - t.total), freeShip = threshold > 0 && !remaining, pct = threshold ? Math.min(100, t.total / threshold * 100) : 0;
    $("#cartSummary").innerHTML = hasItems ? `
      ${threshold ? `<p style="font-size:11.5px">${freeShip ? "Ücretsiz kargoyu kazandın! 🎉" : `Ücretsiz kargo için <b>${money(remaining)}</b> kaldı.`}</p><div class="progress"><i style="width:${freeShip ? 100 : pct}%"></i></div>` : ""}
      <div class="coupon-row">${state.coupon ? `<span class="coupon-chip">🏷 ${esc(state.coupon.code)}<button data-remove-coupon aria-label="Kuponu kaldır">×</button></span>` : `<input id="couponInput" placeholder="Kupon kodu" autocomplete="off"><button class="button outline" id="applyCoupon">Uygula</button>`}</div>
      <div class="summary-row"><span>Ara toplam</span><b>${money(t.full)}</b></div>
      ${t.bundleSavings ? `<div class="summary-row discount"><span>🦊 Kombin indirimi</span><b>−${money(t.bundleSavings)}</b></div>` : ""}
      ${t.discount ? `<div class="summary-row discount"><span>Kupon indirimi</span><b>−${money(t.discount)}</b></div>` : ""}
      <div class="summary-row"><span>Kargo</span><b>${freeShip ? "Ücretsiz" : "Ödeme adımında"}</b></div>
      <div class="summary-row total"><span>Toplam</span><b>${money(t.total)}</b></div>
      <button class="button dark full" id="checkoutButton">Siparişi tamamla →</button>` : "";
  }
  async function applyCoupon() {
    const input = $("#couponInput");
    const code = (input?.value || "").trim().toUpperCase();
    if (!code) { toast("Kupon kodu girin", false); return; }
    let result;
    if (state.apiOnline) {
      try { result = await api("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code, total: cartGross() }) }); }
      catch (err) { toast(err.message, false); return; }
    } else {
      result = validateCouponLocal(code, cartGross());
      if (result.error) { toast(result.error, false); return; }
    }
    state.coupon = { code: result.coupon.code, type: result.coupon.type, value: result.coupon.value, minTotal: result.coupon.minTotal || 0 };
    persist(); renderCart();
    toast(`${result.coupon.code} kuponu uygulandı`);
  }
  function renderFavorites() {
    const list = state.products.filter(p => state.favorites.includes(p.id));
    $("#favoriteLines").innerHTML = list.length ? list.map(p => `<article class="favorite-line">
      <div class="line-art" style="--tone:${esc(p.tone || "#e8e2d6")}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : hangerSvg}</div>
      <div><small>${esc(p.brand || "")}</small><h4>${esc(p.name)}</h4><b>${money(p.price)}</b></div>
      <button class="button dark" data-product="${p.id}">İncele</button></article>`).join("") : `<div class="empty">Favori listen henüz boş.</div>`;
  }

  /* ---------- arama ---------- */
  function openSearch() { openLayer($("#searchModal")); setTimeout(() => $("#searchInput").focus(), 80); renderSearch(""); }
  function renderSearch(q) {
    const term = q.toLocaleLowerCase("tr");
    const list = state.products.filter(p => p.active !== false).filter(p => !term || `${p.name} ${p.brand} ${p.sku} ${p.category}`.toLocaleLowerCase("tr").includes(term)).slice(0, 12);
    $("#searchResults").className = "search-results";
    $("#searchResults").innerHTML = list.length ? list.map(p => `<button class="mini-result" data-product="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.brand || "")} · ${money(p.price)}${isSoldOut(p) ? " · Tükendi" : ""}</small><span class="mini-sku">${esc(p.sku)}</span></button>`).join("") : `<div class="empty">Sonuç bulunamadı.</div>`;
  }

  /* ---------- sipariş ---------- */
  let checkoutData = {};
  const makeOrderNo = () => `VLP-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  function transferInfoHtml() {
    const s = state.settings; if (!s.iban) return "";
    return `<div class="notice"><b>Havale bilgileri</b><br>${esc(s.bankName || "Banka")} · ${esc(s.accountHolder || "")}<br><code>${esc(s.iban)}</code><br><small>Açıklamaya sipariş numaranı yazmayı unutma.</small></div>`;
  }
  function checkout(step = 1, form = {}) {
    const t = cartTotals();
    if (step < 3 && !t.gross) { toast("Sepetin boş", false); return; }
    const content = $("#checkoutContent");
    if (step === 1) content.innerHTML = `<button class="round-close modal-close" data-close>×</button><span class="eyebrow">SİPARİŞ</span><h2>Teslimat bilgileri</h2><div class="checkout-steps"><i class="active"></i><i></i><i></i></div>
      <form id="addressForm" class="form-grid">
        <label class="field">Ad<input name="firstName" required value="${esc(form.firstName || "")}"></label>
        <label class="field">Soyad<input name="lastName" required value="${esc(form.lastName || "")}"></label>
        <label class="field full">E-posta<input name="email" type="email" required value="${esc(form.email || "")}"></label>
        <label class="field">Telefon<input name="phone" required value="${esc(form.phone || "")}"></label>
        <label class="field">Şehir<input name="city" required value="${esc(form.city || "")}"></label>
        <label class="field full">Adres<textarea name="address" required rows="3">${esc(form.address || "")}</textarea></label>
        <label class="field full consent-row"><input name="consent" type="checkbox" required><span><button type="button" class="inline-link" data-page="distance">Mesafeli satış sözleşmesini</button> ve <button type="button" class="inline-link" data-page="kvkk">KVKK aydınlatma metnini</button> okudum, kabul ediyorum.</span></label>
        <div class="field full"><button class="button dark full" type="submit">Ödemeye devam et →</button></div>
      </form>`;
    else if (step === 2) {
      const cardAvailable = state.apiOnline && (state.pos?.configured || state.pos?.testMode);
      const installments = Array.isArray(state.settings.installments) && state.settings.installments.length ? ` · ${state.settings.installments.join(", ")} taksit` : "";
      content.innerHTML = `<button class="round-close modal-close" data-close>×</button><span class="eyebrow">SİPARİŞ</span><h2>Ödeme yöntemi</h2><div class="checkout-steps"><i class="active"></i><i class="active"></i><i></i></div>
      <div class="payment-options">
        ${state.pos?.testMode && cardAvailable ? `<div class="notice"><b>POS test modu açık.</b> Yönetici canlı POS bilgilerini girene kadar karttan tahsilat yapılmaz; kartla verilen sipariş "ödeme bekleniyor" olarak kaydedilir.</div>` : ""}
        ${cardAvailable ? `<label><input type="radio" name="payment" value="card" checked> Kredi / Banka kartı<small>3D Secure güvenli ödeme · ${esc(state.pos?.provider === "paytr" ? "PayTR" : "iyzico")}${installments}</small></label>` : ""}
        ${state.settings.bankTransfer ? `<label><input type="radio" name="payment" value="transfer" ${!cardAvailable ? "checked" : ""}> Havale / EFT<small>Sipariş sonrası hesap bilgileri görüntülenir</small></label>` : ""}
        ${state.settings.cashOnDelivery ? `<label><input type="radio" name="payment" value="cod" ${!cardAvailable && !state.settings.bankTransfer ? "checked" : ""}> Kapıda ödeme<small>Teslimatta nakit veya kartla ödeme</small></label>` : ""}
      </div>
      <div class="summary-row"><span>Ara toplam</span><b>${money(t.gross)}</b></div>
      ${t.discount ? `<div class="summary-row discount"><span>Kupon (${esc(state.coupon.code)})</span><b>−${money(t.discount)}</b></div>` : ""}
      <div class="summary-row total"><span>Ödenecek</span><b>${money(t.total)}</b></div>
      <div class="checkout-actions"><button class="link-button" id="checkoutBack">← Geri</button><button class="button dark" id="placeOrder">Siparişi oluştur →</button></div>`;
    }
    else content.innerHTML = `<button class="round-close modal-close" data-close>×</button><span class="eyebrow">SİPARİŞİN ALINDI</span><h2>Teşekkürler, ${esc(form.firstName)}.</h2>
      <p>Sipariş numaran <b>${esc(form.orderNo)}</b>. Durum güncellemeleri ${esc(form.email)} adresine gönderilecek.</p>
      <div class="notice">${esc(form.paymentNote || "Sipariş hazırlık sırasına alındı.")}</div>
      ${form.payment === "transfer" ? transferInfoHtml() : ""}
      <button class="button dark full" data-close style="margin-top:20px">Alışverişe dön</button>`;
    if (!$("#checkoutModal").classList.contains("show")) openLayer($("#checkoutModal"));
    if (step === 1) $("#addressForm").onsubmit = e => { e.preventDefault(); checkoutData = Object.fromEntries(new FormData(e.target)); checkout(2, checkoutData); };
  }
  function expandCartItems() {
    const items = [];
    state.cart.forEach(l => {
      if (l.bundle) { const b = getBundle(l.bundleId); if (!b) return; bundleMembers(b).forEach(p => items.push({ id: p.id, size: (l.sizes || {})[p.id], quantity: l.quantity, bundleId: b.id })); }
      else items.push({ id: l.id, size: l.size, quantity: l.quantity });
    });
    return items;
  }
  async function finalizeOrder() {
    const form = checkoutData, payment = $("input[name=payment]:checked")?.value || "transfer";
    if (!form.email || !state.cart.length) { toast("Sipariş bilgileri eksik", false); return; }
    const t = cartTotals();
    const order = { id: uid("ord"), orderNo: makeOrderNo(), customer: form, items: expandCartItems(), total: t.total, discount: t.discount, coupon: state.coupon?.code || null, status: "new", paymentStatus: "awaiting", payment, createdAt: new Date().toISOString() };
    let checkoutToken = "";
    if (state.apiOnline) {
      try {
        const result = await api("/api/orders", { method: "POST", body: JSON.stringify(order) });
        Object.assign(order, result.order || {});
        checkoutToken = String(order.checkoutToken || "");
        delete order.checkoutToken;
      }
      catch (e) { toast(e.message, false); return; }
    } else if (order.coupon) {
      const c = state.coupons.find(x => x.code === order.coupon);
      if (c) c.usedCount = (c.usedCount || 0) + 1;
    }
    order.items.forEach(l => { const p = state.products.find(x => x.id === l.id); const s = p && sizeOf(p, l.size); if (s) s.stock = Math.max(0, (Number(s.stock) || 0) - l.quantity); });
    state.orders.unshift(order);
    state.cart = []; state.coupon = null;
    persist(); renderHeader(); renderProducts(); renderCart();
    const done = note => checkout(3, { ...form, orderNo: order.orderNo, payment, paymentNote: note });
    if (payment === "card" && state.apiOnline) {
      if (state.pos?.testMode) { done("POS test modu açık: karttan tahsilat yapılmadı, sipariş ödeme bekleniyor olarak kaydedildi."); bootstrapData(); return; }
      try {
        const pay = await api("/api/payments/init", { method: "POST", body: JSON.stringify({ orderId: order.id, checkoutToken }) });
        if (pay.paymentPageUrl) { showPaymentRedirect(pay.paymentPageUrl); return; }
        if (pay.iframeUrl) { showPaymentFrame(pay.iframeUrl); return; }
        if (pay.mode === "test") { done("POS test modu açık: karttan tahsilat yapılmadı, sipariş ödeme bekleniyor olarak kaydedildi."); }
        else done("Sipariş alındı; ödeme bağlantısı e-posta ile iletilecek.");
      } catch (err) { done(`Sipariş kaydedildi ancak ödeme başlatılamadı: ${err.message}. Mağaza sizinle iletişime geçecek.`); }
      bootstrapData();
      return;
    }
    const note = payment === "transfer" ? "Havale/EFT bekleniyor; ödeme onaylanınca sipariş hazırlığa alınır." : "Sipariş hazırlık sırasına alındı, teslimatta ödeyeceksiniz.";
    done(note);
    if (state.apiOnline) bootstrapData();
  }
  function showPaymentRedirect(url) {
    $("#checkoutContent").innerHTML = `<span class="eyebrow">GÜVENLİ ÖDEME</span><h2>Bankaya yönlendiriliyorsun…</h2><p>3D Secure doğrulaması için güvenli ödeme sayfasına aktarılıyorsun. Otomatik yönlendirme olmazsa aşağıdaki düğmeyi kullan.</p><a class="button dark full" href="${esc(url)}" style="margin-top:16px;text-align:center">Ödeme sayfasını aç →</a>`;
    setTimeout(() => { window.location.href = url; }, 1200);
  }
  function showPaymentFrame(url) {
    $("#checkoutContent").innerHTML = `<button class="round-close modal-close" data-close>×</button><span class="eyebrow">GÜVENLİ ÖDEME</span><h2>Kart bilgileri</h2><p>Ödeme, PayTR güvenli sayfasında tamamlanır; kart bilgilerin mağazamıza iletilmez.</p><iframe class="payment-frame" src="${esc(url)}" allow="payment"></iframe>`;
  }
  function handlePaymentReturn() {
    const params = new URLSearchParams(location.search);
    const result = params.get("payment"); if (!result) return;
    const orderNo = params.get("order") || "";
    history.replaceState(null, "", location.pathname);
    $("#pageContent").innerHTML = `<button class="round-close modal-close" data-close>×</button><span class="eyebrow">${result === "success" ? "ÖDEME TAMAMLANDI" : "ÖDEME BAŞARISIZ"}</span><h2>${result === "success" ? "Teşekkürler!" : "Ödeme tamamlanamadı"}</h2><p>${result === "success" ? `<b>${esc(orderNo)}</b> numaralı siparişinin ödemesi bankadan onaylandı. Siparişin hazırlık sürecine alındı.` : `<b>${esc(orderNo)}</b> numaralı sipariş için ödeme doğrulanamadı. Kartını kontrol edip tekrar deneyebilir veya destek ekibimize ulaşabilirsin.`}</p>`;
    openLayer($("#pageModal"));
    toast(result === "success" ? "Ödeme onaylandı" : "Ödeme başarısız", result === "success");
  }

  /* ---------- bilgi sayfaları ---------- */
  function showPage(key) {
    const p = pageContent(key);
    let body = p.body;
    if (key === "contact") body = `<p>Ürün, sipariş ve beden danışmanlığı için bize ulaşabilirsiniz.</p><ul><li>E-posta: ${esc(state.settings.supportEmail || "")}</li><li>Telefon: ${esc(state.settings.supportPhone || "")}</li><li>Çalışma saatleri: Hafta içi 09.00–18.00</li></ul>${body}`;
    $("#pageContent").innerHTML = `<button class="round-close modal-close" data-close>×</button><span class="eyebrow">VOLPARIA</span><h2>${esc(p.title)}</h2>${body || "<p>Bu içerik hazırlanıyor.</p>"}`;
    openLayer($("#pageModal"));
  }

  /* ---------- çerez bildirimi ---------- */
  function initCookieBanner() {
    const banner = $("#cookieBanner"); if (!banner) return;
    const saved = localStorage.getItem("volparia_consent");
    if (!saved) banner.hidden = false;
    const decide = level => { localStorage.setItem("volparia_consent", JSON.stringify({ level, date: new Date().toISOString() })); banner.hidden = true; };
    $("#cookieAccept").addEventListener("click", () => decide("all"));
    $("#cookieEssential").addEventListener("click", () => decide("essential"));
  }

  /* ---------- stok gelince haber ver (izleme listesi) ---------- */
  function toggleWatch(productId, size) {
    const i = state.watchlist.findIndex(w => w.productId === productId && w.size === size);
    if (i >= 0) { state.watchlist.splice(i, 1); persist(); toast("Haber listesinden çıkarıldı"); return false; }
    state.watchlist.push({ productId, size, addedAt: Date.now() }); persist();
    toast("🔔 Stok gelince sana haber vereceğiz");
    return true;
  }
  function checkWatchlist() {
    if (!state.watchlist.length) return;
    const back = [];
    state.watchlist = state.watchlist.filter(w => {
      const p = state.products.find(x => x.id === w.productId); if (!p) return false;
      const s = sizeOf(p, w.size);
      if (s && (Number(s.stock) || 0) > 0) { back.push({ product: p, size: w.size }); return false; }
      return true;
    });
    if (back.length) { persist(); showRestockNotice(back); }
  }
  function showRestockNotice(items) {
    const host = $("#restockNotice"); if (!host) return;
    host.querySelector(".restock-body").innerHTML = items.map(it => `<button class="restock-item" data-product="${it.product.id}"><div class="line-art" style="--tone:${esc(it.product.tone || "#e8e2d6")}">${it.product.imageUrl ? `<img src="${esc(it.product.imageUrl)}" alt="">` : hangerSvg}</div><div><b>${esc(it.product.name)}</b><small>${esc(it.size)} bedeni yeniden stokta · ${money(it.product.price)}</small></div><span>→</span></button>`).join("");
    host.hidden = false;
    requestAnimationFrame(() => host.classList.add("show"));
  }
  function closeRestock() { const host = $("#restockNotice"); if (!host) return; host.classList.remove("show"); setTimeout(() => host.hidden = true, 350); }

  /* ---------- tilki intro ekranı ---------- */
  function initIntro() {
    const el = $("#introScreen"); if (!el) return;
    if (!document.documentElement.classList.contains("intro-pending")) { el.remove(); return; }
    let closed = false;
    const done = () => { if (closed) return; closed = true; el.classList.add("done"); document.documentElement.classList.remove("intro-pending"); setTimeout(() => el.remove(), 750); };
    el.addEventListener("click", done);
    setTimeout(done, 2900);
  }

  /* ---------- olaylar ---------- */
  let logoClicks = 0, logoTimer;
  document.addEventListener("click", e => {
    const closest = sel => e.target.closest(sel);
    let el;

    if (closest("[data-close]") || e.target === $("#overlay")) { closeLayers(); return; }

    if (closest("#secretLogo")) {
      if (!isHome) { location.href = "index.html"; return; }
      logoClicks++; clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { logoClicks = 0; }, 1800);
      if (logoClicks >= 5) { logoClicks = 0; location.href = "admin.html"; }
      else if (logoClicks === 1) { state.activeGender = ""; state.activeFilter = "all"; state.activeCategory = ""; state.search = ""; renderProducts(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }

    if (closest("#megaTrigger")) { if (window.innerWidth <= 720) location.href = "kategori.html"; else toggleMega(); return; }
    if (megaOpen && !closest("#megaMenu") && !closest("#categoryNav")) closeMega();
    if ((el = closest("[data-mega-gender]"))) { location.href = `kategori.html?cinsiyet=${el.dataset.megaGender}`; return; }
    if ((el = closest("[data-mega-link]"))) { location.href = `kategori.html?filtre=${el.dataset.megaLink}`; return; }

    /* kategori sayfası filtreleri */
    if ((el = closest("[data-cat-gender]"))) { catState.gender = el.dataset.catGender; catState.sizes.clear(); updateCatUrl(); renderCategoryPage(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if ((el = closest("[data-cat-cat]"))) { catState.category = el.dataset.catCat; updateCatUrl(); renderCategoryPage(); return; }
    if ((el = closest("[data-cat-size]"))) { const s = el.dataset.catSize; catState.sizes.has(s) ? catState.sizes.delete(s) : catState.sizes.add(s); renderCatSidebar(); renderCatGrid(); return; }
    if ((el = closest("[data-cat-clear]"))) { catState.category = ""; catState.filter = ""; catState.sizes.clear(); catState.inStock = false; updateCatUrl(); renderCategoryPage(); return; }
    if ((el = closest("[data-chip-remove]"))) {
      const t = el.dataset.chipRemove;
      if (t === "kategori") catState.category = "";
      else if (t === "filtre") catState.filter = "";
      else if (t === "stok") catState.inStock = false;
      else if (t === "beden") catState.sizes.delete(el.dataset.chipVal);
      updateCatUrl(); renderCategoryPage(); return;
    }
    if (closest("[data-cat-filter-close]")) { closeLayers(); return; }
    if (closest("#filterToggle")) { openLayer($("#catSidebar")); return; }

    if (closest("#mobileMenu")) { renderMobileMenu(); openLayer($("#mobileDrawer")); return; }
    if (closest("#searchTrigger") || closest("#searchMobile")) { openSearch(); return; }
    if (closest("#favoritesButton")) { renderFavorites(); openLayer($("#favoriteDrawer")); return; }
    if (closest("#cartButton")) { renderCart(); openLayer($("#cartDrawer")); return; }
    if (closest("#checkoutButton")) { checkout(1, checkoutData); return; }
    if (closest("#checkoutBack")) { checkout(1, checkoutData); return; }
    if (closest("#placeOrder")) { finalizeOrder(); return; }
    if (closest("#applyCoupon")) { applyCoupon(); return; }
    if (closest("[data-remove-coupon]")) { state.coupon = null; persist(); renderCart(); return; }

    if ((el = closest("[data-gender-card]"))) { location.href = `kategori.html?cinsiyet=${el.dataset.genderCard}`; return; }
    if ((el = closest("[data-filter-link]"))) { state.activeFilter = el.dataset.filterLink; state.activeGender = ""; $$(".product-tabs button").forEach(b => b.classList.toggle("active", b.dataset.filter === state.activeFilter)); renderProducts(); return; }
    if ((el = closest("[data-category-chip]")) ) { state.activeCategory = el.dataset.categoryChip; renderProducts(); return; }
    if ((el = closest("[data-show-all]"))) { state.activeGender = ""; state.activeCategory = ""; state.activeFilter = "all"; renderProducts(); $("#products").scrollIntoView({ behavior: "smooth" }); return; }
    if ((el = closest(".product-tabs button"))) { state.activeFilter = el.dataset.filter; $$(".product-tabs button").forEach(b => b.classList.toggle("active", b === el)); renderProducts(); return; }
    if ((el = closest("[data-favorite]"))) { const id = el.dataset.favorite; const i = state.favorites.indexOf(id); i >= 0 ? state.favorites.splice(i, 1) : state.favorites.push(id); persist(); renderHeader(); renderProducts(); renderFavorites(); return; }
    if ((el = closest("[data-page]"))) { showPage(el.dataset.page); return; }
    if (closest("[data-restock-close]")) { closeRestock(); return; }
    if ((el = closest(".restock-item"))) { closeRestock(); openProduct(el.dataset.product); return; }
    if ((el = closest("[data-bundle]"))) { openBundle(el.dataset.bundle); return; }
    if ((el = closest("[data-bundle-size]"))) { bundleSizes[el.dataset.bundleSize] = el.dataset.size; renderBundleDetail(getBundle($("#bundleAdd")?.dataset.bundleAdd)); return; }
    if ((el = closest("[data-bundle-add]"))) { addBundleToCart(el.dataset.bundleAdd); return; }
    if ((el = closest("[data-watch]"))) { const on = toggleWatch(el.dataset.watch, el.dataset.watchSize); el.classList.toggle("watching", on); el.textContent = el.dataset.watchSize + (on ? " ✓" : ""); return; }
    if ((el = closest("[data-product]"))) { openProduct(el.dataset.product); return; }

    if ((el = closest("[data-size-pick]"))) {
      detailSize = el.dataset.sizePick;
      $$(".size-option").forEach(b => b.classList.toggle("active", b === el));
      const id = $("#detailAdd")?.dataset.addToCart;
      const p = state.products.find(x => x.id === id);
      if (p) { $("#sizeStockNote").innerHTML = sizeNoteHtml(p, detailSize); $("#detailAdd").disabled = false; detailQty = 1; $("#detailQtyValue").textContent = "1"; }
      return;
    }
    if ((el = closest("[data-detail-qty]"))) {
      const id = $("#detailAdd")?.dataset.addToCart;
      const p = state.products.find(x => x.id === id);
      const max = p && detailSize ? cartLineStock(p, detailSize) : 99;
      detailQty = Math.min(Math.max(1, detailQty + Number(el.dataset.detailQty)), Math.max(1, max));
      $("#detailQtyValue").textContent = detailQty;
      return;
    }
    if ((el = closest("[data-add-to-cart]"))) { addToCart(el.dataset.addToCart, detailSize, detailQty); openLayer($("#cartDrawer")); return; }

    if ((el = closest("[data-line-qty]"))) {
      const idx = Number(el.dataset.lineQty), line = state.cart[idx]; if (!line) return;
      const max = line.bundle ? bundleLineMax(line) : (() => { const p = state.products.find(x => x.id === line.id); return p ? cartLineStock(p, line.size) : 99; })();
      line.quantity += Number(el.dataset.delta);
      if (line.quantity > max) { line.quantity = max; toast(`Stok nedeniyle en fazla ${max} adet`, false); }
      if (line.quantity <= 0) state.cart.splice(idx, 1);
      persist(); renderHeader(); renderCart(); return;
    }
    if ((el = closest("[data-line-remove]"))) { state.cart.splice(Number(el.dataset.lineRemove), 1); persist(); renderHeader(); renderCart(); return; }
  });

  document.addEventListener("change", e => {
    if (e.target.id === "productSort") renderProducts();
    if (e.target.id === "catSort") { catState.sort = e.target.value; renderCatGrid(); }
    if (e.target.id === "catInStock") { catState.inStock = e.target.checked; renderCatSidebar(); renderCatGrid(); }
  });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    if (e.key === "Escape") { closeLayers(); closeMega(); $("#catSidebar")?.classList.remove("show"); }
  });
  $("#searchInput")?.addEventListener("input", e => renderSearch(e.target.value));

  $("#newsletterForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#newsletterEmail").value.trim().toLowerCase();
    if (state.apiOnline) { try { await api("/api/newsletter", { method: "POST", body: JSON.stringify({ email }) }); } catch { } }
    if (!state.subscribers.some(s => s.email === email)) { state.subscribers.unshift({ email, date: new Date().toISOString() }); persist(); }
    e.target.reset();
    toast("Bültene kaydoldun, hoş geldin!");
  });

  if (isCategoryPage) window.addEventListener("popstate", () => {
    const p = new URLSearchParams(location.search);
    const g = p.get("cinsiyet") || "", c = p.get("kategori") || "", f = p.get("filtre") || "", q = p.get("ara") || "", k = p.get("kombin") === "1";
    // Sadece bir katman kapandıysa (URL parametreleri değişmediyse) yeniden çizme.
    if (g === catState.gender && c === catState.category && f === catState.filter && q === catState.q && k === catState.kombin) return;
    catState.gender = g; catState.category = c; catState.filter = f; catState.q = q; catState.kombin = k;
    renderCategoryPage();
  });

  if (location.hash === "#yonetim") location.href = "admin.html";

  /* ---------- animasyonlar ---------- */
  function initReveal() {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    const sel = ".trust article,#genders .section-head,.gender-card,.products-section .section-head,.statement-inner,.newsletter-inner,.assurance-item,.cat-head,.cat-sidebar";
    $$(sel).forEach((el, i) => {
      // Ekranda hâlihazırda görünen öğeleri olduğu gibi bırak (titreme olmasın); yalnızca alttakileri canlandır.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
      el.classList.add("reveal");
      el.style.setProperty("--rd", (i % 5) * 0.07 + "s");
      io.observe(el);
    });
  }
  function initHeaderScroll() {
    const h = $(".site-header"); if (!h) return;
    const onScroll = () => h.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- başlangıç ---------- */
  initIntro();
  renderAll();
  initMegaMenu();
  if (isCategoryPage) { updateCatUrl(true); const sortSel = $("#catSort"); if (sortSel) sortSel.value = catState.sort; }
  initReveal();
  initHeaderScroll();
  setStorageIndicator(false);
  initCookieBanner();
  handlePaymentReturn();
  bootstrapData(false);
  startSync();
})();
