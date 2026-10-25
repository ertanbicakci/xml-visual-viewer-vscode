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
- Windows ve Linux üzerinde CI senaryolarının çalıştırılması.
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
