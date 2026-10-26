# XML Viewer geliştirme görevi

Amaç: JSON Crack benzeri görsel keşif sunan, XML semantiğini koruyan bir VS Code eklentisi için uygulanabilir proje planı hazırlamak.

## Görev adımları
- [x] Proje klasörünü ve mevcut uygulama durumunu incele.
- [x] Referans ürün ve VS Code entegrasyon belgelerini incele.
- [x] Kapsam tercihini iste; kullanıcı yalnızca görsel incelemeyi seçti.
- [x] Yaklaşımları karşılaştır ve önerilen mimariyi belirle.
- [x] Özellikler, XML modeli, aşamalar ve kabul ölçütleriyle PROJECT_PLAN.md dosyasını oluştur.
- [x] Planı kapsam, mimari, süreler ve kabul ölçütleri açısından incele; teslim özeti hazırla.

## Uygulama — kullanıcı 25 Ekim 2026 tarihinde başlamayı onayladı
- [x] Teknik doğrulama: konum bilgili parser, XML modeli ve kaynak testleri.
- [x] Extension: belgeye bağlı custom editor, worker ve mesaj sözleşmesi.
- [x] Grafik: XML kartları, arama, detaylar, aç/kapat ve yerleşim.
- [x] Entegrasyon: canlı güncelleme, kaynak bağlantısı ve kapasite sınırları.
- [x] Doğrulama: çekirdek/UI/VS Code testleri, performans ölçümü (macOS).
- [x] Teslim: README, örnek XML, VSIX ve durum raporu.

## Yayın öncesi kalan dış ortam kontrolleri
- Platform CI sonucu güncel çalışma bölümünde izlenir; eski yerel sürümde bu kontrol henüz çalıştırılmamıştı.
- Marketplace publisher kimliği, ad uygunluğu ve yayın kararı.
- UI ve gerçek Extension Host ölçümleri eklendi. Farklı hedef donanımlarda yeterli örnek sayısıyla p95 kabulü yayın öncesi kalır.

## Ürünleştirme — kullanıcı onayladı
- [x] İmleç seçiminde gereksiz layout'u kaldır; worker kaynağını/yerleşimleri tekrar kullan.
- [x] Model ve aktarım boyutlarını sınırla; tekrarlanan metinleri ortak tabloda taşı.
- [x] Güvenilir düğüm eşlemesiyle seçim, odak ve sayfalama durumunu koru.
- [x] Yeniden dene, panele özgü iptal, hata konumuna gitme ve içeriksiz tanılama ekle.
- [x] VS Code ayarları, breadcrumb, seçim geçmişi ve arama bağlamı ekle.
- [x] Tema/erişilebilirlik ve gerçek kullanıcı örneklerini test et; uçtan uca performans ölç.
- [x] Minimum VS Code sürümünü çalıştır; platform/sürüm CI ve sürüm paketleme akışını tamamla.
- [x] Git geçmişi, ürün görselleri, güncel README, beta VSIX ve yayın kontrol listesi oluştur.

Kullanıcı publisher / uzak repo bilgisinin henüz olmadığını ve yayın öncesinde sağlayacağını bildirdi. Yerel beta tamamlanır; dış yayın yapılmaz. Gerçek platform CI ve kullanıcı beta geri bildirimi açık dış kontrollerdir.

## Sınırlar
- Uygulama yetkisi verildi; Marketplace yayını bu görevin kapsamında değil.
- Kullanıcı ilk sürüm için yalnızca görsel incelemeyi seçti.

## Karşılaşılan durumlar
- Dosya envanteri araması eşleşme bulamadı: klasör boş.
- git status çalışmadı: klasör Git deposu değil. Mevcut geçmiş veya uygulanacak repo kuralları bulunmuyor.
- İlk ELK kaynak adresi 404 döndü; resmi kaynak kieler/elkjs olarak doğrulandı.

## 26 Ekim 2026 — Publisher dışındaki yayın açıkları
- [x] Başarısız macOS/Windows CI sonuçlarını kök nedenle düzelt ve altı kombinasyonu geçir.
- [x] %200 eşdeğeri görünüm, forced-colors, klavye/erişilebilirlik semantiği ve dosya kodlama senaryolarını tamamla.
- [x] Gerçek VS Code standart profilde tekrarlı p95 ölçümü ve paket üzerinden kurulum/açılış testi ekle.
- [x] Yayın metadata'sını ve publisher değişiminden bağımsız test/paket akışını tamamla.
- [x] Son paketi, kanıt raporlarını ve açık dış doğrulamaları güncelle; commit/push yap.

CI bulguları: macOS uzun UNIX socket yolu kısa profille giderildi. Windows CDP bağlantısı Webview öncesine alındı; kapanan frame'ler keşifte atlanıyor. Hızlı tıklama sırasında geç kamera hareketinin başka karta tıklatması, kamera yerleşimi bitene kadar grafiği inert tutarak ve otomatik hareketi animasyonsuz yaparak giderildi; başarısız regresyon testiyle doğrulandı. Seçim/odak testindeki 60 offset'inin title kapanışına denk geldiği görüldü; unique id attribute offset 49 kullanılıp item seçimi ayrıca doğrulandı. Public görünürlük kararı yanıtsız; private korunuyor.

Sonuç: 21eb2fb commit'i için 40254307746 numaralı CI koşusu altı kombinasyonda kaynak ve kurulu paket testlerini geçti. Kanıt docs/ci-validation.json içinde. İnsan/cihaz kabulü, publisher ve public destek/görünürlük tercihi açık dış kapılar olarak belgelenmiştir.

## Public depo — kullanıcı onayı
- [x] Depoyu kullanıcının açık tercihiyle public yap ve görünürlüğü doğrula.
- [x] README, destek ve paket görsellerini public erişime göre güncelle.
- [x] Public README ile VSIX'i tekrar paketle; linkleri ve runtime eşliğini doğrula.
