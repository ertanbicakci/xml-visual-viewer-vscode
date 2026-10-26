# XML Viewer 0.2.1 — yayın adayı

26 Ekim 2026. Kapsam: XML dosyasını değiştirmeden görsel inceleme. Marketplace yayını ve publisher kaydı bu çalışmanın dışında; publisher henüz `local` geliştirme kimliği.

Depo: https://github.com/ertanbicakci/xml-visual-viewer-vscode . Kullanıcının açık onayıyla 26 Ekim 2026 tarihinde public yapıldı. README görseli ve GitHub Issues herkesçe erişilebilir. `vscode:prepublish` komutu `scripts/prepare-readme.mjs --public-repository` kullanıyor; vsce göreli görsel/linkleri public depo adreslerine dönüştürüyor. Publisher hâlâ `local`; görünürlük değişikliği Marketplace yayını değildir.

## Tamamlanan teknik işler

- [x] XML semantiği, namespace, karma içerik, CDATA/yorum/PI ve UTF-16 kaynak aralıkları.
- [x] Kaynak↔grafik seçimi, tam içerikte arama, kapalı/sayfalanmış/bütçe dışındaki sonuçların gösterilmesi.
- [x] Açık dallar, sayfalar, odak ve tekil eşleşen seçimin güncellemelerden sonra korunması; belirsiz kimliklerde seçimin temizlenmesi.
- [x] Worker kaynaklarının ve sekiz topoloji yerleşiminin yeniden kullanılması; aynı kaynak düğümündeki imleç hareketlerinin yeni layout başlatmaması.
- [x] 10 MiB giriş, 50.000 düğüm/attribute, 256 derinlik, 32 MiB serileştirilmiş model ve 10 saniye işlem bütçeleri. Worker V8 old-generation limiti 256 MiB; toplam süreç RAM garantisi değildir.
- [x] Panele özgü duraklat/yeniden dene; layout retry; Problems/hata konumu; XML ve dosya yolu içermeyen tanılama raporu.
- [x] Kaynak bazlı ayarlar, breadcrumb ve 32 seçimlik geçmiş; toplamı sınırlandırılan inspector detayları.
- [x] Dört tema paleti, forced-colors sistem renkleri, dar/200% eşdeğeri görünüm, klavye gezinmesi ve erişilebilirlik semantiği.
- [x] Yavaş layout sonrasında odak dönüşü; kullanıcı Tab veya doğrudan odak taşıma ile başka yere geçtiğinde odağın çalınmaması. Hızlı dal düğmesi tıklamalarının kart çift tıklamasına yayılmaması; grafik ve otomatik kamera yerleşimi bitmeden yeniden tıklama kabul edilmemesi.
- [x] UTF-8 BOM, UTF-16 LE/BE BOM dosyaları; salt okunur, `file:` olmayan FileSystemProvider URI'si; kaynakta doğru metin seçimi.
- [x] Gerçek VS Code içinde beş standart dosya açılışı ve büyük dosyada açılış/arama/güncelleme ölçümü.
- [x] Kurulan VSIX'in bağımsız test-driver ile sınanması; test hedefinin checkout değil kurulum klasöründe bulunduğunun doğrulanması. Test kimliği manifestten alındığı için publisher değişimi testi bozmaz.
- [x] README, SUPPORT, hata bildirim formu, CHANGELOG, örnek XML'ler, simge/ekran görüntüsü, lisans bildirimleri, paket allowlist ve SHA-256.

## Doğrulama

