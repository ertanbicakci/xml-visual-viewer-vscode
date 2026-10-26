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

## 25 Ekim 2026 — GitHub deposu
- Kullanıcı kayıtlı ertanbicakci hesabıyla yeni repo oluşturma ve push yetkisi verdi.
- GitHub CLI oturumu ve hesap doğrulandı; `xml-visual-viewer-vscode` adlı private repo oluşturuldu.
- Repository, homepage ve issues metadata'sı gerçek adreslerle güncellendi. Yerel beta README'si private repo görsellerine bağımlı değil.
- Publisher kaydı ayrı bir Microsoft Marketplace kimliği gerektirir; GitHub oturumu publisher yerine geçmez. Publisher ID kaydedilmeden `local` kimliği değiştirilmeyecek.

## 26 Ekim 2026 — Yayın öncesi son teknik açıklar
- İlk CI koşusunda Linux iki sürümde geçti; macOS/Windows Extension Host testleri başarısızdı.
- Kısa ve her çalıştırmada benzersiz profil + dinamik CDP portu eklendi. macOS UNIX socket uzunluğu sorunu kapandı; sonraki koşuda iki macOS ve iki Linux senaryosu geçti.
- Windows'ta ekran görüntüsü XML grafiğinin çalıştığını, CDP'nin önceden yüklenmiş iç frame'i atladığını gösterdi. CDP bağlantısı Webview oluşturulmadan önceye taşındı. Frame keşfi hatasını gizleyen skip veya güvenlik izolasyonunu devre dışı bırakan flag kullanılmadı.
- Detay panelini klavyeyle kapatırken seçime odak dönmesi ve forced-colors sistem renkleri başarısız tarayıcı testleriyle doğrulanıp düzeltildi.
- Gerçek VS Code içinde UTF-8/UTF-16 LE/BE BOM, salt okunur sanal FileSystemProvider ve kaynak offset'leri doğrulandı; beş standart panel açılışı ölçülüyor.
- VSIX bağımsız bir test-driver ile kurularak hedefin checkout değil kurulum klasöründe olduğu doğrulanıyor. Publisher kimliği testlerde manifestten alınıyor.
- Public görsel/link kullanımı publisher adına bağlanmıyor; açık repo erişimi ayrıca doğrulanana kadar paket README'si kendine yeterli metin olarak üretiliyor.
- v0.2.1 için gerçek platform matrisi ve kurulu paket testleri tekrar çalıştırılıyor. İnsan kullanıcı, ekran okuyucu ve gerçek uzaktan bağlantı değerlendirmeleri otomatik testlerle yapılmış sayılmıyor.

- v0.2.1 son turunda otomatik kameranın gecikmiş hareketi sırasında yanlış karta tıklama görüldü. Grafik yerleşimi ve viewport son boyaması bitene kadar etkileşim kapatıldı; otomatik kamera animasyonu kaldırıldı. Geciktirilmiş animation-frame regresyonu önce başarısız, sonra başarılı oldu.
- Doğrudan odak taşıma sırasında inspector kapanışının odağı geri çalması başarısız testle doğrulanıp `focusin` iptaliyle giderildi. 48 çekirdek ve 29 tarayıcı senaryosu yerelde başarılı; kurulu VSIX minimum/kararlı VS Code ile çalıştırıldı.
- Test harness'indeki seçim offset'i title kapanışı yerine tekil id attribute'una düzeltildi ve seçilen item başlığı ayrıca doğrulandı. Kapanan Webview frame'leri ortak URI tabanlı keşifte atlanıyor; bekleme/skip ile hata gizlenmedi.
- Windows son minimum sürüm koşusunda gecikmiş başlangıç örneği isteğinin yeni test XML'ini ezdiği görüldü. Demo harness sürümünü isteğin başlangıcında ayırıyor, eski yanıtı atlıyor; geciktirilmiş yanıt regresyonu önce başarısız sonra başarılı. Demo kodu VSIX dışında; eklenti runtime'ı bu düzeltmeyle değişmedi. 48 çekirdek + 29 tarayıcı senaryosu yerelde geçti.
- Son CI koşusu 40254307746, `21eb2fb3d474be6fe696bcbd8b7e31cdcb496dd4` için 6/6 başarılı: Windows/Linux/macOS × 1.96.0/stable. Her iş typecheck, 48 çekirdek/29 tarayıcı senaryosu, kaynak Extension Host ve bağımsız kurulu VSIX akışını içeriyor. Hiçbir platform devre dışı bırakılmadı.
- v0.2.1 teslimi 19 dosya / 752.514 bayt. Paket allowlist/kimlik/SHA-256 doğrulandı; temiz yerel profillerde minimum/kararlı sürümlere kurularak çalıştırıldı. Güncel kanıtlar ve manuel kabul sınırları release-readiness raporuna işlendi.
- Teslimdeki beş runtime dosyasının SHA-256 değerleri altı CI VSIX'iyle birebir eşleşti. Yerel paket raporu ve 6/6 işin kanıtı docs/ci-validation.json içinde kaydedildi. Kalan değişiklikler belge/README/kanıt dosyalarıdır; son kayıt için CI tekrar çalıştırılmadı.
