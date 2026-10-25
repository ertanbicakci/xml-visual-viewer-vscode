# İlerleme

## 25 Ekim 2026 — Plan hazırlığı
- Boş proje klasörü doğrulandı.
- JSON Crack web sitesi ve eklenti bağlantısı incelendi.
- VS Code Custom Editor ve Webview resmi belgeleri incelendi.
- İlk sürüm kapsamı için isteğe bağlı kullanıcı tercihi soruldu; salt okunur MVP varsayımıyla planlama sürüyor.
- Uygulama kodu yazılmadı, paket kurulmadı, Git deposu oluşturulmadı.
- Kullanıcı yalnızca görsel inceleme kapsamını seçti.
- PROJECT_PLAN.md oluşturuldu: üç yaklaşım, salt okunur MVP, XML semantiği, kaynak eşlemesi, mimari, kapasite bütçeleri, altı geliştirme aşaması ve kabul listesi.
- React Flow dokümantasyonu Context7 üzerinden de doğrulandı; ELK worker ve büyük ağaç stratejileri incelendi.
- Son inceleme tamamlandı: süre aralığı aşama toplamıyla uyumlu; görsel düzenleme kapsam dışı; kapasite değerleri ölçülecek hedef olarak etiketli; kesinleşmeyen parser seçimi ilk teknik aşamada açık bir karar kapısına bağlı.
- Teslim: PROJECT_PLAN.md. Görev planlamayla tamamlandı; uygulama aşamaları henüz başlamadı.

## 25 Ekim 2026 — Uygulama (kullanıcı onayından sonra)
- Salt okunur VS Code custom editor, React Flow arayüzü, XML modeli, namespace çözümü ve kaynak eşlemesi geliştirildi.
- Arama, detaylar, dallar, sayfalama, yön değişimi, minimap, tema değişkenleri ve klavye seçimi tamamlandı.
- Node/ELK worker'ları, belge sürümü kontrolü, eski grafik etkileşimlerinin engellenmesi, debounce, iptal ve kapasite sınırları eklendi.
- TDD sırasında başarısız testlerle doğrulanan sorunlar giderildi: QName/prototip adları, yorumların aranabilir içeriği, klavye seçimi, alt ağacı ekrana sığdırma ve eski grafik üzerinde etkileşim.
- 30 çekirdek testi, 8 browser senaryosu ve gerçek VS Code + Webview entegrasyonu başarılı. TypeScript kontrolü geçti.
- Benchmark, örnek XML, README, üçüncü taraf lisansları ve Windows/macOS/Linux CI matrisi eklendi.
- VSIX üretildi; paket içeriği runtime dosyalarıyla sınırlandırıldı. Windows/Linux çalışma sonuçları henüz mevcut değil.
- Son paket 13 dosya / yaklaşık 623 KB. Ayrı VS Code test profiline VSIX kurulumu başarılı; npm audit temiz. Arayüz ekran görüntüsü artifacts/xml-viewer.png içinde.

## 25 Ekim 2026 — Ürünleştirme
- Git deposu oluşturuldu; v0.1 başlangıcı `bd732e1` ile kaydedildi.
- Gereksiz yerleşim istekleri, model/namespace tekrarı ve görünüm durumunun kaybı düzeltildi.
- TDD ile attribute/model bütçesi, belirsiz kimlik, detay büyümesi ve görünür bütçe dışındaki arama sonucu sorunları doğrulanıp giderildi.
- Panel bazlı iptal/yeniden dene, hata konumu, Problems, içeriksiz tanılama, kaynak ayarları ve breadcrumb/geçmiş eklendi.
- axe kontrollerinin bulduğu kontrast, separator ARIA ve kaynak kaydırma sorunları düzeltildi; dört tema paleti geçti.
- 45 çekirdek testi ve 22 Playwright senaryosu başarılı. Gerçek minimum 1.96.0 ve kararlı 1.143.1 VS Code akışları, aynı belgenin bağımsız panelleriyle doğrulandı.
- UI benchmark beş örnekle alındı. Gerçek VS Code 48.002 düğümlü belge için ayrıca tek örnekli worker/IPC dahil açılış, arama ve güncelleme raporu üretiyor.
- XML/ağaç ürün simgesi, ekran görüntüsü, SOAP/Maven/karma içerik örnekleri, platform/sürüm CI ve yayın yapmayan beta paket workflow'u hazırlandı.
- Kullanıcı publisher / GitHub repo bilgilerini bitince sağlayacağını bildirdi. `local` kimliği korunuyor; yayın kapıları release-readiness dosyasında açıkça ayrılıyor.
- Son büyük belge testleri her iki sürümde de geçti: 1.96.0 açılış 2.129 ms, stable 1.143.1 açılış 1.996 ms (tek örnek; p95 değil). Son bağımsız UI ölçümünde büyük profil açılış p95 891,7 ms; gerçek VS Code süresiyle karıştırılmıyor.
- Son VSIX: `xml-visual-viewer-0.2.0.vsix`, 18 dosya / 750.503 bayt. Kimlik/allowlist/SHA-256 doğrulaması ve ayrı VS Code profiline kurulum başarılı. Kullanıcının normal eklenti profili değiştirilmedi. Tam paket raporu docs/package-report.json içinde.
- Yerel beta teslimi tamamlandı. Windows/Linux CI, manuel erişilebilirlik/uzak workspace beta testi, publisher/repo ve yayın kararı dış kontroller olarak açık bırakıldı.
