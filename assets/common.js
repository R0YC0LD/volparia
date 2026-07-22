/* VOLPARIA — ortak çekirdek: yapılandırma, yardımcılar, veri modeli, yasal içerik */
"use strict";

const CONFIG = window.VOLPARIA_CONFIG || {};
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = v => new Intl.NumberFormat("tr-TR", { style: "currency", currency: CONFIG.currency || "TRY", maximumFractionDigits: 0 }).format(v);
const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dateTr = v => v ? new Date(v.includes("T") || v.includes(" ") ? v.replace(" ", "T") + (v.endsWith("Z") ? "" : "Z") : v).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/* ---------- marka: tilki logosu ve ikonlar ---------- */
const foxMark = `<svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M44 10 C45 13.5 46.3 16 48.5 18 L50.5 17.5 L53 9 C55.5 11.5 57 14 58 17 C61.5 18.5 64.5 21 67 24.5 L69.5 27.5 C65 30 60.5 30.3 56 28.8 C52 32.5 49.3 37 47.8 42 C46.6 46.5 46.6 51 48 56 C44.5 52.5 42.8 48 42.3 42.8 L39.8 41.8 L42.4 39.6 C42 34 42.6 28 43.2 22 L40.8 21 L43.4 19 C43.3 15.8 43.6 12.8 44 10 Z"/><path d="M57.5 31.5 C64 37 67.5 43.5 67.5 50.5 C67.5 58 63.5 65 56.5 70 C50 74.5 42.5 76.5 35 75.8 C27.8 75.1 21.5 72.4 16.5 67.8 C14.3 69.6 12.7 71.9 11.7 74.5 C15 74.8 18.2 74.1 21.2 72.7 C19.6 76.6 17.4 79.6 14.5 82 C20.8 83.4 27 82.8 33 80.5 C41.5 77.2 48.5 72 53.8 65 C55.8 60.5 56 54.5 55.6 48.5 C55.2 42 55.8 36 57.5 31.5 Z"/></svg>`;
const hangerSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6a2 2 0 1 1 2-2"/><path d="M12 6l-9 7.5a1.4 1.4 0 0 0 .9 2.5h16.2a1.4 1.4 0 0 0 .9-2.5L12 6z"/></svg>`;
const heartSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5C7.5 17.2 3 13.6 3 9.3 3 6.4 5.2 4.5 7.7 4.5c1.8 0 3.3 1 4.3 2.6 1-1.6 2.5-2.6 4.3-2.6 2.5 0 4.7 1.9 4.7 4.8 0 4.3-4.5 7.9-9 11.2z"/></svg>`;
const starFull = "★", starEmpty = "☆";
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`,
  products: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3a4 4 0 0 1-8 0z"/></svg>`,
  stock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>`,
  coupons: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2.4 2.4 0 0 0 0 8v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2.4 2.4 0 0 0 0-8z"/><path d="M14 5v2.5M14 11v2M14 16.5V19"/></svg>`,
  reviews: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.7 6.6 19.6l1.1-6L3.2 9.4l6.1-.8L12 3z"/></svg>`,
  customers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="8" r="3.4"/><path d="M3.5 20c.6-3.6 2.6-5.4 5.5-5.4S13.9 16.4 14.5 20"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.8c2.5.1 4.1 1.7 4.6 4.6"/></svg>`,
  categories: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6.6l9 9-6.6 6.6-9-9V4z"/><circle cx="8.5" cy="8.5" r="1.3"/></svg>`,
  content: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 3h9l4 4v14H6V3z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>`,
  newsletter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>`,
  seo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>`,
  backups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0 4-4m-4 4-4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
  audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/></svg>`,
  pos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9.5h18M7 15h4"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4v10.5a4 4 0 1 1-3.5-4"/><path d="M14.5 5.5c.8 2 2.4 3.2 4.5 3.5"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 7 9.5L4.5 20M20 4l-6.6 7.5M13.4 11.5 20 20h-4.5L11 13.5"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M9 8.8c.5 2.6 2.4 4.8 5.2 5.9l1.5-1.4-2.2-1-1 .7c-1-.6-1.7-1.4-2.2-2.4l.8-.9-1.1-2-1 1.1z"/></svg>`
};

/* ---------- sabitler ---------- */
const GENDERS = { kadin: "Kadın", erkek: "Erkek", unisex: "Unisex", cocuk: "Çocuk" };
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const DEFAULT_CATEGORIES = ["Üst Giyim", "Alt Giyim", "Dış Giyim", "Elbise", "İç Giyim", "Aksesuar", "Ayakkabı"];
const orderStatusTr = { new: "Yeni", preparing: "Hazırlanıyor", shipped: "Kargoda", complete: "Tamamlandı", cancelled: "İptal" };
const payStatusTr = { awaiting: "Ödeme bekleniyor", paid: "Ödendi", refunded: "İade edildi" };

const seedProducts = [
  { id: "g1", name: "Oversize Basic Tişört", brand: "VOLPARIA Essentials", sku: "VLP-TS-001", category: "Üst Giyim", gender: "unisex", price: 449, oldPrice: null, badge: "Yeni", tags: ["new", "bestseller"], tone: "#e8e2d6", description: "Ağır gramajlı pamuktan, düşük omuzlu ve rahat kesim tişört. Gardırobun en çok çalışan parçası.", fabric: "%100 organik pamuk, 240 gr/m²", care: "30°C'de tersten yıkayın, kurutucu kullanmayın.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "XS", stock: 8 }, { name: "S", stock: 12 }, { name: "M", stock: 15 }, { name: "L", stock: 11 }, { name: "XL", stock: 7 }, { name: "XXL", stock: 4 }] },
  { id: "g2", name: "Premium Keten Gömlek", brand: "VOLPARIA", sku: "VLP-GM-014", category: "Üst Giyim", gender: "erkek", price: 1290, oldPrice: 1590, badge: null, tags: ["sale"], tone: "#dfe4e0", description: "Nefes alan saf keten kumaş, sedef düğmeler ve rahat yaka. Ofisten tatile aynı zarafet.", fabric: "%100 Avrupa keteni", care: "Düşük ısıda ütüleyin, hafif kırışıklık dokunun doğasıdır.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "S", stock: 6 }, { name: "M", stock: 9 }, { name: "L", stock: 0 }, { name: "XL", stock: 5 }, { name: "XXL", stock: 3 }] },
  { id: "g3", name: "Yüksek Bel Wide-Leg Pantolon", brand: "VOLPARIA", sku: "VLP-PN-022", category: "Alt Giyim", gender: "kadin", price: 1190, oldPrice: null, badge: "Çok Satan", tags: ["bestseller"], tone: "#e6ddd2", description: "Dökümlü kumaşı ve yüksek beliyle bacak boyunu uzatan, zamansız bir wide-leg kesim.", fabric: "%64 viskon, %33 poliamid, %3 elastan", care: "Hassas programda yıkayın.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "34", stock: 5 }, { name: "36", stock: 9 }, { name: "38", stock: 12 }, { name: "40", stock: 8 }, { name: "42", stock: 4 }, { name: "44", stock: 2 }] },
  { id: "g4", name: "Slim Fit Chino Pantolon", brand: "VOLPARIA", sku: "VLP-PN-031", category: "Alt Giyim", gender: "erkek", price: 990, oldPrice: null, badge: null, tags: ["new"], tone: "#ddd6c8", description: "Hafif streçli gabardin kumaştan, günlük ve şık dengesini kuran slim fit chino.", fabric: "%97 pamuk, %3 elastan", care: "30°C'de yıkayın.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "30", stock: 7 }, { name: "31", stock: 10 }, { name: "32", stock: 13 }, { name: "33", stock: 6 }, { name: "34", stock: 8 }, { name: "36", stock: 5 }] },
  { id: "g5", name: "Kaşmir Karışım Triko Kazak", brand: "VOLPARIA Atelier", sku: "VLP-TR-008", category: "Üst Giyim", gender: "unisex", price: 1890, oldPrice: 2290, badge: "Fırsat", tags: ["sale", "bestseller"], tone: "#e4d9cb", description: "Kaşmir dokunuşlu, ekstra yumuşak örgü. Tek başına ya da katman olarak dört mevsim asalet.", fabric: "%70 yün, %20 kaşmir, %10 poliamid", care: "Elde veya yün programında yıkayın, sererek kurutun.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "S", stock: 1 }, { name: "M", stock: 2 }, { name: "L", stock: 1 }, { name: "XL", stock: 0 }] },
  { id: "g6", name: "Midi Boy Örme Elbise", brand: "VOLPARIA", sku: "VLP-EL-005", category: "Elbise", gender: "kadin", price: 1490, oldPrice: null, badge: "Yeni", tags: ["new"], tone: "#e9dcd8", description: "Vücudu saran fitilli örgüsü ve midi boyuyla gündüzden akşama geçiş yapan zarif elbise.", fabric: "%80 viskon, %20 poliamid", care: "Hassas programda yıkayın, askıda saklamayın.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "XS", stock: 4 }, { name: "S", stock: 0 }, { name: "M", stock: 7 }, { name: "L", stock: 6 }, { name: "XL", stock: 3 }] },
  { id: "g7", name: "Çocuk Pamuklu Sweatshirt", brand: "VOLPARIA Kids", sku: "VLP-CK-012", category: "Üst Giyim", gender: "cocuk", price: 549, oldPrice: null, badge: null, tags: [], tone: "#dde6e2", description: "İçi yumuşacık şardonlu, dikişsiz yaka detaylı çocuk sweatshirt. Okulda ve parkta konfor.", fabric: "%95 pamuk, %5 elastan", care: "30°C'de yıkayın.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "4-5Y", stock: 9 }, { name: "6-7Y", stock: 11 }, { name: "8-9Y", stock: 8 }, { name: "10-11Y", stock: 6 }, { name: "12-13Y", stock: 4 }] },
  { id: "g8", name: "Limited Yün Trençkot", brand: "VOLPARIA Atelier", sku: "VLP-DC-003", category: "Dış Giyim", gender: "kadin", price: 3490, oldPrice: null, badge: "Limited", tags: ["bestseller"], tone: "#d8cfc0", description: "Sınırlı sayıda üretilen, yün karışımlı kumaşı ve kemer detayıyla ikonik trençkot.", fabric: "%55 yün, %45 polyester", care: "Yalnızca kuru temizleme.", imageUrl: "", criticalStock: 5, active: true, sizes: [{ name: "S", stock: 0 }, { name: "M", stock: 0 }, { name: "L", stock: 0 }] }
];

const defaultSettings = {
  announcement: "₺2.000 ve üzeri alışverişlerde kargo bizden · 15.00'e kadar aynı gün gönderim",
  heroEyebrow: "SEZONUN ZAMANSIZ PARÇALARI",
  heroTitle: "Sade giyin.|Asil kal.",
  heroCopy: "Her cinsiyete ve her bedene uygun, özenle seçilmiş koleksiyon. Kaliteli kumaş, dürüst işçilik, zamansız kesim.",
  shippingThreshold: 2000,
  criticalStockDefault: 5,
  bankTransfer: true, cashOnDelivery: true,
  provider: "iyzico", testMode: true, installments: [2, 3, 6],
  supportEmail: "destek@volparia.com", supportPhone: "0850 000 00 00",
  bankName: "", iban: "", accountHolder: "",
  companyName: "VOLPARIA Giyim", companyAddress: "",
  categories: DEFAULT_CATEGORIES,
  seoTitle: "VOLPARIA — Sade Giyin, Asil Kal",
  seoDescription: "Her cinsiyete ve her bedene uygun, özenle seçilmiş zamansız parçalar. Minimal ve asil giyim mağazası.",
  instagram: "", tiktok: "", twitter: "", whatsapp: "",
  bundles: [
    { id: "b1", name: "Ofis Şıklığı Kombini", description: "Keten gömlek ve slim chino ile ofisten davete zamansız bir duruş.", productIds: ["g2", "g4"], discountPercent: 15, badge: "Kombin", tone: "#e4d8c6", active: true },
    { id: "b2", name: "Hafta Sonu Rahatlığı", description: "Oversize tişört ve kaşmir karışım kazak; katmanlı, konforlu, şık.", productIds: ["g1", "g5"], discountPercent: 18, badge: "Çok Tutulan", tone: "#eee0c9", active: true }
  ],
  pages: {}
};

/* ---------- yasal ve bilgi sayfaları (admin panelinden düzenlenebilir) ---------- */
const basePages = {
  about: { title: "Hakkımızda", body: "<p>{SIRKET}, giyinmeyi bir gösteriş değil bir duruş olarak gören herkes için kuruldu. Az ama öz bir gardırop; iyi kesim, iyi kumaş ve dürüst işçilikle mümkün.</p><h3>Değerlerimiz</h3><p><b>Kalite</b> — Her parça, kumaşından dikişine editör ekibimizin denetiminden geçer.<br><b>Kapsayıcılık</b> — Kadın, erkek, unisex ve çocuk; XS'ten 3XL'e gerçek beden stoğu.<br><b>Dürüstlük</b> — Şeffaf fiyat, açık içerik bilgisi, koşulsuz 14 gün iade.</p>" },
  contact: { title: "İletişim", body: "" },
  shipping: { title: "Kargo ve Teslimat", body: "<p>Saat 15.00'e kadar onaylanan siparişler aynı iş günü kargoya teslim edilir. Kargo takip numaranız, siparişiniz yola çıktığında tarafınıza iletilir.</p><p>Belirlenen sepet tutarının üzerindeki siparişlerde standart kargo ücretsizdir. Teslimat süresi bulunduğunuz bölgeye göre 1-3 iş günüdür.</p><p>Hasarlı teslimatlarda paketi teslim almadan tutanak tutulmasını sağlayın ve aynı gün destek ekibimize ulaşın.</p>" },
  returns: { title: "İade ve Değişim", body: "<p>Teslim tarihinden itibaren <b>14 gün</b> içinde, etiketi sökülmemiş, kullanılmamış ve yıkanmamış ürünler için iade veya değişim talebi oluşturabilirsiniz.</p><p><b>Beden uymadı mı?</b> İlk beden değişiminde kargo ücreti bizden.</p><p>İade talebiniz onaylandıktan sonra ücret iadesi, ödeme yönteminize göre 3-10 iş günü içinde gerçekleştirilir.</p><p>İç giyim ürünlerinde hijyen nedeniyle ambalajı açılmış ürünler iade kapsamı dışındadır.</p>" },
  sizes: { title: "Beden Rehberi", body: "<p>Ölçüleriniz iki beden arasındaysa, rahat kesimlerde küçük bedeni, slim kesimlerde büyük bedeni öneririz.</p><table><tr><th>Beden</th><th>Göğüs (cm)</th><th>Bel (cm)</th><th>Kalça (cm)</th></tr><tr><td>XS</td><td>82-86</td><td>62-66</td><td>88-92</td></tr><tr><td>S</td><td>86-90</td><td>66-70</td><td>92-96</td></tr><tr><td>M</td><td>90-96</td><td>70-76</td><td>96-102</td></tr><tr><td>L</td><td>96-102</td><td>76-82</td><td>102-108</td></tr><tr><td>XL</td><td>102-110</td><td>82-90</td><td>108-114</td></tr><tr><td>XXL</td><td>110-118</td><td>90-100</td><td>114-122</td></tr></table><p>Emin olamadığınız durumlarda destek hattımızdan beden danışmanlığı alabilirsiniz.</p>" },
  faq: { title: "Sık Sorulan Sorular", body: "<h3>Siparişim ne zaman kargoya verilir?</h3><p>15.00'e kadar onaylanan siparişler aynı iş günü kargoya verilir.</p><h3>Hangi ödeme yöntemleri geçerli?</h3><p>Havale/EFT ve kapıda ödeme seçenekleri sunulmaktadır.</p><h3>Beden değişimi ücretli mi?</h3><p>İlk beden değişiminde kargo ücreti mağazamıza aittir.</p><h3>Kupon kodumu nasıl kullanırım?</h3><p>Sepet ekranındaki kupon alanına kodunuzu yazıp \"Uygula\" düğmesine basın.</p><h3>Ürünlerin bedenleri neden bazen üstü çizili görünüyor?</h3><p>Üzeri çizili beden, o bedenin stokta tükendiğini gösterir. Stok yenilendiğinde tekrar seçilebilir olur.</p>" },
  kvkk: { title: "KVKK Aydınlatma Metni", body: "<p>İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") uyarınca, veri sorumlusu sıfatıyla <b>{SIRKET}</b> tarafından kişisel verilerinizin işlenmesine ilişkin olarak sizleri bilgilendirmek amacıyla hazırlanmıştır.</p><h3>İşlenen Kişisel Veriler</h3><p>Ad-soyad, telefon numarası, e-posta adresi, teslimat adresi ve sipariş bilgileriniz; siparişinizin oluşturulması, teslimatı ve satış sonrası destek süreçleri için işlenir.</p><h3>İşleme Amaçları ve Hukuki Sebep</h3><p>Verileriniz; sözleşmenin kurulması ve ifası (KVKK m.5/2-c), hukuki yükümlülüklerin yerine getirilmesi (m.5/2-ç) ve açık rızanıza dayalı olarak ticari elektronik ileti gönderimi amaçlarıyla işlenir.</p><h3>Aktarım</h3><p>Verileriniz yalnızca teslimatın sağlanması amacıyla kargo firmalarına ve yasal zorunluluk hâlinde yetkili kamu kurumlarına aktarılır; bunun dışında üçüncü kişilerle paylaşılmaz.</p><h3>Saklama Süresi</h3><p>Kişisel verileriniz, ilgili mevzuatta öngörülen süreler (ör. 6563 sayılı Kanun ve vergi mevzuatı) boyunca saklanır, sürenin sonunda silinir veya anonim hâle getirilir.</p><h3>Haklarınız</h3><p>KVKK'nın 11. maddesi kapsamında; verilerinize erişme, düzeltme, silme, işlemeye itiraz etme ve diğer haklarınızı kullanmak için <b>{EPOSTA}</b> adresine başvurabilirsiniz. Başvurunuz en geç 30 gün içinde yanıtlanır.</p>" },
  privacy: { title: "Gizlilik Politikası", body: "<p>{SIRKET} olarak gizliliğinize saygı duyuyoruz. Kişisel verileriniz yalnızca sipariş, teslimat ve destek süreçleri için işlenir; üçüncü kişilere pazarlama amacıyla satılmaz veya kiralanmaz.</p><p>Ödeme sürecinde kart bilgileri tarafımızca görüntülenmez ve saklanmaz.</p><p>Sitemizde oturumunuzu ve sepetinizi hatırlamak için yalnızca zorunlu yerel depolama (localStorage) kullanılır; üçüncü taraf reklam/izleme çerezi kullanılmaz. Ayrıntılar için <b>Çerez Politikası</b> sayfamızı inceleyebilirsiniz.</p>" },
  cookies: { title: "Çerez Politikası", body: "<p>Bu politika, sitemizde kullanılan çerez ve benzeri teknolojiler hakkında bilgi verir.</p><h3>Zorunlu Çerezler / Yerel Depolama</h3><p>Sepetinizin, favorilerinizin ve çerez tercihinizin hatırlanması için tarayıcınızın yerel depolama alanı kullanılır. Bu kayıtlar sitenin çalışması için zorunludur ve kimliğinizi üçüncü taraflarla paylaşmaz.</p><h3>Üçüncü Taraf Çerezleri</h3><p>Sitemizde reklam, analitik veya sosyal medya izleme çerezi <b>kullanılmamaktadır</b>. İleride kullanılması hâlinde bu politika güncellenir ve tercihiniz yeniden sorulur.</p><h3>Çerezleri Yönetme</h3><p>Tarayıcı ayarlarınızdan yerel depolamayı dilediğiniz zaman temizleyebilirsiniz; bu durumda sepetiniz ve tercihleriniz sıfırlanır.</p>" },
  distance: { title: "Mesafeli Satış Sözleşmesi", body: "<h3>1. Taraflar</h3><p><b>Satıcı:</b> {SIRKET} — {ADRES} — {EPOSTA} — {TELEFON}<br><b>Alıcı:</b> Sipariş formunda bilgileri yer alan müşteri.</p><h3>2. Konu</h3><p>İşbu sözleşme, Alıcı'nın Satıcı'ya ait internet sitesi üzerinden elektronik ortamda sipariş verdiği ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini düzenler.</p><h3>3. Teslimat</h3><p>Ürünler, sipariş onayını takiben en geç 30 gün içinde Alıcı'nın bildirdiği adrese kargo ile teslim edilir. Kargo ücreti sipariş özetinde gösterilir.</p><h3>4. Cayma Hakkı</h3><p>Alıcı, ürünün tesliminden itibaren 14 gün içinde hiçbir gerekçe göstermeksizin cayma hakkını kullanabilir. Cayma bildirimi {EPOSTA} adresine yazılı olarak iletilir. İade edilen ürünün bedeli, ürünün Satıcı'ya ulaşmasından itibaren 14 gün içinde iade edilir.</p><h3>5. Cayma Hakkının İstisnaları</h3><p>Ambalajı açılmış iç giyim ürünleri ile Alıcı'nın istekleri doğrultusunda kişiselleştirilen ürünlerde cayma hakkı kullanılamaz.</p><h3>6. Uyuşmazlık</h3><p>Uyuşmazlıklarda Alıcı'nın yerleşim yerindeki Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>" },
  terms: { title: "Kullanım Koşulları", body: "<p>Bu siteyi kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.</p><p>Sitedeki tüm marka, logo, tasarım ve içerikler {SIRKET}'e aittir; izinsiz kopyalanamaz ve çoğaltılamaz.</p><p>Ürün fiyatları ve stok durumu önceden bildirilmeksizin güncellenebilir. Bariz maddi hatalarla oluşan fiyatlarla verilen siparişler iptal edilebilir.</p><p>Site içeriği özenle hazırlanır; ancak teknik hatalardan kaynaklanan zararlardan {SIRKET} sorumlu tutulamaz.</p>" }
};
function pageContent(key) {
  const custom = (state.settings.pages || {})[key];
  const base = basePages[key] || {};
  let body = custom?.body || base.body || "";
  const s = state.settings;
  body = body.replaceAll("{SIRKET}", esc(s.companyName || "VOLPARIA Giyim"))
    .replaceAll("{ADRES}", esc(s.companyAddress || "—"))
    .replaceAll("{EPOSTA}", esc(s.supportEmail || "—"))
    .replaceAll("{TELEFON}", esc(s.supportPhone || "—"));
  return { title: custom?.title || base.title || "VOLPARIA", body };
}

/* ---------- durum ve kalıcılık ---------- */
function readLocal(key, fallback) { try { const v = localStorage.getItem(`volparia_${key}`); return v ? JSON.parse(v) : structuredClone(fallback); } catch { return structuredClone(fallback); } }
function writeLocal(key, value) { localStorage.setItem(`volparia_${key}`, JSON.stringify(value)); }

const state = {
  products: readLocal("products", seedProducts),
  cart: readLocal("cart", []),
  favorites: readLocal("favorites", []),
  settings: { ...defaultSettings, ...readLocal("settings", {}) },
  orders: readLocal("orders", []),
  coupons: readLocal("coupons", []),
  reviews: readLocal("reviews", []),
  subscribers: readLocal("subscribers", []),
  coupon: readLocal("coupon", null),
  watchlist: readLocal("watchlist", []),
  reviewStats: {},
  pos: { configured: false, provider: "iyzico", testMode: true },
  token: sessionStorage.getItem("volparia_admin_token") || "",
  apiOnline: false, version: null,
  activeFilter: "all", activeGender: "", activeCategory: "", search: "",
  adminView: "dashboard",
  admin: { products: null, orders: null, coupons: null, reviews: null, subscribers: null, audit: null, pos: null, productQuery: "", orderQuery: "", customerQuery: "", editing: null, bundleEdit: null, contentKey: "about" }
};
function persist() {
  writeLocal("products", state.products); writeLocal("cart", state.cart); writeLocal("favorites", state.favorites);
  writeLocal("settings", state.settings); writeLocal("orders", state.orders); writeLocal("coupons", state.coupons);
  writeLocal("reviews", state.reviews); writeLocal("subscribers", state.subscribers); writeLocal("coupon", state.coupon);
  writeLocal("watchlist", state.watchlist);
}
let toastTimer;
function toast(text, ok = true) { const el = $("#toast"); if (!el) return; el.textContent = `${ok ? "✓" : "!"} ${text}`; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2800); }
function openLayer(el) { closeLayers(); $("#overlay")?.classList.add("show"); el.classList.add("show"); document.body.classList.add("locked"); }
function closeLayers() { $$(".drawer.show,.modal.show,.search-modal.show").forEach(el => el.classList.remove("show")); $("#overlay")?.classList.remove("show"); document.body.classList.remove("locked"); }

/* ---------- API ---------- */
async function api(path, options = {}) {
  if (!CONFIG.apiBase) throw new Error("API_NOT_CONFIGURED");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try { response = await fetch(`${CONFIG.apiBase.replace(/\/$/, "")}${path}`, { ...options, headers }); }
  catch { const err = new Error("Sunucuya ulaşılamadı — internet bağlantınızı kontrol edin"); err.network = true; throw err; }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const err = new Error(data.error || "İşlem tamamlanamadı"); err.status = response.status; throw err; }
  return data;
}
function setStorageIndicator(online) {
  const dot = $("#storageDot"), label = $("#storageLabel"), detail = $("#storageDetail");
  if (!dot) return;
  dot.classList.toggle("online", online);
  label.textContent = online ? "Bulut bağlı" : "Yerel mod";
  detail.textContent = online ? "Tüm cihazlar otomatik eşitleniyor" : CONFIG.apiBase ? "Bağlantı bekleniyor" : "Bulut henüz kurulmadı";
}

/* ---------- bulut eşitleme ---------- */
async function bootstrapData(silent = true) {
  if (!CONFIG.apiBase) { setStorageIndicator(false); return; }
  try {
    const data = await api("/api/bootstrap");
    if (Array.isArray(data.products)) state.products = data.products;
    if (data.settings && Object.keys(data.settings).length) state.settings = { ...defaultSettings, ...data.settings };
    state.reviewStats = data.reviewStats || {};
    if (data.pos) state.pos = data.pos;
    state.version = data.v ?? state.version;
    state.apiOnline = true; setStorageIndicator(true);
    persist();
    if (typeof window.onDataRefresh === "function") window.onDataRefresh();
  } catch { state.apiOnline = false; setStorageIndicator(false); if (!silent) toast("Buluta bağlanılamadı, yerel veriler gösteriliyor", false); }
}
let syncTimer, syncBusy = false, lastActivity = Date.now(), syncTick = 0;
async function pollSync() {
  if (!CONFIG.apiBase || document.hidden || syncBusy) return;
  // 5 dakikadır hareketsiz sekmelerde her 10 turda bir yoklanır (ücretsiz kota koruması);
  // kullanıcı sayfaya dokunduğu anda saniyelik hıza geri döner.
  syncTick++;
  if (Date.now() - lastActivity > 5 * 60 * 1000 && syncTick % 10 !== 0) return;
  syncBusy = true;
  try {
    const d = await api("/api/sync");
    if (!state.apiOnline || d.v !== state.version) await bootstrapData();
  } catch { state.apiOnline = false; setStorageIndicator(false); }
  finally { syncBusy = false; }
}
function startSync() {
  if (!CONFIG.apiBase) return;
  clearInterval(syncTimer);
  syncTimer = setInterval(pollSync, Math.max(1000, Number(CONFIG.syncIntervalMs) || 1000));
  ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach(ev =>
    document.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { lastActivity = Date.now(); bootstrapData(); } });
  window.addEventListener("focus", () => { lastActivity = Date.now(); bootstrapData(); });
}

/* ---------- stok yardımcıları ---------- */
const sizesOf = p => Array.isArray(p.sizes) ? p.sizes : [];
const totalStock = p => sizesOf(p).reduce((s, x) => s + (Number(x.stock) || 0), 0);
const sizeOf = (p, name) => sizesOf(p).find(s => s.name === name);
const critical = p => Number(p.criticalStock) || state.settings.criticalStockDefault || 5;
const isSoldOut = p => totalStock(p) <= 0;
const isLowStock = p => { const t = totalStock(p); return t > 0 && t <= critical(p); };
function getCategories() { return state.settings.categories?.length ? state.settings.categories : DEFAULT_CATEGORIES; }

/* ---------- kombinler ---------- */
const getBundles = () => Array.isArray(state.settings.bundles) ? state.settings.bundles : [];
const getBundle = id => getBundles().find(b => b.id === id);
const bundleMembers = b => (b.productIds || []).map(id => state.products.find(p => p.id === id)).filter(Boolean);
const bundleGross = b => bundleMembers(b).reduce((s, p) => s + (Number(p.price) || 0), 0);
const bundleDiscountPct = b => Math.max(0, Math.min(90, Number(b.discountPercent) || 0));
const bundlePrice = b => Math.round(bundleGross(b) * (100 - bundleDiscountPct(b)) / 100);
const bundleSavings = b => bundleGross(b) - bundlePrice(b);
const bundleActive = b => b && b.active !== false && bundleMembers(b).length >= 2;
const bundleAvailable = b => bundleActive(b) && bundleMembers(b).every(p => !isSoldOut(p));
function activeBundles() { return getBundles().filter(bundleActive); }

/* ---------- yorum istatistikleri (yerel mod) ---------- */
function localReviewStats() {
  const stats = {};
  state.reviews.filter(r => r.status === "approved").forEach(r => {
    (stats[r.productId] ||= { count: 0, sum: 0 }).count++;
    stats[r.productId].sum += Number(r.rating) || 0;
  });
  return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { count: v.count, avg: Math.round(v.sum / v.count * 10) / 10 }]));
}
function ratingInfo(p) {
  const stats = state.apiOnline ? state.reviewStats : localReviewStats();
  const s = stats[p.id];
  return s && s.count ? { score: s.avg, count: s.count } : { score: null, count: 0 };
}

/* ---------- kupon yardımcıları ---------- */
function validateCouponLocal(code, total) {
  const c = state.coupons.find(x => x.code === code && x.active !== false);
  if (!c) return { error: "Kupon bulunamadı" };
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return { error: "Kupon kullanım limiti doldu" };
  if (total < (c.minTotal || 0)) return { error: `Bu kupon için minimum sepet tutarı ${money(c.minTotal)}` };
  return { coupon: { code: c.code, type: c.type, value: c.value, minTotal: c.minTotal || 0 } };
}
function couponDiscount(gross) {
  const c = state.coupon;
  if (!c) return 0;
  if (gross < (c.minTotal || 0)) return 0;
  if (c.type === "percent") return Math.floor(gross * c.value / 100);
  if (c.type === "fixed") return Math.min(c.value, gross);
  return 0;
}

/* ---------- görsel küçültme (ürün fotoğrafı) ---------- */
function compressImage(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Görsel okunamadı"));
    img.src = URL.createObjectURL(file);
  });
}

function download(name, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
