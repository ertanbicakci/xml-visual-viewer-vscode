# Araştırma bulguları

Tarih: 25 Ekim 2026.

## Çalışma alanı
- XML_Viewer klasörü boş; uygulama kodu, package.json veya Git deposu yok.
- Kullanıcının isteği uygulama geliştirmek değil, geliştirme planı hazırlamak.

## Referans ve resmi belgeler
- JSON Crack web sitesi JSON yanında XML, YAML ve CSV desteği de listeliyor. Ürün farklılaşması yalnızca XML dosyası açmak olamaz.
  Kaynak: https://jsoncrack.com/
- JSON Crack VS Code eklentisinin Marketplace sayfası mevcut.
  Kaynak: https://marketplace.visualstudio.com/items?itemName=AykutSarac.jsoncrack-vscode
- VS Code, metin tabanlı dosyalar için TextDocument modelini kullanan CustomTextEditorProvider öneriyor; aynı belgeyi birden çok görünüm paylaşabiliyor.
  Kaynak: https://code.visualstudio.com/api/extension-guides/custom-editors
- Webview görsel arayüz sağlayabilir; eklentiyle mesajlaşarak haberleşir. Panel yaşam döngüsü, durum saklama, yerel kaynaklar ve içerik güvenlik politikası tasarımda ele alınmalı.
  Kaynak: https://code.visualstudio.com/api/extension-guides/webview

## Tasarım çıkarımları
- XML'i düz JSON nesnesine dönüştürmek yerine çocuk sırası, metin, attribute ve namespace bilgilerini taşıyan ayrı bir model kullanılmalı.
- Salt okunur grafik ile kaynak TextDocument arasında konum eşlemesi ürünün temel değeri olmalı.
- Ayrıştırıcı seçimi kaynak aralığı doğruluğu ve XML uç durumlarını kapsayan bir teknik denemeyle yapılmalı.

## Grafik ve ayrıştırıcı araştırması
- React Flow özel düğümler ve grafik kontrolleri için aday; ELK.js çizim değil otomatik konumlandırma motoru. İki sorumluluk ayrı tutulmalı.
  Kaynaklar: https://reactflow.dev/learn ve https://github.com/kieler/elkjs
- saxes deposu 31 Aralık 2025'te arşivlenmiş. Varsayılan yeni bağımlılık olarak seçilmedi.
  Kaynak: https://github.com/lddubeau/saxes
- @xml-tools/parser CST, ast-position ise konum araçları sağlıyor; eski depo güncel kaynak olarak SAP/app-studio-toolkit/projects/xml-tools adresine yönlendiriyor. Aday teknik denemede değerlendirilecek, kesin seçim yapılmadı.
  Kaynak: https://github.com/SAP-archive/xml-tools
- Eski deponun yönlendirdiği güncel XML Tools adresi web aracıyla alınamadı; yeni depodaki bakım durumu doğrulanmış sayılmadı ve plana uygulama öncesi kontrol olarak yazıldı.
- React Flow resmi performans rehberi büyük ağaçlarda başlangıçta sınırlı düğüm gösterip dalları gerektiğinde açmayı öneriyor.
  Kaynak: https://reactflow.dev/learn/advanced-use/performance

## Uygulama bulguları
- @rgrove/parse-xml 5.0.0 kaynak aralıklarını pratikte JavaScript UTF-16 offset'i olarak sağlıyor; emoji/CRLF/entity testleri bunu doğruladı. EOF sonsuz offset'i belge sonuna sabitleniyor.
- Yorum düğümünün metni `content` alanında; `text` alanını kullanmak yorumları aramada kaybettiriyordu. Birim ve gerçek Webview regresyon testiyle düzeltildi.
- Namespace scope kayıtları prototype'siz olmalı; `<toString:x/>` gibi tanımsız prefix'ler yanlışlıkla JavaScript prototype üyelerinden çözümlenmemeli.
- ELK bundled yapısı dedicated worker içinde kullanıldığında iç Worker constructor'ında hata verdi. Ana Webview'da küçük elk-api ve blob olarak yüklenen upstream worker sorunu giderdi; CSP ve gerçek VS Code testleri geçti.
- vsce ignore kuralları pozitif/negatif listeler olarak uygulanıyor; genel `!dist/**` ifadesi daha sonraki hariç tutmaları etkisiz kıldı. Runtime dosyalarına tek tek allowlist uygulanarak düzeltildi.
