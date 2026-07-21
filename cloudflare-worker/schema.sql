-- VOLPARIA Giyim — D1 şeması (v2)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  sku TEXT NOT NULL,
  category TEXT DEFAULT '',
  gender TEXT DEFAULT 'unisex',
  price REAL NOT NULL DEFAULT 0,
  old_price REAL,
  badge TEXT,
  tags TEXT DEFAULT '[]',
  tone TEXT DEFAULT '#e8e2d6',
  description TEXT DEFAULT '',
  fabric TEXT DEFAULT '',
  care TEXT DEFAULT '',
  image_url TEXT,
  sizes TEXT DEFAULT '[]',            -- [{"name":"S","stock":4}, ...]
  critical_stock INTEGER DEFAULT 5,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL,
  customer_json TEXT DEFAULT '{}',
  total REAL NOT NULL DEFAULT 0,
  discount REAL DEFAULT 0,
  coupon_code TEXT,
  status TEXT DEFAULT 'new',          -- new / preparing / shipped / complete / cancelled
  payment_method TEXT DEFAULT 'transfer', -- transfer / cod / card
  payment_status TEXT DEFAULT 'awaiting', -- awaiting / paid / refunded
  payment_token TEXT,                 -- sanal POS oturum/istek anahtarı
  shipping_address TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT DEFAULT 'percent',        -- percent / fixed
  value REAL NOT NULL DEFAULT 0,
  min_total REAL DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending / approved / rejected
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,                 -- base64
  content_type TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_credentials (
  provider TEXT PRIMARY KEY,          -- iyzico / paytr
  data TEXT NOT NULL,                 -- AES-GCM ile şifreli kimlik bilgileri
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO store_settings(key, value) VALUES ('version', '1');

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
