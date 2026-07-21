/* VOLPARIA — vitrin (storefront) */
(() => {
  "use strict";

  /* tilki logosunu yerleştir */
  $$("[data-fox]").forEach(el => { el.innerHTML = foxMark; });

  /* ---------- render ---------- */
  function renderGenders() {
    const tones = { kadin: ["#ead9d3", "#d9c2b8"], erkek: ["#d9dee2", "#bcc7cd"], unisex: ["#e6e0d2", "#cfc5ae"], cocuk: ["#dbe7e0", "#bcd3c6"] };
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
  function productCard(p) {
    const fav = state.favorites.includes(p.id);
    const out = isSoldOut(p), low = isLowStock(p), t = totalStock(p), r = ratingInfo(p);
    return `<article class="product-card ${out ? "soldout" : ""}">
      <button class="product-art" data-product="${p.id}" style="--tone:${esc(p.tone || "#e8e2d6")}" aria-label="${esc(p.name)} detayını aç">
        ${p.badge ? `<span class="badge ${(p.tags || []).includes("sale") ? "sale" : ""}">${esc(p.badge)}</span>` : ""}
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
  function renderSocial() {
    const host = $("#footerSocial"); if (!host) return;
    const s = state.settings;
    const links = [["instagram", s.instagram], ["tiktok", s.tiktok], ["twitter", s.twitter], ["whatsapp", s.whatsapp ? `https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}` : ""]].filter(([, url]) => url);
    host.innerHTML = links.map(([key, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${key}">${ICONS[key]}</a>`).join("");
  }
  function renderHeader() {
    $("#cartCount").textContent = state.cart.reduce((s, l) => s + l.quantity, 0);
    $("#favoriteCount").textContent = state.favorites.length;
    $("#announcement").textContent = state.settings.announcement;
    $("#heroEyebrow").textContent = state.settings.heroEyebrow;
    const [a, b] = String(state.settings.heroTitle || "").split("|");
    $("#heroTitle").innerHTML = `${esc(a || "")}<em>${esc(b || "")}</em>`;
    $("#heroCopy").textContent = state.settings.heroCopy;
    $("#footerContact").textContent = [state.settings.supportEmail, state.settings.supportPhone].filter(Boolean).join(" · ");
    document.title = state.settings.seoTitle || defaultSettings.seoTitle;
    $('meta[name="description"]')?.setAttribute("content", state.settings.seoDescription || defaultSettings.seoDescription);
  }
  function renderAll() { renderHeader(); renderGenders(); renderProducts(); renderCart(); renderFavorites(); renderSocial(); }
  window.onDataRefresh = renderAll;

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
    toast(`${p.name} (${sizeName}) sepete eklendi`);
  }
  function cartGross() { return state.cart.reduce((sum, l) => { const p = state.products.find(x => x.id === l.id); return sum + (p ? p.price * l.quantity : 0); }, 0); }
  function cartTotals() {
    const gross = cartGross();
    const discount = couponDiscount(gross);
    return { gross, discount, total: Math.max(0, gross - discount) };
  }
  function renderCart() {
    const lines = state.cart.map((l, i) => ({ ...l, index: i, product: state.products.find(p => p.id === l.id) })).filter(l => l.product);
    $("#cartLines").innerHTML = lines.length ? lines.map(l => `<article class="cart-line">
      <div class="line-art" style="--tone:${esc(l.product.tone || "#e8e2d6")}">${l.product.imageUrl ? `<img src="${esc(l.product.imageUrl)}" alt="">` : hangerSvg}</div>
      <div><small>${esc(l.product.brand || "")}</small><h4>${esc(l.product.name)}<span class="variant-tag">${esc(l.size)}</span></h4><b>${money(l.product.price)}</b>
      <div class="qty"><button data-line-qty="${l.index}" data-delta="-1">−</button><span>${l.quantity}</span><button data-line-qty="${l.index}" data-delta="1">+</button></div></div>
      <button class="remove" data-line-remove="${l.index}">×</button></article>`).join("") : `<div class="empty"><b>Sepetin henüz boş.</b><p>Sana iyi gelecek parçaları keşfet.</p></div>`;
    const t = cartTotals(), threshold = Number(state.settings.shippingThreshold) || 0;
    const remaining = Math.max(0, threshold - t.total), freeShip = threshold > 0 && !remaining, pct = threshold ? Math.min(100, t.total / threshold * 100) : 0;
    $("#cartSummary").innerHTML = lines.length ? `
      ${threshold ? `<p style="font-size:11.5px">${freeShip ? "Ücretsiz kargoyu kazandın! 🎉" : `Ücretsiz kargo için <b>${money(remaining)}</b> kaldı.`}</p><div class="progress"><i style="width:${freeShip ? 100 : pct}%"></i></div>` : ""}
      <div class="coupon-row">${state.coupon ? `<span class="coupon-chip">🏷 ${esc(state.coupon.code)}<button data-remove-coupon aria-label="Kuponu kaldır">×</button></span>` : `<input id="couponInput" placeholder="Kupon kodu" autocomplete="off"><button class="button outline" id="applyCoupon">Uygula</button>`}</div>
      <div class="summary-row"><span>Ara toplam</span><b>${money(t.gross)}</b></div>
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
  async function finalizeOrder() {
    const form = checkoutData, payment = $("input[name=payment]:checked")?.value || "transfer";
    if (!form.email || !state.cart.length) { toast("Sipariş bilgileri eksik", false); return; }
    const t = cartTotals();
    const order = { id: uid("ord"), orderNo: makeOrderNo(), customer: form, items: state.cart.map(x => ({ id: x.id, size: x.size, quantity: x.quantity })), total: t.total, discount: t.discount, coupon: state.coupon?.code || null, status: "new", paymentStatus: "awaiting", payment, createdAt: new Date().toISOString() };
    if (state.apiOnline) {
      try { const result = await api("/api/orders", { method: "POST", body: JSON.stringify(order) }); Object.assign(order, result.order || {}); }
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
        const pay = await api("/api/payments/init", { method: "POST", body: JSON.stringify({ orderId: order.id }) });
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
    const banner = $("#cookieBanner");
    const saved = localStorage.getItem("volparia_consent");
    if (!saved) banner.hidden = false;
    const decide = level => { localStorage.setItem("volparia_consent", JSON.stringify({ level, date: new Date().toISOString() })); banner.hidden = true; };
    $("#cookieAccept").addEventListener("click", () => decide("all"));
    $("#cookieEssential").addEventListener("click", () => decide("essential"));
  }

  /* ---------- olaylar ---------- */
  let logoClicks = 0, logoTimer;
  document.addEventListener("click", e => {
    const closest = sel => e.target.closest(sel);
    let el;

    if (closest("[data-close]") || e.target === $("#overlay")) { closeLayers(); return; }

    if (closest("#secretLogo")) {
      logoClicks++; clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { logoClicks = 0; }, 1800);
      if (logoClicks >= 5) { logoClicks = 0; location.href = "admin.html"; }
      else if (logoClicks === 1) { state.activeGender = ""; state.activeFilter = "all"; state.activeCategory = ""; state.search = ""; renderProducts(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }

    if (closest("#searchTrigger") || closest("#searchMobile")) { openSearch(); return; }
    if (closest("#favoritesButton")) { renderFavorites(); openLayer($("#favoriteDrawer")); return; }
    if (closest("#cartButton")) { renderCart(); openLayer($("#cartDrawer")); return; }
    if (closest("#checkoutButton")) { checkout(1, checkoutData); return; }
    if (closest("#checkoutBack")) { checkout(1, checkoutData); return; }
    if (closest("#placeOrder")) { finalizeOrder(); return; }
    if (closest("#applyCoupon")) { applyCoupon(); return; }
    if (closest("[data-remove-coupon]")) { state.coupon = null; persist(); renderCart(); return; }

    if ((el = closest("[data-gender-link]"))) { state.activeGender = el.dataset.genderLink; state.activeFilter = "all"; state.activeCategory = ""; renderProducts(); return; }
    if ((el = closest("[data-gender-card]"))) { state.activeGender = el.dataset.genderCard; state.activeFilter = "all"; state.activeCategory = ""; renderProducts(); $("#products").scrollIntoView({ behavior: "smooth" }); return; }
    if ((el = closest("[data-filter-link]"))) { state.activeFilter = el.dataset.filterLink; state.activeGender = ""; $$(".product-tabs button").forEach(b => b.classList.toggle("active", b.dataset.filter === state.activeFilter)); renderProducts(); return; }
    if ((el = closest("[data-category-chip]")) ) { state.activeCategory = el.dataset.categoryChip; renderProducts(); return; }
    if ((el = closest("[data-show-all]"))) { state.activeGender = ""; state.activeCategory = ""; state.activeFilter = "all"; renderProducts(); $("#products").scrollIntoView({ behavior: "smooth" }); return; }
    if ((el = closest(".product-tabs button"))) { state.activeFilter = el.dataset.filter; $$(".product-tabs button").forEach(b => b.classList.toggle("active", b === el)); renderProducts(); return; }
    if ((el = closest("[data-favorite]"))) { const id = el.dataset.favorite; const i = state.favorites.indexOf(id); i >= 0 ? state.favorites.splice(i, 1) : state.favorites.push(id); persist(); renderHeader(); renderProducts(); renderFavorites(); return; }
    if ((el = closest("[data-page]"))) { showPage(el.dataset.page); return; }
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
    if ((el = closest("[data-add-to-cart]"))) { addToCart(el.dataset.addToCart, detailSize, detailQty); closeLayers(); openLayer($("#cartDrawer")); return; }

    if ((el = closest("[data-line-qty]"))) {
      const line = state.cart[Number(el.dataset.lineQty)]; if (!line) return;
      const p = state.products.find(x => x.id === line.id);
      const max = p ? cartLineStock(p, line.size) : 99;
      line.quantity += Number(el.dataset.delta);
      if (line.quantity > max) { line.quantity = max; toast(`${line.size} bedeninden en fazla ${max} adet`, false); }
      if (line.quantity <= 0) state.cart.splice(Number(el.dataset.lineQty), 1);
      persist(); renderHeader(); renderCart(); return;
    }
    if ((el = closest("[data-line-remove]"))) { state.cart.splice(Number(el.dataset.lineRemove), 1); persist(); renderHeader(); renderCart(); return; }
  });

  document.addEventListener("change", e => {
    if (e.target.id === "productSort") renderProducts();
  });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    if (e.key === "Escape") closeLayers();
  });
  $("#searchInput").addEventListener("input", e => renderSearch(e.target.value));

  $("#newsletterForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#newsletterEmail").value.trim().toLowerCase();
    if (state.apiOnline) { try { await api("/api/newsletter", { method: "POST", body: JSON.stringify({ email }) }); } catch { } }
    if (!state.subscribers.some(s => s.email === email)) { state.subscribers.unshift({ email, date: new Date().toISOString() }); persist(); }
    e.target.reset();
    toast("Bültene kaydoldun, hoş geldin!");
  });

  if (location.hash === "#yonetim") location.href = "admin.html";

  /* ---------- başlangıç ---------- */
  renderAll();
  setStorageIndicator(false);
  initCookieBanner();
  handlePaymentReturn();
  bootstrapData(false);
  startSync();
})();
