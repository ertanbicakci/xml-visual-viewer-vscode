# Uygulama kararları

Onaylanan kapsam: salt okunur XML görsel inceleme. Kaynak: PROJECT_PLAN.md.

## Uygulama sırası
1. Konum, namespace, karma içerik ve limitler için başarısız testler yaz; parser adaptörünü testlerle tamamla.
2. Görünen ağaç izdüşümünü, aramayı ve source index'i testlerle tamamla.
3. VS Code TextDocument, worker yaşam döngüsü ve sürüm kontrollü mesajları uygula.
4. React Flow, worker içinde ELK, XML kartları, inspector ve arama arayüzünü uygula.
5. Gerçek tarayıcıda etkileşimleri, Extension Host'ta belge akışlarını doğrula; VSIX üret.

## Görsel yaklaşım
VS Code temasıyla bütünleşen sakin, yoğun ama okunabilir bir çalışma alanı. Ana alan düğüm grafiği; üstte kısa bir araç çubuğu, sağda kapatılabilir/yeniden boyutlanabilir detay alanı. Tek vurgu rengi. Kartlar yalnızca XML düğümleri için kullanılır. Seçim, odaklama ve inspector açılışı kısa geçişler kullanır; azaltılmış hareket tercihine uyulur.

## Teknik keşif
`@rgrove/parse-xml` konum bilgisi, güvenli non-validating XML 1.0 ayrıştırması ve bakım durumu açısından değerlendiriliyor. Kaynak aralığı/attribute aralığı eksikleri adaptörde açıkça ele alınacak. Başarılı testler sonrası seçim kayda geçirilecek.

## Tasarım incelemesi
Grafik düzenlemeyi desteklemez. XML dosyaları otomatik varsayılan editör ilişkisini değiştirmez. Kaynak konumları belge sürümüne bağlıdır; eski model üzerinden gezinme engellenir.

## v0.1.0 uygulanan kararlar
- `@rgrove/parse-xml` 5.0.0 seçildi. Çocuk sırası, CDATA ve metadata korunuyor; kaynak konumları UTF-16 testleriyle doğrulandı. Namespace kapsamı, QName ve expanded attribute tekilliği adaptörde kontrol ediliyor. Prototipte EOF için sonsuz olarak dönebilen parser offset'leri belge uzunluğuyla sınırlandırıldı.
- Extension Host içinde Node worker ile ayrıştırma; Webview içinde blob worker ile ELK konumlandırma uygulanıyor. ELK'nin değişmemiş upstream worker'ı paket içinden yükleniyor. `elk.bundled.js` bir worker içinde tekrar worker kurmaya çalıştığı için API + upstream worker düzenine geçildi.
- Tek TextDocument için paylaşılan controller/model, her panel için ayrı görünüm durumu kullanılıyor. Metin değişir değişmez gezinme geçersizleşiyor. Yeni grafik çizilene kadar önceki grafikte etkileşim de durduruluyor.
- Worker iptali, 400 ms debounce, timeout, 10 MiB / 50.000 model düğümü / 256 derinlik sınırları uygulanıyor. Görünür grafik 1.000 düğümle sınırlandırılıyor; çocuklar 100'lük gruplarla açılıyor.
- Kart snapshot'ları kısaltılıyor; arama Extension Host'taki tam değerlerde yapılıyor. Inspector kaynak/değerleri 100.000 karaktere kadar gösteriyor ve kesilmeyi bildiriyor.
- Yapılandırmayı sade tutmak için extension ve Webview tek esbuild betiğiyle derleniyor; ayrı Vite geliştirme sunucusu yerine aynı arayüzü kullanan küçük bir tarayıcı harness'i var. Harness VSIX'e dahil edilmiyor.
- Paketleme aracının geçişli kimlik doğrulama bağımlılıklarındaki uyarıları gidermek için `@azure/identity` 4.13.0 ve onun MSAL bağımlılığında `uuid` 11.1.1+ override'ları kilitlendi. Bunlar VSIX çalışma zamanı bağımlılıkları değil. npm audit temiz.
- VSIX yalnızca runtime bundle'ları, örnek XML, README ve lisans dosyalarını içeriyor. Publisher `local` geliştirme kimliği olarak bırakıldı.

