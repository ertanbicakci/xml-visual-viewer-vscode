# XML Viewer 0.2.0 — yerel beta / yayın hazırlığı

25 Ekim 2026. Kullanıcının onayladığı kapsam: XML dosyasını değiştirmeden görsel inceleme. Yerel geliştirme ve beta paketi tamamlanır; Marketplace yayını ayrı bir adımdır. Publisher henüz kayıtlı değil. Kullanıcının onayıyla `ertanbicakci/xml-visual-viewer-vscode` GitHub deposu private oluşturuldu; repository/homepage/issues alanları güncellendi.

## Tamamlanan ürünleştirme

- [x] Aynı düğümde tekrarlanan kaynak seçimi yeni layout başlatmıyor. ELK kaynağı/worker ve sekiz topolojiye ait konumlar yeniden kullanılıyor.
- [x] Tam düğüm yolları saklanmıyor; parent/kardeş indeksinden hesaplanıyor. Worker/Webview ortak string tablosu kullanıyor. 32 MiB serileştirilmiş model ve 50.000 attribute sınırı var. Worker V8 old-generation limiti 256 MiB; bu toplam süreç RAM garantisi değildir.
- [x] Seçim, odak, açık dallar ve sayfalar namespace/ad, tekil `id` / `xml:id` ve içerik parmak iziyle yeniden eşleniyor. Belirsiz/tekrarlanan kimlikte seçim temizleniyor. Parmak izi kriptografik bir kimlik doğrulama mekanizması değildir.
- [x] Her panel bağımsız duraklatılıp yeniden başlatılabiliyor. Son panel durduğunda iş iptal ediliyor; diğer aktif paneller etkilenmiyor.
- [x] Yeniden dene, layout yeniden deneme, güncel hatanın kaynak konumuna gitme, Problems ve XML içeriği/yol içermeyen tanılama raporu var.
- [x] Kaynak bazlı VS Code ayarları: yön, başlangıç derinliği, imleç takibi, metadata/whitespace, gecikme ve görünür düğüm bütçesi.
- [x] Breadcrumb, 32 seçimlik geri/ileri geçmişi ve arama bağlamı var. Görünür bütçenin dışındaki sonuç kendi dalına odaklanarak gösteriliyor.
- [x] Inspector attribute sayısı, ad/namespace uzunluğu ve toplam metin boyutu sınırlandırılıyor; kısaltma açıklanıyor.
- [x] Uzun/Unicode metinler, boş/hatalı XML, worker kaynak hatası, dar panel, klavye ve azaltılmış hareket kontrolleri var.
- [x] Dört tema paletinde axe WCAG A/AA kontrolleri: kontrast, kaydırılabilir kaynak alanı ve ayırıcı ARIA bilgileri düzeltildi. Bu testler ekran okuyucu veya işletim sistemi forced-colors testi yerine geçmez.
- [x] SOAP, Maven POM ve karma içerik/Unicode örnekleri eklendi. Şema/link değerleri ağdan yüklenmiyor.
- [x] Yerel Git geçmişi, ürün simgesi, ekran görüntüsü, README/CHANGELOG, paket allowlist ve SHA-256 denetimi var.
- [x] Windows/Linux/macOS × VS Code 1.96.0/stable CI matrisi tanımlı. Manuel beta workflow'u ancak matrisi geçen revizyonda paket artefact'ı üretir; yayın yapmaz.

## Doğrulama kanıtı

| Kontrol | Yerel sonuç |
|---|---|
| TypeScript | Başarılı |
| Çekirdek testleri | 45 başarılı |
| Playwright | 22 başarılı; CSP, klavye, dört tema, sınır/hata ve örnek dosyalar dahil |
| Gerçek VS Code 1.96.0, macOS arm64 | Webview, graph↔source, canlı arama, ayarlar, Problems, bağımsız iptal/yeniden dene ve 48.002 düğümlü belge başarılı |
| Güncel kararlı VS Code 1.143.1, macOS arm64 | Aynı entegrasyon paketi çalıştırıldı; sürüme ait ölçüm raporu ayrı tutulur |
| Yerel kurulu VS Code 1.141.0 | Temel/genişletilmiş entegrasyon başarılı; büyük belge ölçümü bu sürümde ayrıca alınmadı |
| Bağımlılıklar | npm audit: bilinen açık yok |
| VSIX | 18 dosya / 750.743 bayt. Kimlik, tam dosya allowlist'i ve SHA-256 `docs/package-report.json` içinde; ayrı VS Code test profiline kurulum başarılı; geliştirici kaynakları, testler ve bağımlılık klasörleri dahil değil |