- TypeScript başarılı, npm audit: 0 güvenlik açığı; 48 çekirdek testi, 29 tarayıcı senaryosu.
- Tarayıcı senaryoları: CSP altında gerçek ELK worker; veri/kaynak senkronizasyonu, hatalı/boş/uzun Unicode XML, namespace ve güvenli metin gösterimi; arama/odak/geçmiş; gecikmeli layout ve klavye odağı; hızlı çift tıklama; dört tema ile axe WCAG A/AA; forced-colors ve 200% eşdeğeri viewport.
- Gerçek VS Code testleri: komutlar, unsaved edit/undo, kaynak seçimi, ayarlar, Problems, tanılama, untitled, aynı belgeye ait bağımsız paneller, BOM kodlamaları, sanal salt okunur URI, 48.002 düğümlü belge ve standart profil.
- Windows/Linux/macOS × 1.96.0/stable kaynak ve kurulu VSIX matrisi **6/6 başarılı**. [Doğrulanmış CI koşusu](https://github.com/ertanbicakci/xml-visual-viewer-vscode/actions/runs/40254307746), test edilen commit `21eb2fb3d474be6fe696bcbd8b7e31cdcb496dd4`. İşler, kullanılan kontroller, kurulu paket ölçümleri ve teslim runtime hash karşılaştırması `docs/ci-validation.json` içinde. Sonraki belge/README, public paketleme seçeneği ve destek metni güncellemeleri runtime kodunu değiştirmedi.
- İlk CI hataları: macOS uzun UNIX socket yolu ve Windows'ta yüklenmiş iç frame'e sonradan CDP bağlanma. Kısa geçici profiller, dinamik loopback portu, Webview'dan önce CDP bağlantısı, kapanmış frame'leri atlayan keşif ve hata ekranı/log kaydı ile giderildi. Hiçbir platform/senaryo skip edilmedi; CSP veya site izolasyonu gevşetilmedi.

## Performans kapsamı

Standart profil 970.743 bayt / 5.000 model düğümü; aynı açık VS Code içinde beş yeni önizleme paneli. Ölçüm worker, IPC, layout, çizim ve iki animation frame'i içerir; VS Code açılışı ve extension activation öncedir, renderer cache'i sıcak olabilir. Beş örnekli p95 diğer donanımlar için garanti değildir.

Yerel Apple M3 Pro kurulu paket ölçümleri `docs/extension-performance-*-package.json` içinde tutulur. GitHub paylaşımlı runner ölçümleri ayrı CI kanıtıdır; farklı CPU/OS ve sanal grafik ortamlarını doğrudan aynı performans hedefiyle karşılaştırmak doğru değildir.

Kurulu VSIX, standart profil p95 (ms; beş örnek):

| Ortam | VS Code 1.96.0 | VS Code 1.143.1 |
|---|---:|---:|
| Yerel Apple M3 Pro | 678 | 632 |
| CI Linux | 1.608 | 1.948 |
| CI Windows | 2.148 | 1.603 |
| CI macOS | 2.264 | 1.562 |

Referans cihazdaki ≤2 saniye hedefi sağlandı; bazı paylaşımlı CI minimum sürüm ölçümleri bu hedefi aşıyor. Bunlar platform işlev testinin başarısını değiştirmez; tüm cihazlarda iki saniye garantisi verilmez. Ayrıntılı örnekler, CPU ve ölçüm kapsamı `docs/ci-validation.json` içinde.

Büyük profil 3.593.799 bayt / 48.002 düğüm; tam açık grafik vaat edilmez. Kaynak güncelleme 400 ms debounce'u içerir. Bellek alanları Extension Host süreç anlık görüntüsüdür; test/VS Code altyapısı dahildir, worker/renderer tepe belleği dahil değildir.

- `docs/extension-performance-*-package.json`: v0.2.1 kurulu VSIX ölçümleri; `docs/extension-performance-1.96.0.json` ve `docs/extension-performance-1.143.1.json` v0.2.0 tarihsel kaynak ölçümleridir. Cihaz, sürüm, örnek sayısı ve kapsam her raporda belirtilir.
- `docs/benchmark-ui.json`: ayrı tarayıcı harness'inde beş örnek; Extension Host IPC/debounce dahil değildir.
- `docs/benchmark.json`: yalnızca parser/model. Bu üç kapsam birbirinin yerine kullanılmaz.
- `docs/package-report.json`: son yerel paketin kimliği, dosya listesi, boyutu ve SHA-256 değeri.

## Teslim paketi

`xml-visual-viewer-0.2.1.vsix`: 19 dosya, 752.493 bayt. Yerel minimum/kararlı VS Code kurulum testleri başarılı. SHA-256: `db5ad25916c7dc825ff9f95c3c4e9fab9f0409a1531051218a5e1dbdd5c1c391`. Tam liste `docs/package-report.json` içinde. Beş runtime dosyasının SHA-256 değerleri altı başarılı CI paketindeki dosyalarla birebir eşleşiyor; public README ve destek metni değişiklikleri çalıştırılan kodu değiştirmedi.

## Gerçekten dışarıda kalanlar

1. **Publisher:** Microsoft Marketplace publisher hesabı/ID'si ve sunucunun son ad uygunluğu kontrolü. Kimlik oluşturulmadan `local` değiştirilmez; GitHub hesabı Marketplace kimliği yerine geçmez.
2. **İnsan/cihaz kabulü:** gerçek kullanıcı beta geri bildirimi, gerçek VoiceOver/NVDA dinleme testi, OS yüksek kontrast ve gerçek Remote SSH/Container bağlantısı. Otomatik forced-colors/ARIA/sanal URI testleri bunların yapıldığı anlamına gelmez. Tekrarlanabilir kontrol listesi `docs/manual-acceptance.md` içindedir.
3. **Yayın kararı:** kullanıcı doğrulanmış paketi değerlendirdikten sonra Marketplace'e yükleme. Bu çalışmada Marketplace yayını yapılmadı.

XPath, şema doğrulama, düzenleme, dışa aktarma ve incremental parser onaylanan ilk sürümün dışında; eksik implementasyon olarak gösterilmez. Publisher değiştiğinde eklenti ID'si değişeceği için genel sürümü kurarken yerel beta kaldırılmalıdır.
