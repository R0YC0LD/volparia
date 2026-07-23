/* VOLPARIA — yönetim paneli */
(() => {
  "use strict";

  $$("[data-fox]").forEach(el => { el.innerHTML = foxMark; });

  const adminModules = [
    ["dashboard", "Genel Bakış"],
    ["products", "Ürünler"],
    ["stock", "Stok / Bedenler"],
    ["orders", "Siparişler"],
    ["bundles", "Kombinler"],
    ["pos", "Sanal POS"],
    ["coupons", "Kuponlar"],
    ["reviews", "Yorumlar"],
    ["customers", "Müşteriler"],
    ["categories", "Kategoriler"],
    ["content", "İçerik Yönetimi"],
    ["newsletter", "Bülten Aboneleri"],
    ["seo", "SEO ve Sosyal"],
    ["settings", "Mağaza Ayarları"],
    ["backups", "Yedekleme"],
    ["audit", "Denetim Kaydı"]
  ];
  const titles = Object.fromEntries(adminModules);

  /* ---------- oturum ---------- */
  function handleSessionExpiry(err) {
    if (err.status === 401) {
      state.token = ""; sessionStorage.removeItem("volparia_admin_token");
      toast("Oturum süresi doldu — lütfen tekrar giriş yapın", false);
      showLogin();
      return true;
    }
    return false;
  }
  function showLogin() { $("#adminApp").classList.remove("show"); $("#adminLogin").classList.add("show"); setTimeout(() => $("#adminUsername").focus(), 100); }
  function showAdmin() { $("#adminLogin").classList.remove("show"); $("#adminApp").classList.add("show"); state.adminView = "dashboard"; loadAdminData(); renderAdmin(); }
  async function login(username, password) {
    if (!CONFIG.apiBase) throw new Error("Güvenli yönetim için Cloudflare Worker bağlantısını yapılandırın");
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    state.token = data.token; sessionStorage.setItem("volparia_admin_token", data.token);
    state.apiOnline = true; setStorageIndicator(true); showAdmin();
  }

  /* ---------- veri ---------- */
  async function loadAdminData() {
    if (!state.apiOnline || !state.token) { renderAdmin(); return; }
    try {
      const [prods, orders, coupons, reviews, subs, pos] = await Promise.all([
        api("/api/products/full"), api("/api/orders"), api("/api/coupons"), api("/api/reviews/all"), api("/api/newsletter"), api("/api/pos/credentials").catch(() => ({ pos: {} }))
      ]);
      state.admin.products = prods.products || [];
      state.admin.orders = orders.orders || [];
      state.admin.coupons = coupons.coupons || [];
      state.admin.reviews = reviews.reviews || [];
      state.admin.subscribers = subs.subscribers || [];
      state.admin.pos = pos.pos || {};
      renderAdmin();
    } catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); }
  }
  const adminProducts = () => state.apiOnline && state.admin.products ? state.admin.products : state.products;
  const adminOrders = () => state.apiOnline && state.admin.orders ? state.admin.orders : state.orders.map(o => ({ ...o, order_no: o.orderNo, created_at: o.createdAt, payment_method: o.payment, payment_status: o.paymentStatus || "awaiting", coupon_code: o.coupon, customer: o.customer }));
  const adminCoupons = () => state.apiOnline && state.admin.coupons ? state.admin.coupons.map(c => ({ code: c.code, type: c.type, value: c.value, minTotal: c.min_total, usageLimit: c.usage_limit, usedCount: c.used_count, active: Boolean(c.active) })) : state.coupons;
  const adminReviews = () => state.apiOnline && state.admin.reviews ? state.admin.reviews.map(r => ({ id: r.id, productId: r.product_id, productName: r.product_name, name: r.name, rating: r.rating, comment: r.comment, status: r.status, createdAt: r.created_at })) : state.reviews.map(r => ({ ...r, productName: state.products.find(p => p.id === r.productId)?.name }));
  const adminSubscribers = () => state.apiOnline && state.admin.subscribers ? state.admin.subscribers.map(s => ({ email: s.email, date: s.created_at })) : state.subscribers;

  window.onDataRefresh = () => { if ($("#adminApp").classList.contains("show")) renderAdmin(); };

  /* ---------- render ---------- */
  function renderAdminNav() {
    const pendingReviews = adminReviews().filter(r => r.status === "pending").length;
    const newOrders = adminOrders().filter(o => o.status === "new").length;
    $("#adminNav").innerHTML = adminModules.map(([key, label]) => {
      const badge = key === "reviews" && pendingReviews ? `<b>${pendingReviews}</b>` : key === "orders" && newOrders ? `<b>${newOrders}</b>` : "";
      return `<button data-admin-view="${key}" class="${state.adminView === key ? "active" : ""}"><i>${ICONS[key] || ""}</i>${label}${badge}</button>`;
    }).join("");
  }
  function renderAdmin() {
    renderAdminNav();
    $("#adminTitle").textContent = titles[state.adminView] || "";
    const host = $("#adminContent");
    const views = {
      dashboard: dashboardHtml, products: productsHtml, stock: stockHtml, orders: ordersHtml,
      bundles: bundlesHtml, pos: posHtml, coupons: couponsHtml, reviews: reviewsHtml, customers: customersHtml, categories: categoriesHtml,
      content: contentHtml, newsletter: newsletterHtml, seo: seoHtml, settings: settingsHtml,
      backups: backupsHtml, audit: auditHtml
    };
    host.innerHTML = (views[state.adminView] || dashboardHtml)();
    bindForms();
    if (state.adminView === "audit" && state.apiOnline) loadAudit();
  }

  /* ---------- 1. genel bakış ---------- */
  function dashboardHtml() {
    const products = adminProducts();
    const actives = products.filter(p => p.active !== false);
    const stockSum = actives.reduce((s, p) => s + totalStock(p), 0);
    const lowList = actives.filter(isLowStock);
    const outSizes = actives.flatMap(p => sizesOf(p).filter(s => (Number(s.stock) || 0) <= 0).map(s => ({ p, s })));
    const orders = adminOrders();
    const newOrders = orders.filter(o => o.status === "new").length;
    const revenue = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (Number(o.total) || 0), 0);
    const pendingReviews = adminReviews().filter(r => r.status === "pending").length;
    const recent = orders.slice(0, 6);
    return `<div class="stat-grid">
        <div class="stat-card"><small>AKTİF ÜRÜN</small><b>${actives.length}</b><span>${products.length - actives.length} pasif</span></div>
        <div class="stat-card"><small>TOPLAM STOK</small><b>${stockSum}</b><span>adet</span></div>
        <div class="stat-card ${lowList.length ? "warn" : ""}"><small>KRİTİK STOK</small><b>${lowList.length}</b><span>ürün sınırın altında</span></div>
        <div class="stat-card ${outSizes.length ? "bad" : ""}"><small>TÜKENEN BEDEN</small><b>${outSizes.length}</b><span>beden stoğu sıfır</span></div>
        <div class="stat-card"><small>SİPARİŞ</small><b>${orders.length}</b><span>${newOrders} yeni</span></div>
        <div class="stat-card"><small>CİRO</small><b>${money(revenue)}</b><span>iptal hariç</span></div>
        <div class="stat-card ${pendingReviews ? "warn" : ""}"><small>ONAY BEKLEYEN YORUM</small><b>${pendingReviews}</b><span>moderasyon</span></div>
        <div class="stat-card"><small>BÜLTEN ABONESİ</small><b>${adminSubscribers().length}</b><span>kayıtlı</span></div>
      </div>
      <div class="admin-panel"><h3>🔥 Kritik stok — vitrinde "Son X ürün" olarak yanıyor</h3>
        ${lowList.length ? `<table class="admin-table"><thead><tr><th>ÜRÜN</th><th>KOD</th><th>KALAN</th><th>SINIR</th><th></th></tr></thead><tbody>
        ${lowList.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.sku)}</td><td><span class="pill warn">🔥 Son ${totalStock(p)}</span></td><td>${critical(p)}</td><td class="mini-actions"><button data-edit-product="${p.id}">Düzenle</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Kritik stokta ürün yok — her şey yolunda.</div>`}
      </div>
      <div class="admin-panel"><h3>Tükenen bedenler — vitrinde üzeri kırmızı çizili</h3>
        ${outSizes.length ? `<table class="admin-table"><thead><tr><th>ÜRÜN</th><th>KOD</th><th>BEDEN</th><th></th></tr></thead><tbody>
        ${outSizes.map(({ p, s }) => `<tr><td>${esc(p.name)}</td><td>${esc(p.sku)}</td><td><span class="pill bad">${esc(s.name)} tükendi</span></td><td class="mini-actions"><button data-edit-product="${p.id}">Stok gir</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Tükenen beden yok.</div>`}
      </div>
      <div class="admin-panel"><h3>Son siparişler</h3>
        ${recent.length ? `<table class="admin-table"><thead><tr><th>SİPARİŞ</th><th>MÜŞTERİ</th><th>TUTAR</th><th>DURUM</th></tr></thead><tbody>
        ${recent.map(o => { const c = o.customer || {}; return `<tr><td><b>${esc(o.order_no || "")}</b><br><small style="color:var(--muted)">${dateTr(o.created_at)}</small></td><td>${esc(`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—")}</td><td><b>${money(Number(o.total) || 0)}</b></td><td><span class="pill dim">${orderStatusTr[o.status] || o.status}</span></td></tr>`; }).join("")}</tbody></table>` : `<div class="empty">Henüz sipariş yok.</div>`}
      </div>`;
  }

  /* ---------- 2. ürünler ---------- */
  function productsHtml() {
    if (state.admin.editing !== null) return productFormHtml(state.admin.editing);
    const q = state.admin.productQuery.toLocaleLowerCase("tr");
    const list = adminProducts().filter(p => !q || `${p.name} ${p.sku} ${p.brand}`.toLocaleLowerCase("tr").includes(q));
    return `<div class="admin-panel">
      <div class="admin-toolbar">
        <input type="search" id="adminProductSearch" placeholder="Ürün adı veya ürün kodu (SKU) ara…" value="${esc(state.admin.productQuery)}">
        <span class="grow"></span>
        <button class="button dark" data-new-product>+ Yeni ürün</button>
      </div>
      ${list.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th></th><th>ÜRÜN</th><th>KOD</th><th>KATEGORİ</th><th>FİYAT</th><th>STOK</th><th>DURUM</th><th style="text-align:right">İŞLEM</th></tr></thead><tbody>
      ${list.map(p => {
        const t = totalStock(p);
        const stockPill = t <= 0 ? `<span class="pill bad">Tükendi</span>` : isLowStock(p) ? `<span class="pill warn">🔥 Son ${t}</span>` : `<span class="pill ok">${t} adet</span>`;
        return `<tr>
          <td><div class="thumb" style="--tone:${esc(p.tone || "#e8e2d6")}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : hangerSvg}</div></td>
          <td><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${esc(p.brand || "")} · ${esc(GENDERS[p.gender] || "")}</small></td>
          <td>${esc(p.sku)}</td><td>${esc(p.category || "—")}</td>
          <td><b>${money(p.price)}</b>${p.oldPrice ? `<br><del style="color:var(--muted);font-size:11px">${money(p.oldPrice)}</del>` : ""}</td>
          <td>${stockPill}</td>
          <td>${p.active !== false ? `<span class="pill ok">Yayında</span>` : `<span class="pill dim">Pasif</span>`}</td>
          <td class="mini-actions"><button data-edit-product="${p.id}">Düzenle</button><button class="danger" data-delete-product="${p.id}">Sil</button></td>
        </tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty">"${esc(state.admin.productQuery)}" için ürün bulunamadı.</div>`}
    </div>`;
  }
  function productFormHtml(id) {
    const isNew = id === "new";
    const p = isNew
      ? { id: uid("g"), name: "", brand: "VOLPARIA", sku: "", category: getCategories()[0], gender: "unisex", price: "", oldPrice: "", badge: "", tags: [], tone: "#e8e2d6", description: "", fabric: "", care: "", imageUrl: "", criticalStock: state.settings.criticalStockDefault || 5, active: true, sizes: DEFAULT_SIZES.map(n => ({ name: n, stock: 0 })) }
      : adminProducts().find(x => x.id === id);
    if (!p) return `<div class="empty">Ürün bulunamadı.</div>`;
    return `<div class="admin-panel"><h3>${isNew ? "Yeni ürün ekle" : `Düzenle: ${esc(p.name)}`}</h3>
      <form id="productForm" class="form-grid" data-product-id="${esc(p.id)}" data-is-new="${isNew}">
        <label class="field">Ürün adı *<input name="name" required value="${esc(p.name)}"></label>
        <label class="field">Marka<input name="brand" value="${esc(p.brand || "")}"></label>
        <label class="field">Ürün kodu (SKU) *<input name="sku" required value="${esc(p.sku)}" placeholder="VLP-TS-001"></label>
        <label class="field">Kategori<select name="category">${getCategories().map(c => `<option ${c === p.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label class="field">Cinsiyet<select name="gender">${Object.entries(GENDERS).map(([k, v]) => `<option value="${k}" ${k === p.gender ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field">Rozet (ops.)<input name="badge" value="${esc(p.badge || "")}" placeholder="Yeni / Çok Satan / Limited"></label>
        <label class="field">Fiyat (₺) *<input name="price" type="number" min="0" step="0.01" required value="${esc(p.price)}"></label>
        <label class="field">Eski fiyat (₺, ops.)<input name="oldPrice" type="number" min="0" step="0.01" value="${esc(p.oldPrice || "")}"></label>
        <label class="field">Kart zemin rengi<input name="tone" type="color" value="${esc(p.tone || "#e8e2d6")}" style="height:44px;padding:4px"></label>
        <label class="field">Kritik stok sınırı<input name="criticalStock" type="number" min="1" value="${esc(p.criticalStock || 5)}"><span class="form-note">Toplam stok bu sayıya düşünce vitrinde 🔥 "Son X ürün" yanar.</span></label>
        <div class="field full"><span>Ürün görseli</span>
          <div class="image-row">
            <div class="img-preview-box" id="imgPreviewBox">${p.imageUrl ? `<img class="img-preview" id="imgPreview" src="${esc(p.imageUrl)}" alt="">` : `<div class="img-preview placeholder" id="imgPreview">${hangerSvg}</div>`}</div>
            <div class="image-controls">
              <input type="file" id="imageFile" accept="image/*" hidden>
              <button type="button" class="button outline" data-pick-image>Bilgisayardan yükle</button>
              <button type="button" class="button outline danger" data-clear-image ${p.imageUrl ? "" : "hidden"}>Görseli kaldır</button>
              <input name="imageUrl" id="imageUrlInput" value="${esc(p.imageUrl || "")}" placeholder="veya görsel URL'si yapıştır">
              <span class="form-note">Yüklenen görsel otomatik küçültülür (~900px).</span>
            </div>
          </div>
        </div>
        <label class="field full">Açıklama<textarea name="description" rows="3">${esc(p.description || "")}</textarea></label>
        <label class="field">Kumaş<input name="fabric" value="${esc(p.fabric || "")}"></label>
        <label class="field">Bakım<input name="care" value="${esc(p.care || "")}"></label>
        <div class="field full"><span>Etiketler</span>
          <div style="display:flex;gap:16px;margin-top:4px;flex-wrap:wrap">
            <label class="check-row"><input type="checkbox" name="tagNew" ${(p.tags || []).includes("new") ? "checked" : ""}>Yeni</label>
            <label class="check-row"><input type="checkbox" name="tagSale" ${(p.tags || []).includes("sale") ? "checked" : ""}>İndirim</label>
            <label class="check-row"><input type="checkbox" name="tagBest" ${(p.tags || []).includes("bestseller") ? "checked" : ""}>Çok satan</label>
            <label class="check-row"><input type="checkbox" name="active" ${p.active !== false ? "checked" : ""}>Yayında</label>
          </div>
        </div>
        <div class="field full"><span>Bedenler ve stok *</span>
          <div class="size-editor" id="sizeEditor">${sizesOf(p).map(s => sizeEditorRow(s.name, s.stock)).join("")}</div>
          <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
            <button type="button" class="button outline" data-add-size>+ Beden ekle</button>
            <button type="button" class="button outline" data-preset-sizes>Standart bedenler (XS–XXL)</button>
          </div>
          <span class="form-note">Stok 0 girilen beden vitrinde üzeri kırmızı çizili görünür ve satın alınamaz. Pantolon için "36", çocuk için "6-7Y" gibi serbest beden adı yazabilirsiniz.</span>
        </div>
        <div class="admin-form-actions">
          <button type="button" class="button outline" data-cancel-edit>Vazgeç</button>
          <button type="submit" class="button dark">${isNew ? "Ürünü ekle" : "Değişiklikleri kaydet"}</button>
        </div>
      </form></div>`;
  }
  const sizeEditorRow = (name = "", stock = 0) => `<div class="size-editor-row"><input class="sname" placeholder="BEDEN" value="${esc(name)}"><input class="sstock" type="number" min="0" value="${esc(stock)}"><button type="button" data-remove-size aria-label="Bedeni kaldır">×</button></div>`;

  /* ---------- 3. stok ---------- */
  function stockHtml() {
    const q = state.admin.productQuery.toLocaleLowerCase("tr");
    const list = adminProducts().filter(p => !q || `${p.name} ${p.sku}`.toLocaleLowerCase("tr").includes(q));
    return `<div class="admin-panel">
      <div class="admin-toolbar"><input type="search" id="adminStockSearch" placeholder="Ürün adı veya kod ara…" value="${esc(state.admin.productQuery)}"><span class="grow"></span><span class="form-note">Değeri değiştirip "Kaydet"e basın — tüm cihazlara anında yansır.</span></div>
      ${list.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ÜRÜN</th><th>KOD</th><th>BEDEN STOKLARI</th><th>TOPLAM</th><th style="text-align:right"></th></tr></thead><tbody>
      ${list.map(p => {
        const t = totalStock(p);
        return `<tr data-stock-row="${esc(p.id)}">
          <td><b>${esc(p.name)}</b></td><td>${esc(p.sku)}</td>
          <td><div class="stock-cells">${sizesOf(p).map((s, i) => { const st = Number(s.stock) || 0; const cls = st <= 0 ? "zero" : st <= critical(p) ? "low" : ""; return `<label class="stock-cell">${esc(s.name)}<input type="number" min="0" value="${st}" class="${cls}" data-size-index="${i}"></label>`; }).join("")}</div></td>
          <td>${t <= 0 ? `<span class="pill bad">0</span>` : isLowStock(p) ? `<span class="pill warn">🔥 ${t}</span>` : `<span class="pill ok">${t}</span>`}</td>
          <td class="mini-actions"><button data-save-stock="${esc(p.id)}">Kaydet</button></td>
        </tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty">Ürün bulunamadı.</div>`}
    </div>`;
  }

  /* ---------- 4. siparişler ---------- */
  function ordersHtml() {
    const q = state.admin.orderQuery.toLocaleLowerCase("tr");
    const orders = adminOrders().filter(o => { const c = o.customer || {}; return !q || `${o.order_no || ""} ${c.firstName || ""} ${c.lastName || ""} ${c.email || ""} ${c.phone || ""}`.toLocaleLowerCase("tr").includes(q); });
    return `<div class="admin-panel">
      <div class="admin-toolbar"><input type="search" id="adminOrderSearch" placeholder="Sipariş no, müşteri adı, e-posta veya telefon ara…" value="${esc(state.admin.orderQuery)}"></div>
      ${orders.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>SİPARİŞ</th><th>MÜŞTERİ</th><th>ÜRÜNLER</th><th>TUTAR</th><th>ÖDEME</th><th>ÖDEME DURUMU</th><th>SİPARİŞ DURUMU</th></tr></thead><tbody>
      ${orders.map(o => {
        const c = o.customer || {};
        const items = (o.items || []).map(i => `<li>${esc(i.product_name || productName(i.id))} <b>[${esc(i.size)}]</b> × ${i.quantity}</li>`).join("");
        return `<tr>
          <td><b>${esc(o.order_no || "")}</b><br><small style="color:var(--muted)">${dateTr(o.created_at)}</small>${o.coupon_code ? `<br><span class="pill dim">🏷 ${esc(o.coupon_code)}</span>` : ""}</td>
          <td>${esc(`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—")}<br><small style="color:var(--muted)">${esc(c.phone || "")}${c.city ? ` · ${esc(c.city)}` : ""}</small><br><small style="color:var(--muted)">${esc(c.email || "")}</small><br><small style="color:var(--muted)">${esc(o.shipping_address || c.address || "")}</small></td>
          <td><ul class="order-items-list">${items || "<li>—</li>"}</ul></td>
          <td><b>${money(Number(o.total) || 0)}</b>${Number(o.discount) ? `<br><small style="color:var(--ok)">−${money(o.discount)} kupon</small>` : ""}</td>
          <td><span class="pill dim">${(o.payment_method || "transfer") === "cod" ? "Kapıda" : "Havale/EFT"}</span></td>
          <td><select class="status-select" data-order-pay="${esc(o.id)}">${Object.entries(payStatusTr).map(([k, v]) => `<option value="${k}" ${(o.payment_status || "awaiting") === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
          <td><select class="status-select" data-order-status="${esc(o.id)}">${Object.entries(orderStatusTr).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
        </tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty">Henüz sipariş yok.</div>`}
    </div>`;
  }
  function productName(id) { const p = state.products.find(x => x.id === id); return p ? p.name : "Ürün"; }

  /* ---------- kombinler ---------- */
  function bundlesHtml() {
    const bundles = getBundles();
    const products = adminProducts().filter(p => p.active !== false);
    if (state.admin.bundleEdit !== null && state.admin.bundleEdit !== undefined) return bundleFormHtml(state.admin.bundleEdit, products);
    return `<div class="admin-panel">
      <div class="admin-toolbar"><h3 style="margin:0">Kombinler (${bundles.length})</h3><span class="grow"></span><button class="button dark" data-new-bundle ${products.length < 2 ? "disabled" : ""}>+ Yeni kombin</button></div>
      <p class="form-note" style="margin-bottom:16px">Kombin, birbirini tamamlayan 2-4 ürünü indirimli bir paket olarak sunar. Müşteri her parçanın bedenini kendi seçer; kombin vitrinde "Kombinler" bölümünde ve mega-menüde görünür.</p>
      ${bundles.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>KOMBİN</th><th>PARÇALAR</th><th>LİSTE</th><th>İNDİRİM</th><th>KOMBİN FİYATI</th><th>DURUM</th><th style="text-align:right"></th></tr></thead><tbody>
      ${bundles.map(b => {
        const members = bundleMembers(b);
        return `<tr>
          <td><b>${esc(b.name)}</b>${b.badge ? `<br><span class="pill dim">${esc(b.badge)}</span>` : ""}</td>
          <td><small style="color:var(--muted)">${members.map(p => esc(p.name)).join(" + ") || "—"}</small></td>
          <td>${money(bundleGross(b))}</td>
          <td><span class="pill warn">%${bundleDiscountPct(b)}</span></td>
          <td><b>${money(bundlePrice(b))}</b><br><small style="color:var(--ok)">${money(bundleSavings(b))} kazanç</small></td>
          <td>${b.active !== false ? (bundleAvailable(b) ? `<span class="pill ok">Yayında</span>` : `<span class="pill bad">Stok yok</span>`) : `<span class="pill dim">Pasif</span>`}</td>
          <td class="mini-actions"><button data-edit-bundle="${esc(b.id)}">Düzenle</button><button class="danger" data-delete-bundle="${esc(b.id)}">Sil</button></td>
        </tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty">Henüz kombin yok. En az 2 ürün seçerek ilk kombinini oluştur.</div>`}
    </div>`;
  }
  function bundleFormHtml(id, products) {
    const isNew = id === "new";
    const b = isNew ? { id: uid("b"), name: "", description: "", productIds: [], discountPercent: 15, badge: "Kombin", tone: "#e8e2d6", active: true } : getBundle(id) || { productIds: [] };
    const selected = new Set(b.productIds || []);
    const preview = bundleMembers({ productIds: [...selected] });
    const gross = preview.reduce((s, p) => s + (Number(p.price) || 0), 0);
    const disc = Math.max(0, Math.min(90, Number(b.discountPercent) || 0));
    const price = Math.round(gross * (100 - disc) / 100);
    return `<div class="admin-panel"><h3>${isNew ? "Yeni kombin oluştur" : `Düzenle: ${esc(b.name)}`}</h3>
      <form id="bundleForm" class="form-grid" data-bundle-id="${esc(b.id)}" data-is-new="${isNew}">
        <label class="field">Kombin adı *<input name="name" required value="${esc(b.name)}" placeholder="Ofis Şıklığı Kombini"></label>
        <label class="field">Rozet (ops.)<input name="badge" value="${esc(b.badge || "")}" placeholder="Kombin / Çok Tutulan"></label>
        <label class="field">İndirim oranı (%)<input name="discountPercent" type="number" min="0" max="90" value="${esc(b.discountPercent ?? 15)}" id="bundleDiscInput"></label>
        <label class="field">Kart zemin rengi<input name="tone" type="color" value="${esc(b.tone || "#e8e2d6")}" style="height:44px;padding:4px"></label>
        <label class="field full">Açıklama<textarea name="description" rows="2">${esc(b.description || "")}</textarea></label>
        <div class="field full"><span>Kombine dahil ürünler (2-4 adet seç) *</span>
          <div class="bundle-picker" id="bundlePicker">
            ${products.map(p => `<label class="bundle-pick ${selected.has(p.id) ? "on" : ""}"><input type="checkbox" name="member" value="${esc(p.id)}" ${selected.has(p.id) ? "checked" : ""}><span class="bp-thumb" style="--tone:${esc(p.tone || "#e8e2d6")}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : hangerSvg}</span><span class="bp-info"><b>${esc(p.name)}</b><small>${esc(p.sku)} · ${money(p.price)}</small></span></label>`).join("")}
          </div>
        </div>
        <div class="field full"><div class="bundle-price-preview" id="bundlePreview">
          <span>Liste: <b>${money(gross)}</b></span><span>İndirim: <b>%${disc}</b></span><span>Kombin fiyatı: <b class="accent">${money(price)}</b></span><span class="save">Kazanç: <b>${money(gross - price)}</b></span>
        </div></div>
        <label class="field"><span class="check-row"><input type="checkbox" name="active" ${b.active !== false ? "checked" : ""}>Yayında</span></label>
        <div class="admin-form-actions">
          <button type="button" class="button outline" data-cancel-bundle>Vazgeç</button>
          <button type="submit" class="button dark">${isNew ? "Kombini oluştur" : "Değişiklikleri kaydet"}</button>
        </div>
      </form></div>`;
  }
  function recalcBundlePreview() {
    const form = $("#bundleForm"); if (!form) return;
    const ids = $$("input[name=member]:checked", form).map(i => i.value);
    const members = ids.map(id => adminProducts().find(p => p.id === id)).filter(Boolean);
    const gross = members.reduce((s, p) => s + (Number(p.price) || 0), 0);
    const disc = Math.max(0, Math.min(90, Number($("#bundleDiscInput").value) || 0));
    const price = Math.round(gross * (100 - disc) / 100);
    $("#bundlePreview").innerHTML = `<span>Liste: <b>${money(gross)}</b></span><span>İndirim: <b>%${disc}</b></span><span>Kombin fiyatı: <b class="accent">${money(price)}</b></span><span class="save">Kazanç: <b>${money(gross - price)}</b></span>`;
    $$(".bundle-pick", form).forEach(l => l.classList.toggle("on", l.querySelector("input").checked));
  }
  async function saveBundleForm(form) {
    const fd = new FormData(form);
    const ids = fd.getAll("member").map(String);
    if (ids.length < 2) { toast("En az 2 ürün seçin", false); return; }
    if (ids.length > 4) { toast("En fazla 4 ürün seçebilirsiniz", false); return; }
    const name = String(fd.get("name")).trim();
    if (!name) { toast("Kombin adı zorunlu", false); return; }
    const bundle = {
      id: form.dataset.bundleId, name, description: String(fd.get("description")).trim(),
      productIds: ids, discountPercent: Math.max(0, Math.min(90, Number(fd.get("discountPercent")) || 0)),
      badge: String(fd.get("badge")).trim() || null, tone: String(fd.get("tone")) || "#e8e2d6", active: Boolean(fd.get("active"))
    };
    const bundles = getBundles().filter(x => x.id !== bundle.id);
    bundles.push(bundle);
    const ok = await saveSettingsPartial({ bundles });
    if (!ok) return;
    state.admin.bundleEdit = null;
    renderAdmin(); toast("Kombin kaydedildi");
  }
  async function deleteBundle(id) {
    const b = getBundle(id); if (!b) return;
    if (!confirm(`"${b.name}" kombini silinsin mi?`)) return;
    const ok = await saveSettingsPartial({ bundles: getBundles().filter(x => x.id !== id) });
    if (!ok) return;
    renderAdmin(); toast("Kombin silindi");
  }

  /* ---------- sanal pos ---------- */
  function posHtml() {
    if (!state.apiOnline) return `<div class="admin-panel"><div class="empty">Sanal POS, bulut (Cloudflare) kurulumu tamamlandıktan sonra kullanılabilir.<br>Kurulum adımları için KURULUM.md dosyasına bakın — bilgiler girildiği anda kart ödemesi vitrinde otomatik açılır.</div></div>`;
    const s = state.settings;
    const pos = state.admin.pos || {};
    const iyz = pos.iyzico, ptr = pos.paytr;
    const statusPill = st => st?.configured ? `<span class="pill ok">Yapılandırıldı · ${esc(st.hint || "")}${st.sandbox ? " · sandbox" : ""}</span>` : `<span class="pill dim">Henüz girilmedi</span>`;
    return `<div class="admin-panel"><h3>Genel POS ayarları</h3>
      <p class="form-note" style="margin-bottom:14px">Aktif sağlayıcının bilgileri girildiği anda mağazadaki ödeme adımına <b>"Kredi / Banka kartı"</b> seçeneği otomatik eklenir. Test modu açıkken karttan tahsilat yapılmaz.</p>
      <form id="posGeneralForm" class="form-grid">
        <label class="field">Aktif sağlayıcı<select name="provider"><option value="iyzico" ${s.provider !== "paytr" ? "selected" : ""}>iyzico</option><option value="paytr" ${s.provider === "paytr" ? "selected" : ""}>PayTR</option></select></label>
        <div class="field"><span>Test modu</span><label class="check-row" style="margin-top:10px"><input type="checkbox" name="testMode" ${s.testMode ? "checked" : ""}>Açık (tahsilat yapılmaz)</label></div>
        <div class="field full"><span>Taksit seçenekleri (iyzico)</span><div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">
          ${[2, 3, 6, 9, 12].map(n => `<label class="check-row"><input type="checkbox" name="inst${n}" ${(s.installments || []).includes(n) ? "checked" : ""}>${n} taksit</label>`).join("")}
        </div></div>
        <div class="admin-form-actions"><button type="submit" class="button dark">Genel ayarları kaydet</button></div>
      </form>
    </div>
    <div class="admin-panel"><h3>iyzico bilgileri ${statusPill(iyz)}</h3>
      <p class="form-note" style="margin-bottom:12px">iyzico hesabınızın <b>Ayarlar → API Anahtarları</b> bölümünden alınır (iyzico.com üzerinden ücretsiz başvuru).</p>
      <form id="posIyzicoForm" class="form-grid">
        <label class="field">API Anahtarı (apiKey)<input name="apiKey" required autocomplete="off" placeholder="sandbox-... veya canlı anahtar"></label>
        <label class="field">Gizli Anahtar (secretKey)<input name="secretKey" type="password" required autocomplete="off"></label>
        <div class="field"><label class="check-row" style="margin-top:24px"><input type="checkbox" name="sandbox">Sandbox (test ortamı) anahtarı</label></div>
        <div class="admin-form-actions"><button type="submit" class="button dark">iyzico bilgilerini kaydet</button></div>
      </form>
    </div>
    <div class="admin-panel"><h3>PayTR bilgileri ${statusPill(ptr)}</h3>
      <p class="form-note" style="margin-bottom:12px">PayTR mağaza panelinizin <b>Bilgi</b> sayfasından alınır. Ayrıca PayTR paneline bildirim adresi olarak şunu girin: <code style="font-size:11px">${esc((CONFIG.apiBase || "").replace(/\/$/, ""))}/api/payments/webhook/paytr</code></p>
      <form id="posPaytrForm" class="form-grid">
        <label class="field">Mağaza No (merchantId)<input name="merchantId" required autocomplete="off"></label>
        <label class="field">Mağaza Parola (merchantKey)<input name="merchantKey" type="password" required autocomplete="off"></label>
        <label class="field">Mağaza Gizli Anahtar (merchantSalt)<input name="merchantSalt" type="password" required autocomplete="off"></label>
        <div class="admin-form-actions"><button type="submit" class="button dark">PayTR bilgilerini kaydet</button></div>
      </form>
    </div>`;
  }

  /* ---------- 5. kuponlar ---------- */
  function couponsHtml() {
    const list = adminCoupons();
    return `<div class="admin-panel"><h3>Yeni kupon oluştur</h3>
      <form id="couponForm" class="form-grid">
        <label class="field">Kupon kodu *<input name="code" required placeholder="HOSGELDIN10" style="text-transform:uppercase"></label>
        <label class="field">Tür<select name="type"><option value="percent">Yüzde indirim (%)</option><option value="fixed">Tutar indirim (₺)</option></select></label>
        <label class="field">Değer *<input name="value" type="number" min="1" required placeholder="10"></label>
        <label class="field">Min. sepet tutarı (₺)<input name="minTotal" type="number" min="0" value="0"></label>
        <label class="field">Kullanım limiti (ops.)<input name="usageLimit" type="number" min="1" placeholder="Sınırsız"></label>
        <div class="field" style="justify-content:flex-end"><label class="check-row" style="margin-top:24px"><input type="checkbox" name="active" checked>Aktif</label></div>
        <div class="admin-form-actions"><button type="submit" class="button dark">Kuponu kaydet</button></div>
      </form></div>
      <div class="admin-panel"><h3>Kuponlar</h3>
      ${list.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>KOD</th><th>İNDİRİM</th><th>MİN. SEPET</th><th>KULLANIM</th><th>DURUM</th><th style="text-align:right"></th></tr></thead><tbody>
      ${list.map(c => `<tr>
        <td><b>${esc(c.code)}</b></td>
        <td>${c.type === "percent" ? `%${c.value}` : money(c.value)}</td>
        <td>${c.minTotal ? money(c.minTotal) : "—"}</td>
        <td>${c.usedCount || 0}${c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
        <td>${c.active !== false ? `<span class="pill ok">Aktif</span>` : `<span class="pill dim">Pasif</span>`}</td>
        <td class="mini-actions"><button data-toggle-coupon="${esc(c.code)}">${c.active !== false ? "Durdur" : "Aktifleştir"}</button><button class="danger" data-delete-coupon="${esc(c.code)}">Sil</button></td>
      </tr>`).join("")}</tbody></table></div>` : `<div class="empty">Henüz kupon yok. Yukarıdan ilk kuponunu oluştur.</div>`}
      </div>`;
  }

  /* ---------- 6. yorumlar ---------- */
  function reviewsHtml() {
    const list = adminReviews();
    return `<div class="admin-panel"><h3>Ürün yorumları</h3>
      ${list.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ÜRÜN</th><th>MÜŞTERİ</th><th>PUAN</th><th>YORUM</th><th>TARİH</th><th>DURUM</th><th style="text-align:right"></th></tr></thead><tbody>
      ${list.map(r => `<tr>
        <td>${esc(r.productName || "—")}</td>
        <td><b>${esc(r.name)}</b></td>
        <td><span class="stars">${starFull.repeat(r.rating)}${starEmpty.repeat(5 - r.rating)}</span></td>
        <td style="max-width:340px">${esc(r.comment)}</td>
        <td><small>${dateTr(r.createdAt)}</small></td>
        <td>${r.status === "approved" ? `<span class="pill ok">Yayında</span>` : r.status === "rejected" ? `<span class="pill bad">Reddedildi</span>` : `<span class="pill warn">Onay bekliyor</span>`}</td>
        <td class="mini-actions">
          ${r.status !== "approved" ? `<button data-review-status="${esc(r.id)}" data-status="approved">Onayla</button>` : ""}
          ${r.status !== "rejected" ? `<button data-review-status="${esc(r.id)}" data-status="rejected">Reddet</button>` : ""}
          <button class="danger" data-delete-review="${esc(r.id)}">Sil</button>
        </td>
      </tr>`).join("")}</tbody></table></div>` : `<div class="empty">Henüz yorum yok.</div>`}
    </div>`;
  }

  /* ---------- 7. müşteriler ---------- */
  function customersHtml() {
    const q = state.admin.customerQuery.toLocaleLowerCase("tr");
    const map = new Map();
    adminOrders().forEach(o => {
      const c = o.customer || {}; if (!c.email) return;
      const cur = map.get(c.email) || { name: `${c.firstName || ""} ${c.lastName || ""}`.trim(), email: c.email, phone: c.phone || "", city: c.city || "", orders: 0, total: 0, last: o.created_at };
      cur.orders++; if (o.status !== "cancelled") cur.total += Number(o.total) || 0;
      if ((o.created_at || "") > (cur.last || "")) cur.last = o.created_at;
      map.set(c.email, cur);
    });
    const list = [...map.values()].filter(c => !q || `${c.name} ${c.email} ${c.phone}`.toLocaleLowerCase("tr").includes(q)).sort((a, b) => b.total - a.total);
    return `<div class="admin-panel">
      <div class="admin-toolbar"><input type="search" id="adminCustomerSearch" placeholder="Ad, e-posta veya telefon ara…" value="${esc(state.admin.customerQuery)}"><span class="grow"></span><span class="form-note">Müşteriler sipariş kayıtlarından derlenir.</span></div>
      ${list.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>MÜŞTERİ</th><th>İLETİŞİM</th><th>ŞEHİR</th><th>SİPARİŞ</th><th>TOPLAM HARCAMA</th><th>SON SİPARİŞ</th></tr></thead><tbody>
      ${list.map(c => `<tr><td><b>${esc(c.name || "—")}</b></td><td>${esc(c.email)}<br><small style="color:var(--muted)">${esc(c.phone)}</small></td><td>${esc(c.city || "—")}</td><td>${c.orders}</td><td><b>${money(c.total)}</b></td><td><small>${dateTr(c.last)}</small></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Henüz müşteri kaydı yok.</div>`}
    </div>`;
  }

  /* ---------- 8. kategoriler ---------- */
  function categoriesHtml() {
    const cats = getCategories();
    return `<div class="admin-panel"><h3>Mağaza kategorileri</h3>
      <p class="form-note" style="margin-bottom:14px">Kategoriler vitrindeki filtre çiplerinde ve ürün formunda görünür. Sürükleme yerine ok düğmeleriyle sıralayabilirsiniz.</p>
      <div class="category-editor">
        ${cats.map((c, i) => `<div class="category-row">
          <input value="${esc(c)}" data-cat-name="${i}">
          <button data-cat-up="${i}" ${i === 0 ? "disabled" : ""} title="Yukarı">↑</button>
          <button data-cat-down="${i}" ${i === cats.length - 1 ? "disabled" : ""} title="Aşağı">↓</button>
          <button class="danger" data-cat-remove="${i}" title="Kaldır">×</button>
        </div>`).join("")}
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <input id="newCategoryInput" placeholder="Yeni kategori adı" style="max-width:260px">
        <button class="button outline" data-cat-add>+ Ekle</button>
        <span class="grow"></span>
        <button class="button dark" data-cat-save>Kategorileri kaydet</button>
      </div>
      <p class="form-note" style="margin-top:10px">Not: Bir kategoriyi silmek o kategorideki ürünleri silmez; ürünler kategorisiz kalır ve düzenlenebilir.</p>
    </div>`;
  }

  /* ---------- 9. içerik ---------- */
  function contentHtml() {
    const key = state.admin.contentKey;
    const current = pageContent(key);
    const overridden = Boolean((state.settings.pages || {})[key]);
    return `<div class="admin-panel"><h3>Site içerik ve yasal metin düzenleyici</h3>
      <div class="admin-toolbar">
        <select id="contentPageSelect">${Object.entries(basePages).map(([k, v]) => `<option value="${k}" ${k === key ? "selected" : ""}>${esc(v.title)}${(state.settings.pages || {})[k] ? " (düzenlenmiş)" : ""}</option>`).join("")}</select>
        ${overridden ? `<button class="button outline" data-content-reset>Varsayılana dön</button>` : `<span class="pill dim">Varsayılan metin</span>`}
      </div>
      <form id="contentForm" class="form-grid">
        <label class="field full">Sayfa başlığı<input name="title" value="${esc(current.title)}"></label>
        <label class="field full">İçerik (HTML kullanılabilir: &lt;p&gt;, &lt;h3&gt;, &lt;b&gt;, &lt;table&gt;…)<textarea name="body" rows="16" style="font-family:ui-monospace,monospace;font-size:12.5px">${esc((state.settings.pages || {})[key]?.body || basePages[key]?.body || "")}</textarea></label>
        <p class="form-note">Yer tutucular otomatik doldurulur: {SIRKET} = şirket adı, {ADRES}, {EPOSTA}, {TELEFON} (Mağaza Ayarları'ndan gelir).</p>
        <div class="admin-form-actions"><button type="submit" class="button dark">İçeriği kaydet</button></div>
      </form>
    </div>`;
  }

  /* ---------- 10. bülten ---------- */
  function newsletterHtml() {
    const list = adminSubscribers();
    return `<div class="admin-panel">
      <div class="admin-toolbar"><h3 style="margin:0">Bülten aboneleri (${list.length})</h3><span class="grow"></span>${list.length ? `<button class="button outline" data-export-subscribers>CSV indir</button>` : ""}</div>
      ${list.length ? `<table class="admin-table"><thead><tr><th>E-POSTA</th><th>KAYIT TARİHİ</th></tr></thead><tbody>
      ${list.map(s => `<tr><td>${esc(s.email)}</td><td><small>${dateTr(s.date)}</small></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Henüz abone yok.</div>`}
    </div>`;
  }

  /* ---------- 11. seo & sosyal ---------- */
  function seoHtml() {
    const s = state.settings;
    return `<div class="admin-panel"><h3>SEO ve sosyal medya</h3>
      <form id="seoForm" class="form-grid">
        <label class="field full">Site başlığı (tarayıcı sekmesi ve Google)<input name="seoTitle" value="${esc(s.seoTitle || "")}" maxlength="70"></label>
        <label class="field full">Site açıklaması (Google'da görünen özet)<textarea name="seoDescription" rows="2" maxlength="180">${esc(s.seoDescription || "")}</textarea></label>
        <label class="field">Instagram bağlantısı<input name="instagram" value="${esc(s.instagram || "")}" placeholder="https://instagram.com/volparia"></label>
        <label class="field">TikTok bağlantısı<input name="tiktok" value="${esc(s.tiktok || "")}" placeholder="https://tiktok.com/@volparia"></label>
        <label class="field">X (Twitter) bağlantısı<input name="twitter" value="${esc(s.twitter || "")}" placeholder="https://x.com/volparia"></label>
        <label class="field">WhatsApp numarası<input name="whatsapp" value="${esc(s.whatsapp || "")}" placeholder="905xxxxxxxxx"></label>
        <p class="form-note">Doldurulan sosyal bağlantılar mağaza alt bilgisinde ikon olarak görünür.</p>
        <div class="admin-form-actions"><button type="submit" class="button dark">Kaydet</button></div>
      </form></div>`;
  }

  /* ---------- 12. ayarlar ---------- */
  function settingsHtml() {
    const s = state.settings;
    return `<div class="admin-panel"><h3>Vitrin ve mağaza ayarları</h3>
      <form id="settingsForm" class="form-grid">
        <label class="field full">Duyuru bandı<input name="announcement" value="${esc(s.announcement)}"></label>
        <label class="field">Hero üst yazı<input name="heroEyebrow" value="${esc(s.heroEyebrow)}"></label>
        <label class="field">Hero başlık ( | ile iki satır)<input name="heroTitle" value="${esc(s.heroTitle)}"></label>
        <label class="field full">Hero açıklama<textarea name="heroCopy" rows="2">${esc(s.heroCopy)}</textarea></label>
        <label class="field">Ücretsiz kargo sınırı (₺)<input name="shippingThreshold" type="number" min="0" value="${esc(s.shippingThreshold)}"></label>
        <label class="field">Varsayılan kritik stok sınırı<input name="criticalStockDefault" type="number" min="1" value="${esc(s.criticalStockDefault)}"></label>
        <div class="field full"><span>Ödeme yöntemleri</span><div style="display:flex;gap:18px;margin-top:4px">
          <label class="check-row"><input type="checkbox" name="bankTransfer" ${s.bankTransfer ? "checked" : ""}>Havale / EFT</label>
          <label class="check-row"><input type="checkbox" name="cashOnDelivery" ${s.cashOnDelivery ? "checked" : ""}>Kapıda ödeme</label>
        </div></div>
        <label class="field">Destek e-posta<input name="supportEmail" value="${esc(s.supportEmail || "")}"></label>
        <label class="field">Destek telefon<input name="supportPhone" value="${esc(s.supportPhone || "")}"></label>
        <label class="field">Şirket / mağaza unvanı<input name="companyName" value="${esc(s.companyName || "")}" placeholder="Yasal metinlerde görünür"></label>
        <label class="field">Şirket adresi<input name="companyAddress" value="${esc(s.companyAddress || "")}" placeholder="Yasal metinlerde görünür"></label>
        <label class="field">Banka adı<input name="bankName" value="${esc(s.bankName || "")}"></label>
        <label class="field">Hesap sahibi<input name="accountHolder" value="${esc(s.accountHolder || "")}"></label>
        <label class="field full">IBAN<input name="iban" value="${esc(s.iban || "")}" placeholder="TR__ ____ ____ ____ ____ ____ __"></label>
        <div class="admin-form-actions"><button type="submit" class="button dark">Ayarları kaydet</button></div>
      </form></div>`;
  }

  /* ---------- 13. yedekleme ---------- */
  function backupsHtml() {
    return `<div class="admin-panel"><h3>Yedek al</h3>
      <p class="form-note" style="margin-bottom:14px">Ürünler, ayarlar, kuponlar, siparişler, yorumlar ve aboneler tek bir JSON dosyasına indirilir. Düzenli yedek almanızı öneririz.</p>
      <button class="button dark" data-export-backup>⤓ Yedek dosyasını indir</button>
    </div>
    <div class="admin-panel"><h3>Yedekten geri yükle</h3>
      <p class="form-note" style="margin-bottom:14px">Daha önce aldığınız yedek dosyasını seçin. <b>Ürünler, ayarlar ve kuponlar</b> yedekteki hâliyle değiştirilir${state.apiOnline ? " ve buluta yazılır" : ""}. Siparişler ve yorumlar yalnızca yerel kayda geri yüklenir.</p>
      <input type="file" id="importFile" accept="application/json" hidden>
      <button class="button outline" data-import-backup>Yedek dosyası seç…</button>
    </div>`;
  }

  /* ---------- 14. denetim ---------- */
  function auditHtml() {
    if (!state.apiOnline) return `<div class="admin-panel"><div class="empty">Denetim kaydı bulut bağlantısıyla tutulur. Bulut kurulumu tamamlandığında burada kim ne zaman ne değiştirdi görünür.</div></div>`;
    return `<div class="admin-panel"><h3>Denetim kaydı</h3><div id="auditList"><div class="empty">Yükleniyor…</div></div></div>`;
  }
  async function loadAudit() {
    try {
      const data = await api("/api/audit");
      const host = $("#auditList"); if (!host) return;
      const rows = data.audit || [];
      host.innerHTML = rows.length ? `<table class="admin-table"><thead><tr><th>TARİH</th><th>KİM</th><th>İŞLEM</th><th>DETAY</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><small>${dateTr(r.created_at)}</small></td><td>${esc(r.actor)}</td><td><span class="pill dim">${esc(r.action)}</span></td><td><small>${esc(r.entity_type)} · ${esc(r.entity_id || "")}</small></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Henüz kayıt yok.</div>`;
    } catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); }
  }

  /* ---------- kaydetme işlemleri ---------- */
  function collectSizes() {
    return $$("#sizeEditor .size-editor-row").map(row => ({
      name: row.querySelector(".sname").value.trim().toLocaleUpperCase("tr"),
      stock: Math.max(0, Number(row.querySelector(".sstock").value) || 0)
    })).filter(s => s.name);
  }
  async function saveProductForm(form) {
    const fd = new FormData(form);
    const isNew = form.dataset.isNew === "true";
    const id = form.dataset.productId;
    const sizes = collectSizes();
    if (!sizes.length) { toast("En az bir beden girin", false); return; }
    const skuVal = String(fd.get("sku")).trim().toUpperCase();
    const clash = adminProducts().find(p => p.id !== id && String(p.sku).toUpperCase() === skuVal);
    if (clash) { toast(`Bu ürün kodu zaten "${clash.name}" ürününde kullanılıyor`, false); return; }
    let imageUrl = String(fd.get("imageUrl")).trim();
    if (imageUrl.startsWith("data:") && state.apiOnline) {
      try { const up = await api("/api/images", { method: "POST", body: JSON.stringify({ data: imageUrl }) }); imageUrl = up.url; }
      catch { /* yükleme başarısızsa dataURL ile devam */ }
    }
    const product = {
      id, name: String(fd.get("name")).trim(), brand: String(fd.get("brand")).trim(), sku: skuVal,
      category: String(fd.get("category")), gender: String(fd.get("gender")),
      price: Math.max(0, Number(fd.get("price")) || 0),
      oldPrice: fd.get("oldPrice") ? Math.max(0, Number(fd.get("oldPrice")) || 0) : null,
      badge: String(fd.get("badge")).trim() || null,
      tags: [["tagNew", "new"], ["tagSale", "sale"], ["tagBest", "bestseller"]].filter(([f]) => fd.get(f)).map(([, t]) => t),
      tone: String(fd.get("tone")) || "#e8e2d6",
      description: String(fd.get("description")).trim(), fabric: String(fd.get("fabric")).trim(), care: String(fd.get("care")).trim(),
      imageUrl,
      criticalStock: Math.max(1, Number(fd.get("criticalStock")) || 5),
      active: Boolean(fd.get("active")), sizes
    };
    if (!product.name || !product.sku) { toast("Ürün adı ve ürün kodu zorunlu", false); return; }
    if (state.apiOnline) {
      try { await api(`/api/products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(product) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await bootstrapData(); await loadAdminData();
    } else {
      const idx = state.products.findIndex(p => p.id === id);
      if (idx >= 0) state.products[idx] = product; else state.products.push(product);
      persist();
    }
    state.admin.editing = null;
    renderAdmin();
    toast(isNew ? "Ürün eklendi" : "Ürün güncellendi");
  }
  async function deleteProductById(id) {
    const p = adminProducts().find(x => x.id === id); if (!p) return;
    if (!confirm(`"${p.name}" (${p.sku}) kalıcı olarak silinsin mi?`)) return;
    if (state.apiOnline) {
      try { await api(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await bootstrapData(); await loadAdminData();
    } else {
      state.products = state.products.filter(x => x.id !== id);
      persist();
    }
    renderAdmin(); toast("Ürün silindi");
  }
  async function saveStockRow(id) {
    const row = $(`[data-stock-row="${CSS.escape(id)}"]`); if (!row) return;
    const source = adminProducts().find(p => p.id === id); if (!source) return;
    const product = structuredClone(source);
    $$("input[data-size-index]", row).forEach(input => {
      const i = Number(input.dataset.sizeIndex);
      if (product.sizes[i]) product.sizes[i].stock = Math.max(0, Number(input.value) || 0);
    });
    if (state.apiOnline) {
      try { await api(`/api/products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(product) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await bootstrapData(); await loadAdminData();
    } else {
      const idx = state.products.findIndex(p => p.id === id);
      if (idx >= 0) state.products[idx] = product;
      persist();
    }
    renderAdmin(); toast(`${product.name} stoğu güncellendi`);
  }
  async function updateOrder(id, patch) {
    if (state.apiOnline) {
      try { await api(`/api/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await loadAdminData();
    } else {
      const o = state.orders.find(x => x.id === id);
      if (o) { if (patch.status) o.status = patch.status; if (patch.paymentStatus) o.paymentStatus = patch.paymentStatus; }
      persist();
    }
    toast("Sipariş güncellendi");
  }
  async function saveSettingsPartial(patch) {
    const next = { ...state.settings, ...patch };
    if (state.apiOnline) {
      try { await api("/api/settings", { method: "PUT", body: JSON.stringify(next) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return false; }
    }
    state.settings = next; persist();
    return true;
  }
  async function saveCoupon(coupon) {
    if (state.apiOnline) {
      try { await api(`/api/coupons/${encodeURIComponent(coupon.code)}`, { method: "PUT", body: JSON.stringify(coupon) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await loadAdminData();
    } else {
      const idx = state.coupons.findIndex(c => c.code === coupon.code);
      if (idx >= 0) state.coupons[idx] = { ...state.coupons[idx], ...coupon }; else state.coupons.push({ ...coupon, usedCount: 0 });
      persist(); renderAdmin();
    }
    toast(`${coupon.code} kaydedildi`);
  }
  async function deleteCoupon(code) {
    if (!confirm(`${code} kuponu silinsin mi?`)) return;
    if (state.apiOnline) {
      try { await api(`/api/coupons/${encodeURIComponent(code)}`, { method: "DELETE" }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await loadAdminData();
    } else { state.coupons = state.coupons.filter(c => c.code !== code); persist(); renderAdmin(); }
    toast("Kupon silindi");
  }
  async function moderateReview(id, status) {
    if (state.apiOnline) {
      try { await api(`/api/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await bootstrapData(); await loadAdminData();
    } else {
      const r = state.reviews.find(x => x.id === id); if (r) r.status = status;
      persist(); renderAdmin();
    }
    toast(status === "approved" ? "Yorum yayınlandı" : "Yorum reddedildi");
  }
  async function deleteReview(id) {
    if (!confirm("Yorum kalıcı olarak silinsin mi?")) return;
    if (state.apiOnline) {
      try { await api(`/api/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return; }
      await loadAdminData();
    } else { state.reviews = state.reviews.filter(r => r.id !== id); persist(); renderAdmin(); }
    toast("Yorum silindi");
  }
  function exportBackup() {
    const backup = {
      exportedAt: new Date().toISOString(), store: "VOLPARIA",
      products: adminProducts(), settings: state.settings, coupons: adminCoupons(),
      orders: adminOrders(), reviews: adminReviews(), subscribers: adminSubscribers()
    };
    download(`volparia-yedek-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
    toast("Yedek indirildi");
  }
  async function importBackup(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch { toast("Dosya okunamadı — geçerli bir yedek dosyası seçin", false); return; }
    if (!Array.isArray(data.products)) { toast("Bu dosya bir VOLPARIA yedeği değil", false); return; }
    if (!confirm(`${dateTr(data.exportedAt)} tarihli yedek geri yüklensin mi? Mevcut ürünler, ayarlar ve kuponlar değiştirilecek.`)) return;
    state.products = data.products;
    if (data.settings) state.settings = { ...defaultSettings, ...data.settings };
    if (Array.isArray(data.coupons)) state.coupons = data.coupons;
    if (Array.isArray(data.orders)) state.orders = data.orders.map(o => ({ ...o, orderNo: o.orderNo || o.order_no, createdAt: o.createdAt || o.created_at }));
    if (Array.isArray(data.reviews)) state.reviews = data.reviews;
    if (Array.isArray(data.subscribers)) state.subscribers = data.subscribers;
    persist();
    if (state.apiOnline) {
      toast("Yedek buluta yazılıyor…");
      try {
        for (const p of state.products) await api(`/api/products/${encodeURIComponent(p.id)}`, { method: "PUT", body: JSON.stringify(p) });
        for (const c of state.coupons) await api(`/api/coupons/${encodeURIComponent(c.code)}`, { method: "PUT", body: JSON.stringify(c) });
        await api("/api/settings", { method: "PUT", body: JSON.stringify(state.settings) });
        await bootstrapData(); await loadAdminData();
      } catch (err) { if (!handleSessionExpiry(err)) toast(`Buluta yazılırken hata: ${err.message}`, false); return; }
    }
    renderAdmin();
    toast("Yedek geri yüklendi");
  }

  /* ---------- form bağlama ---------- */
  function rebindSearch(inputId, htmlFn) {
    const el = $(inputId); if (!el) return;
    el.oninput = () => {
      const map = { "#adminProductSearch": "productQuery", "#adminStockSearch": "productQuery", "#adminOrderSearch": "orderQuery", "#adminCustomerSearch": "customerQuery" };
      state.admin[map[inputId]] = el.value;
      const panel = el.closest(".admin-panel");
      panel.outerHTML = htmlFn();
      bindForms();
      const fresh = $(inputId); fresh.focus(); fresh.setSelectionRange(fresh.value.length, fresh.value.length);
    };
  }
  function bindForms() {
    const pf = $("#productForm"); if (pf) pf.onsubmit = e => { e.preventDefault(); saveProductForm(pf); };
    const bf = $("#bundleForm"); if (bf) {
      bf.onsubmit = e => { e.preventDefault(); saveBundleForm(bf); };
      bf.addEventListener("change", e => { if (e.target.name === "member" || e.target.id === "bundleDiscInput") recalcBundlePreview(); });
      bf.addEventListener("input", e => { if (e.target.id === "bundleDiscInput") recalcBundlePreview(); });
    }
    const sf = $("#settingsForm"); if (sf) sf.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(sf);
      const ok = await saveSettingsPartial({
        announcement: String(fd.get("announcement")), heroEyebrow: String(fd.get("heroEyebrow")),
        heroTitle: String(fd.get("heroTitle")), heroCopy: String(fd.get("heroCopy")),
        shippingThreshold: Math.max(0, Number(fd.get("shippingThreshold")) || 0),
        criticalStockDefault: Math.max(1, Number(fd.get("criticalStockDefault")) || 5),
        bankTransfer: Boolean(fd.get("bankTransfer")), cashOnDelivery: Boolean(fd.get("cashOnDelivery")),
        supportEmail: String(fd.get("supportEmail")).trim(), supportPhone: String(fd.get("supportPhone")).trim(),
        companyName: String(fd.get("companyName")).trim(), companyAddress: String(fd.get("companyAddress")).trim(),
        bankName: String(fd.get("bankName")).trim(), accountHolder: String(fd.get("accountHolder")).trim(),
        iban: String(fd.get("iban")).trim()
      });
      if (ok) toast("Ayarlar kaydedildi");
    };
    const seoF = $("#seoForm"); if (seoF) seoF.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(seoF);
      const ok = await saveSettingsPartial({
        seoTitle: String(fd.get("seoTitle")).trim(), seoDescription: String(fd.get("seoDescription")).trim(),
        instagram: String(fd.get("instagram")).trim(), tiktok: String(fd.get("tiktok")).trim(),
        twitter: String(fd.get("twitter")).trim(), whatsapp: String(fd.get("whatsapp")).trim()
      });
      if (ok) toast("SEO ve sosyal ayarları kaydedildi");
    };
    const cf = $("#couponForm"); if (cf) cf.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(cf);
      const code = String(fd.get("code")).trim().toUpperCase();
      if (!/^[A-Z0-9-]{3,24}$/.test(code)) { toast("Kupon kodu 3-24 harf/rakam olmalı", false); return; }
      saveCoupon({
        code, type: fd.get("type") === "fixed" ? "fixed" : "percent",
        value: Math.max(1, Number(fd.get("value")) || 0),
        minTotal: Math.max(0, Number(fd.get("minTotal")) || 0),
        usageLimit: fd.get("usageLimit") ? Math.max(1, Number(fd.get("usageLimit"))) : null,
        active: Boolean(fd.get("active"))
      });
    };
    const posG = $("#posGeneralForm"); if (posG) posG.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(posG);
      const ok = await saveSettingsPartial({
        provider: fd.get("provider") === "paytr" ? "paytr" : "iyzico",
        testMode: Boolean(fd.get("testMode")),
        installments: [2, 3, 6, 9, 12].filter(n => fd.get(`inst${n}`))
      });
      if (ok) { await bootstrapData(); renderAdmin(); toast("POS genel ayarları kaydedildi"); }
    };
    const savePosCreds = async payload => {
      try { await api("/api/pos/credentials", { method: "PUT", body: JSON.stringify(payload) }); }
      catch (err) { if (!handleSessionExpiry(err)) toast(err.message, false); return false; }
      await bootstrapData(); await loadAdminData();
      toast("POS bilgileri şifrelenerek kaydedildi — kart ödemesi aktif");
      return true;
    };
    const posI = $("#posIyzicoForm"); if (posI) posI.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(posI);
      savePosCreds({ provider: "iyzico", apiKey: String(fd.get("apiKey")).trim(), secretKey: String(fd.get("secretKey")).trim(), sandbox: Boolean(fd.get("sandbox")) });
    };
    const posP = $("#posPaytrForm"); if (posP) posP.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(posP);
      savePosCreds({ provider: "paytr", merchantId: String(fd.get("merchantId")).trim(), merchantKey: String(fd.get("merchantKey")).trim(), merchantSalt: String(fd.get("merchantSalt")).trim() });
    };
    const contentSel = $("#contentPageSelect"); if (contentSel) contentSel.onchange = () => { state.admin.contentKey = contentSel.value; renderAdmin(); };
    const contentF = $("#contentForm"); if (contentF) contentF.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(contentF);
      const pages = { ...(state.settings.pages || {}) };
      pages[state.admin.contentKey] = { title: String(fd.get("title")).slice(0, 120), body: String(fd.get("body")).slice(0, 12000) };
      const ok = await saveSettingsPartial({ pages });
      if (ok) { renderAdmin(); toast("İçerik kaydedildi"); }
    };
    const imgFile = $("#imageFile"); if (imgFile) imgFile.onchange = async () => {
      const file = imgFile.files[0]; if (!file) return;
      try {
        const dataUrl = await compressImage(file);
        $("#imageUrlInput").value = dataUrl;
        $("#imgPreviewBox").innerHTML = `<img class="img-preview" src="${dataUrl}" alt="">`;
        $("[data-clear-image]").hidden = false;
        toast("Görsel hazır — kaydetmeyi unutmayın");
      } catch { toast("Görsel yüklenemedi", false); }
    };
    rebindSearch("#adminProductSearch", productsHtml);
    rebindSearch("#adminStockSearch", stockHtml);
    rebindSearch("#adminOrderSearch", ordersHtml);
    rebindSearch("#adminCustomerSearch", customersHtml);
    const importInput = $("#importFile"); if (importInput) importInput.onchange = () => { const f = importInput.files[0]; if (f) importBackup(f); importInput.value = ""; };
  }

  /* ---------- olaylar ---------- */
  document.addEventListener("click", e => {
    const closest = sel => e.target.closest(sel);
    let el;
    if (closest("#adminLogout")) { state.token = ""; sessionStorage.removeItem("volparia_admin_token"); showLogin(); return; }
    if ((el = closest("[data-admin-view]"))) { state.adminView = el.dataset.adminView; state.admin.editing = null; renderAdmin(); return; }
    if (closest("[data-new-product]")) { state.adminView = "products"; state.admin.editing = "new"; renderAdmin(); return; }
    if (closest("[data-new-bundle]")) { state.admin.bundleEdit = "new"; renderAdmin(); return; }
    if ((el = closest("[data-edit-bundle]"))) { state.admin.bundleEdit = el.dataset.editBundle; renderAdmin(); return; }
    if (closest("[data-cancel-bundle]")) { state.admin.bundleEdit = null; renderAdmin(); return; }
    if ((el = closest("[data-delete-bundle]"))) { deleteBundle(el.dataset.deleteBundle); return; }
    if ((el = closest("[data-edit-product]"))) { state.adminView = "products"; state.admin.editing = el.dataset.editProduct; renderAdmin(); return; }
    if (closest("[data-cancel-edit]")) { state.admin.editing = null; renderAdmin(); return; }
    if ((el = closest("[data-delete-product]"))) { deleteProductById(el.dataset.deleteProduct); return; }
    if ((el = closest("[data-save-stock]"))) { saveStockRow(el.dataset.saveStock); return; }
    if (closest("[data-add-size]")) { $("#sizeEditor").insertAdjacentHTML("beforeend", sizeEditorRow()); return; }
    if (closest("[data-preset-sizes]")) { $("#sizeEditor").innerHTML = DEFAULT_SIZES.map(n => sizeEditorRow(n, 0)).join(""); return; }
    if ((el = closest("[data-remove-size]"))) { el.closest(".size-editor-row").remove(); return; }
    if (closest("[data-pick-image]")) { $("#imageFile").click(); return; }
    if (closest("[data-clear-image]")) { $("#imageUrlInput").value = ""; $("#imgPreviewBox").innerHTML = `<div class="img-preview placeholder">${hangerSvg}</div>`; e.target.closest("[data-clear-image]").hidden = true; return; }
    if ((el = closest("[data-toggle-coupon]"))) { const c = adminCoupons().find(x => x.code === el.dataset.toggleCoupon); if (c) saveCoupon({ ...c, active: c.active === false }); return; }
    if ((el = closest("[data-delete-coupon]"))) { deleteCoupon(el.dataset.deleteCoupon); return; }
    if ((el = closest("[data-review-status]"))) { moderateReview(el.dataset.reviewStatus, el.dataset.status); return; }
    if ((el = closest("[data-delete-review]"))) { deleteReview(el.dataset.deleteReview); return; }
    if (closest("[data-export-backup]")) { exportBackup(); return; }
    if (closest("[data-import-backup]")) { $("#importFile").click(); return; }
    if (closest("[data-export-subscribers]")) {
      const rows = adminSubscribers().map(s => `${s.email};${s.date || ""}`).join("\n");
      download("volparia-aboneler.csv", "email;kayit_tarihi\n" + rows, "text/csv");
      return;
    }
    /* kategoriler */
    if (closest("[data-cat-add]")) {
      const input = $("#newCategoryInput"); const name = input.value.trim();
      if (!name) return;
      const cats = collectCategoryInputs(); cats.push(name);
      state.settings.categories = cats; renderAdmin(); return;
    }
    if ((el = closest("[data-cat-remove]"))) { const cats = collectCategoryInputs(); cats.splice(Number(el.dataset.catRemove), 1); state.settings.categories = cats; renderAdmin(); return; }
    if ((el = closest("[data-cat-up]"))) { const i = Number(el.dataset.catUp); const cats = collectCategoryInputs(); [cats[i - 1], cats[i]] = [cats[i], cats[i - 1]]; state.settings.categories = cats; renderAdmin(); return; }
    if ((el = closest("[data-cat-down]"))) { const i = Number(el.dataset.catDown); const cats = collectCategoryInputs(); [cats[i + 1], cats[i]] = [cats[i], cats[i + 1]]; state.settings.categories = cats; renderAdmin(); return; }
    if (closest("[data-cat-save]")) {
      const cats = collectCategoryInputs().filter(Boolean);
      if (!cats.length) { toast("En az bir kategori gerekli", false); return; }
      saveSettingsPartial({ categories: cats }).then(ok => { if (ok) { renderAdmin(); toast("Kategoriler kaydedildi"); } });
      return;
    }
    if (closest("[data-content-reset]")) {
      const pages = { ...(state.settings.pages || {}) };
      delete pages[state.admin.contentKey];
      saveSettingsPartial({ pages }).then(ok => { if (ok) { renderAdmin(); toast("Varsayılan metne dönüldü"); } });
      return;
    }
  });
  function collectCategoryInputs() { return $$("[data-cat-name]").map(i => i.value.trim()).filter(Boolean); }

  document.addEventListener("change", e => {
    const st = e.target.closest("[data-order-status]");
    if (st) { updateOrder(st.dataset.orderStatus, { status: st.value }); return; }
    const ps = e.target.closest("[data-order-pay]");
    if (ps) { updateOrder(ps.dataset.orderPay, { paymentStatus: ps.value }); return; }
  });

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#loginMessage");
    msg.textContent = "Giriş yapılıyor…";
    try { await login($("#adminUsername").value.trim(), $("#adminPassword").value); msg.textContent = "Güvenli yönetim oturumu"; }
    catch (err) { msg.textContent = err.message; msg.style.color = "var(--danger)"; setTimeout(() => { msg.style.color = ""; msg.textContent = "Güvenli yönetim oturumu"; }, 3000); }
  });
  $("#showPassword").addEventListener("click", () => {
    const input = $("#adminPassword");
    input.type = input.type === "password" ? "text" : "password";
    $("#showPassword").textContent = input.type === "password" ? "Göster" : "Gizle";
  });

  /* ---------- başlangıç ---------- */
  setStorageIndicator(false);
  (async () => {
    await bootstrapData();
    if (state.token && state.apiOnline) showAdmin();
    startSync();
  })();
})();