Performans raporları:

- `docs/benchmark.json`: yalnızca parser/model; bütçe hesabı ve parmak izi maliyeti dahil. Yeni sonuçlar eski v0.1 parser sürelerinin yerini alır.
- `docs/benchmark-ui.json`: yeni tarayıcı context'i ile beş ölçüm; ana thread üzerinde harness parser'ı, codec, ELK ve çizim. 48.002 düğüm / 3.593.799 bayt profili için açılış medyan 755,3 ms, p95 891,7 ms. Arama p95 317,2 ms. Ana renderer heap en yüksek 167,1 MiB; worker ve Extension Host RAM'i dahil değil.
- `docs/extension-performance-*.json`: gerçek VS Code komutundan kullanılabilir grafiğe kadar worker/IPC dahil tek örnek. Başlangıçta VS Code ve eklenti zaten açık; tüm uygulama soğuk başlangıcı veya p95 değildir. Kaynak güncelleme 400 ms debounce'u içerir.

Gerçek Extension Host büyük belge ölçümleri (tek örnek; milisaniye):

| VS Code | Açılış | Son düğüm araması | Kaynak güncelleme |
|---|---:|---:|---:|
| 1.96.0 | 2.129 | 316 | 2.742 |
| 1.143.1 | 1.996 | 504 | 1.850 |

Ölçümler Apple M3 Pro üzerinde alınmıştır. Desteklenen limitlerin altında olmak sabit yükleme süresi garantisi vermez. Düşük donanım ve farklı XML yapıları için ayrı beta ölçümü gerekir.

## Yayından önce kalanlar

1. **Publisher ve görünürlük:** Marketplace publisher kaydı ve benzersiz ad kontrolü bekliyor. GitHub repo ve `repository` / `homepage` / `bugs` adresleri hazır: https://github.com/ertanbicakci/xml-visual-viewer-vscode . Depo private; Marketplace görselleri için erişilebilir HTTPS barındırma veya deponun public yapılması ayrıca kararlaştırılmalı.
2. **Uzak CI:** depo oluşturulunca altı platform/sürüm kombinasyonunu gerçekten çalıştır. Workflow tanımlanmış olması Windows/Linux başarısı anlamına gelmez.
3. **Kullanıcı beta testi:** gerçek SOAP/konfigürasyon dosyaları, düşük/orta donanım, büyük namespace/attribute yapıları, dosya kodlamaları ve uzaktan workspace senaryoları.
4. **Manuel erişilebilirlik:** ekran okuyucu, %200 yazı büyütme ve Windows forced-colors/işletim sistemi yüksek kontrast modu.
5. **Performans kabulü:** standart hedef profilinde yeterli gerçek VS Code örneğiyle p95; hedef donanım, Remote SSH/Containers ve bellek ölçümü. Mevcut tek Extension Host ölçümü bu kabulü tek başına kanıtlamaz.
6. **Yayın kararı:** beta geri bildirimlerini ele al, sürüm/lisans/görselleri gözden geçir ve doğrulanmış VSIX üzerinden yayınla. Bu görevde dışarıya yayın yapılmadı.

Publisher `local` yerel geliştirme kimliğidir. Gerçek publisher'a geçince eklenti kimliği değişir; genel sürüm kurulurken yerel beta kaldırılmalıdır. `local` publisher ile beta paket README'si, bozuk göreli Marketplace bağlantıları üretmemek için `scripts/prepare-readme.mjs` ile metin olarak hazırlanır; kaynak README ve paket içindeki ekran görüntüsü korunur. Gerçek publisher ve herkese açık görsel adresleri hazır olduğunda normal görsel/link işleme devreye girer.

XPath, XSD/DTD doğrulama, düzenleme ve dışa aktarma bu beta kapsamında değildir; ilk sürümü yayınlamak için zorunlu eksik olarak sayılmaz.