## Doğrulama
- 30 çekirdek testi: XML yapısı, UTF-16 konumları, namespace, yorum içeriği, bütçeler, arama, sayfalama, kaynak indeksi, eski sonuçları reddetme, worker iptali/zaman aşımı ve mesaj sınırları.
- 8 Playwright senaryosu: CSP altında gerçek ELK worker, arama, inspector, kaynak köprüsü, eski/hatalı XML, değişiklik sonrası yorum araması, klavye, dar panel, güvenli metin gösterimi, tüm alt ağacı ekrana sığdırma ve eski grafik etkileşimlerini engelleme.
- Gerçek VS Code 1.143.1 (macOS arm64) + gerçek Webview: yan yana açılış, kaynakta doğru tag seçimi, kaynak imlecinden graph seçimi, unsaved edit sonrası tam içerikte arama, readonly davranış, undo, untitled belge, aynı dosyanın birden fazla görünümü ve kapatma.
- TypeScript kontrolü ve VSIX paketleme başarılı. Paket 13 dosya / yaklaşık 623 KB; test, demo ve source map dosyaları dışarıda. VSIX ayrı bir VS Code kurulum profiline CLI üzerinden başarıyla kuruldu; kullanıcının normal eklenti profili değiştirilmedi.
- Parser/model benchmark verisi `docs/benchmark.json` içinde. Apple M3 Pro, Node 25.2.0: 217.799 bayt / 3.002 düğüm için p95 10,29 ms; 3.529.799 bayt / 48.002 düğüm için p95 179,60 ms. Bu sayılar worker başlangıcı, mesajlaşma, ELK ve çizim sürelerini kapsamaz; tam arayüz için performans garantisi değildir.
- Windows/Linux için CI matrisi eklendi; bu ortamda o platformların çalıştığı iddia edilmiyor. Tüm tema kombinasyonları ve minimum VS Code sürümünde ayrı yayın testi hâlâ yayın öncesi kontrollerdir.

## v0.2.0 ürünleştirme

Güncel kanıt ve açık yayın kapıları `docs/release-readiness.md` içinde tutulur. Üstteki v0.1 doğrulama sayıları tarihsel sonuçlardır.

- Ortak string tablosuyla serileştirme ve istek anında yol hesabı; model/attribute/worker ve detay aktarım bütçeleri.
- Topoloji konum önbelleği, kalıcı ELK worker, iptal/generation kontrolü ve kaynak seçimi için no-op görünüm güncellemeleri.
- Parent/namespace/ad, tekil ID ve tam içerik parmak iziyle güvenilir eşleme. Aynı kimliğin eski belgede tekrarlanması da belirsiz kabul edilir. Önceki tüm açık dalları tekrar taramak yerine parent grupları indekslenir.
- Her panelin aboneliği ayrı duraklatılır. Shared controller diğer aktif panelleri günceller; son aktif panel durursa worker sonlanır.
- Resource settings, Problems, içeriksiz log/rapor, hata konumu, breadcrumb/geçmiş ve tam değerlerde arama bağlamı.
- 45 çekirdek ve 22 browser senaryosu; minimum/kararlı VS Code ve gerçek büyük belge testi. Paket içeriği ve kimliği Node ZIP directory denetimiyle doğrulanır.
- Paket README'si varsayılan olarak kendine yeterli metne dönüştürülür. Public depo erişimi ayrıca doğrulanınca `--public-repository` seçeneğiyle vsce standart link dönüşümüne izin verilir; publisher adının değişmesi bunu otomatik değiştirmez.

## v0.2.1 yayın adayı

- 48 çekirdek testi ve 29 tarayıcı senaryosu. Gecikmiş layout/viewport sırasında etkileşimi kapatan, inspector kapanınca odağı döndüren ve kullanıcı Tab veya doğrudan odak taşıma ile ayrılınca odağı çalmayan regresyonlar eklendi.
- Otomatik kamera yerleşimi animasyonsuz tamamlanır; node konumları ve kamera aynı duruma gelmeden grafik tıklanamaz. Dal düğmesinin çift tıklaması karta yayılmaz.
- Forced-colors sistem renkleri, 200% eşdeğeri viewport; gerçek UTF-8 BOM/UTF-16 LE/BE ve salt okunur sanal URI kaynak eşlemesi.
- Kısa geçici profiller, benzersiz loopback CDP portu, Webview oluşturulmadan önce CDP bağlantısı ve kapanmış frame'lere dayanıklı keşif. Hatalarda renderer/log/ekran görüntüsü saklanır.
- VSIX bağımsız test-driver ile kurulur ve kurulum klasöründeki eklenti sınanır. Test kimliği manifestteki publisher/name üzerinden hesaplanır.
- Gerçek VS Code içinde 970.743 bayt / 5.000 düğüm için beş yeni panel açılışı, 48.002 düğüm için açılış/arama/güncelleme raporlanır. Ölçüm kapsamı raporun içinde açıkça belirtilir.
- Son paket, platform matrisi ve insan/cihaz kontrol listesi için docs/release-readiness.md esas alınır. Önceki sürümlerin yukarıdaki sayıları tarihsel kayıttır.
