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
