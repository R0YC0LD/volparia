# VOLPARIA Giyim Mağazası — Kurulum Rehberi

## Site şu an nasıl çalışıyor?

`index.html` dosyasına çift tıklayın — site hemen açılır ve örnek ürünlerle çalışır.
Bulut kurulmadan önce veriler yalnızca o tarayıcıda saklanır (tek cihaz modu).
Bulut kurulunca **tüm cihazlar aynı veriyi görür ve birkaç saniye içinde otomatik eşitlenir.**

## Admin paneline giriş

Yönetim paneli ayrı bir sayfadır: **`admin.html`**

1. Doğrudan `admin.html` dosyasını açın (siteyse `siteadresi/admin.html`),
2. veya mağazada **VOLPARIA logosuna arka arkaya 5 kez** tıklayın.

Varsayılan giriş: kullanıcı adı `admin`, şifre `12345`
(Bulut kurulduktan sonra şifre, Cloudflare'a eklediğiniz `ADMIN_PASSWORD` olur — güçlü bir şifre seçin.)

## Admin panelinde neler var? (14 modül)

- **Genel Bakış** — kritik stok (🔥), tükenen beden, sipariş/ciro, bekleyen yorum özetleri
- **Ürünler** — ekle/düzenle/sil; ada veya ürün koduyla (SKU) arama; **bilgisayardan görsel yükleme**
- **Stok / Bedenler** — tüm beden stoklarını tek tablodan hızlıca güncelleme
- **Siparişler** — arama, sipariş durumu + ödeme durumu yönetimi, kupon bilgisi
- **Kuponlar** — yüzde veya tutar indirimli kupon oluşturma, limit ve min. sepet koşulu
- **Yorumlar** — müşteri yorumlarını onaylama/reddetme/silme (onaylı yorumlar vitrine düşer)
- **Müşteriler** — sipariş kayıtlarından derlenen müşteri listesi, harcama toplamları
- **Kategoriler** — kategori ekle/sil/yeniden adlandır/sırala; vitrindeki filtre çipleri buradan beslenir
- **İçerik Yönetimi** — Hakkımızda, KVKK, mesafeli satış, iade, SSS dahil tüm sayfa metinlerini düzenleme
- **Bülten Aboneleri** — abone listesi ve CSV dışa aktarım
- **SEO ve Sosyal** — site başlığı/açıklaması, Instagram/TikTok/X/WhatsApp bağlantıları
- **Mağaza Ayarları** — duyuru, hero yazıları, kargo sınırı, ödeme yöntemleri, IBAN, şirket bilgileri
- **Yedekleme** — tüm veriyi tek JSON dosyası olarak indirme / geri yükleme
- **Denetim Kaydı** — bulutta kim ne zaman ne değiştirdi (bulut kurulunca aktif)

## Kombinler (birlikte satış)

Admin panelinde **Kombinler** modülünden 2-4 ürünü seçip indirimli bir paket oluşturursunuz:
- İndirim oranını siz belirlersiniz; liste fiyatı, kombin fiyatı ve kazanç anında hesaplanır.
- Kombin mağazada ana sayfadaki **"Kombinle kazan"** bölümünde, üst menüdeki
  **🦊 Kombinler** bağlantısında ve mega-menüde görünür.
- Müşteri kombini açınca **her parça için kendi bedenini** seçer ve indirimli fiyattan
  tek seferde sepete ekler. Sepette liste fiyatı, kombin indirimi ve toplam ayrı ayrı gösterilir.

## Stok gelince haber verme

Bir bedeni tükenen üründe müşteri, ürün detayındaki **"🔔 Stok gelince haber ver"**
bölümünden o bedeni işaretler. Siz stoğu (admin → Stok) yenileyince, müşteri siteye
tekrar girdiğinde sol altta **"Beklediğin ürün stoğa geldi!"** bildirimi açılır.
(E-posta bildirimi, e-posta servisi bulut kurulumunda tanımlanınca eklenebilir.)

## Giriş (intro) ekranı

Siteye ilk girişte tilki logolu **VOLPARIA intro ekranı** açılır ve birkaç saniyede kapanır.
Sekme kapatılıp yeniden girildiğinde tekrar gösterilir; site içinde gezerken, sepete/favoriye
eklerken veya sipariş verirken **gösterilmez** (oturum boyunca bir kez).

## Sanal POS (kartla ödeme) — otomatik aktifleşir

Kartla ödeme almak için bulut kurulumunun tamamlanmış olması gerekir. Sonrası çok basit:

1. **iyzico** (önerilen) veya **PayTR** ile ücretsiz üye işyeri başvurusu yapın:
   - iyzico: https://www.iyzico.com → başvuru onaylanınca panelden **Ayarlar → API Anahtarları**
   - PayTR: https://www.paytr.com → mağaza panelinden **Bilgi** sayfası
2. Admin panelinde **Sanal POS** modülünü açın, bilgileri yapıştırıp kaydedin.
3. Bu kadar — mağazadaki ödeme adımına **"Kredi / Banka kartı (3D Secure)"** seçeneği
   otomatik eklenir. Bilgiler buluta **AES-256 şifreli** kaydedilir, siteye giren kimse göremez.

Notlar:
- **Test modu** açıkken karttan tahsilat yapılmaz; sipariş "ödeme bekleniyor" olarak düşer.
  Gerçek satışa geçerken Sanal POS → Genel ayarlar'dan test modunu kapatın.
- PayTR kullanacaksanız PayTR paneline bildirim URL'si olarak şunu girin:
  `WORKER-ADRESINIZ/api/payments/webhook/paytr`
- Ödeme başarılı/başarısız dönüşü müşteriyi otomatik mağazaya geri getirir ve sipariş
  durumu panelde "Ödendi" olur.

## Cihazlar arası anlık eşitleme

Site açık olan her cihaz buluttaki veri sürümünü **saniyede bir** yoklar; admin panelinde
yapılan her değişiklik (ürün, stok, fiyat, ayar…) 1-2 saniye içinde tüm cihazlarda görünür.
5 dakikadan uzun süre dokunulmayan sekmeler kotayı korumak için otomatik yavaşlar,
kullanıcı sayfaya dönünce anında hızlanır. (`config.js` → `syncIntervalMs`)

## Kategori sistemi (Trendyol tarzı)

- Üstteki **"Tüm Kategoriler"** düğmesine gelince açılan **mega-menü**, cinsiyet sekmeleri
  (Kadın/Erkek/Unisex/Çocuk) ve her cinsiyetin kategorilerini kolonlar hâlinde gösterir.
- Her kategori/cinsiyet kendi **adresine** sahip bir sayfa açar
  (örn. `kategori.html?cinsiyet=kadin&kategori=Elbise`) — bağlantı paylaşılabilir, yer imlenebilir.
- Kategori sayfasında sol tarafta **filtre paneli** vardır: cinsiyet, kategori, beden,
  "sadece stoktakiler". Sağ üstte sıralama. Seçili filtreler URL'ye yansır (geri/ileri çalışır).
- **Kategoriler admin panelinden yönetilir** (Kategoriler modülü). Yeni bir kategori ekleyince
  hem mega-menüde hem de kendi sayfasıyla otomatik belirir; ayrı dosya oluşturmaya gerek yoktur.

## KVKK / Çerez uyumu

- Siteye ilk girişte **çerez bildirimi** çıkar; tercih kaydedilir.
- KVKK Aydınlatma Metni, Gizlilik, Çerez Politikası, Mesafeli Satış Sözleşmesi ve
  Kullanım Koşulları hazır gelir; şirket adı/adresi Mağaza Ayarları'ndan otomatik dolar.
  Metinlerin tamamı İçerik Yönetimi modülünden düzenlenebilir.
- Bülten kaydı ve sipariş adımında KVKK onay kutuları bulunur.

## Stok göstergeleri (otomatik)

- Bir bedenin stoğu **0** olursa → vitrinde o bedenin üzeri **kırmızı çizgiyle** çizilir, satın alınamaz.
- Ürünün toplam stoğu **kritik sınırın** (varsayılan 5, üründe değiştirilebilir) altına inerse →
  vitrinde **🔥 "Son X ürün"** rozeti alevli animasyonla yanar.
- Tüm bedenler biterse → ürün soluklaşır ve "Tükendi" etiketi görünür.

---

# Bulut kurulumu (ücretsiz — Cloudflare)

Cloudflare'ın ücretsiz katmanı bu mağaza için 1-2 yıl rahatça yeter:
günde 100.000 istek + 5 GB veritabanı ücretsizdir, kredi kartı istemez.

## Sizden istenenler (bana iletmeniz gerekenler)

1. **Cloudflare hesabı açın**: https://dash.cloudflare.com/sign-up (e-posta + şifre, ücretsiz)
2. Bilgisayarınızda **Node.js kurulu olsun**: https://nodejs.org (LTS sürümü)
3. Bana "hazırım" deyin — aşağıdaki adımları birlikte çalıştıracağız.
   Adım 4'te oluşan **database_id** ve adım 8'de oluşan **Worker adresini** bana iletmeniz yeterli.

## Kurulum adımları (terminalden)

```bash
# 1) Wrangler'ı kurun (Cloudflare'ın komut aracı)
npm install -g wrangler

# 2) Cloudflare hesabınızla giriş yapın (tarayıcı açılır, onaylayın)
wrangler login

# 3) cloudflare-worker klasörüne geçin
cd "C:\Users\ongor\OneDrive\Desktop\Giyim Mağazası\cloudflare-worker"

# 4) Ücretsiz D1 veritabanı oluşturun — çıktıdaki database_id değerini kopyalayın
wrangler d1 create volparia-db

# 5) wrangler.toml.example dosyasını wrangler.toml adıyla kopyalayıp
#    içindeki database_id alanına 4. adımdaki değeri yapıştırın

# 6) Veritabanı tablolarını kurun
wrangler d1 execute volparia-db --remote --file=schema.sql

# 7) Yönetici şifresi ve oturum anahtarı ekleyin (sorulduğunda yazın)
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET   # uzun rastgele bir metin girin

# 8) Yayınlayın — çıktıda https://volparia-api.XXXX.workers.dev gibi bir adres verir
wrangler deploy
```

## Son adım

8. adımda çıkan adresi ana klasördeki `config.js` dosyasına yazın:

```js
apiBase: "https://volparia-api.XXXX.workers.dev",
```

Bu kadar. Artık siteyi hangi cihazda açarsanız açın, ürün/stok/sipariş
değişiklikleri birkaç saniye içinde her yerde görünür
(yenileme sıklığı `config.js` içindeki `syncIntervalMs` ile ayarlanır).

## Siteyi internete açmak (ücretsiz)

İki kolay seçenek — ikisi de ücretsiz:

- **Cloudflare Pages**: dash.cloudflare.com → Workers & Pages → Create → Pages →
  "Upload assets" → bu klasörü sürükleyin (cloudflare-worker klasörü hariç).
- **GitHub Pages**: klasörü bir GitHub deposuna yükleyin → Settings → Pages → main branch.

Not: İlk ürünler siteye "örnek ürün" olarak gelir; bulut kurulduktan sonra
admin panelinden kendi ürünlerinizi ekleyince örnekler yerini onlara bırakır.
(Bulut aktifken vitrin yalnızca buluttaki ürünleri gösterir.)
