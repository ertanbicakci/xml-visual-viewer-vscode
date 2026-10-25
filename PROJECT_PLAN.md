# XML Viewer — VS Code eklentisi geliştirme planı

Tarih: 25 Ekim 2026  
Durum: Kullanıcının onayıyla salt okunur v0.1.0 yerel sürümü geliştirildi. Çekirdek, tarayıcı ve gerçek VS Code testleri macOS üzerinde doğrulandı. Windows/Linux CI yapılandırıldı; bu ortamda çalıştırılmadı. Uygulama ve doğrulama ayrıntıları: docs/implementation.md.  
Çalışma adı: XML Viewer. Marketplace adı ve kullanılabilirliği yayın hazırlığında kontrol edilecek.

## 1. Amaç ve ürün odağı

XML dosyalarını VS Code içinde etkileşimli bir ağaç grafiği olarak incelemek; elementler arasındaki ilişkiyi görmek, attribute ve değerleri okumak, grafikten kaynak koduna geçmek.

JSON Crack görsel keşif açısından referanstır. Web ürünü XML desteği de listeliyor. Bu eklentinin önerilen farkı, XML'in kendi yapısını koruyan görünüm ve VS Code kaynak editörüyle birlikte çalışmasıdır. Kaynak: [JSON Crack](https://jsoncrack.com/).

Öncelikli kullanım örnekleri: yapılandırma dosyaları, Maven pom.xml, SOAP mesajları, XML veri çıktıları ve namespace içeren belgeler. İlk sürüm tam XML 1.0 belgelerini hedefler. SVG gibi başka XML tabanlı dosyalar için otomatik dosya ilişkilendirmesi yapılmaz; daha sonra açık kullanıcı tercihiyle eklenebilir.

Başarı ölçütü: Kullanıcı bir XML dosyasını açıp yapısını görebilmeli, aradığı elemente ulaşabilmeli ve seçtiği graf düğümünün kaynak konumunu güvenilir biçimde bulabilmeli.

## 2. Yaklaşımlar ve öneri

| Yaklaşım | Kazanç | Maliyet / sınırlama | Karar |
|---|---|---|---|
| Webview içinde grafik + mevcut kaynak editörü | JSON Crack benzeri keşif, özel XML kartları, kaynakla bağlantı | Grafik performansı ve Webview yaşam döngüsü yönetilir | Önerilen |
| VS Code yerel TreeView | Daha basit arayüz, yerel klavye davranışları | Serbest grafik, yakınlaştırma ve geniş ilişki görünümü sınırlı | İleride tamamlayıcı görünüm |
| Bağımsız web uygulaması + ince VS Code bağlantısı | Tarayıcıda da kullanılabilir | Ayrı dağıtım ve entegrasyon kapsamı doğurur | İlk sürüm dışında |

Önerilen entegrasyon: `CustomTextEditorProvider` ile XML TextDocument modeline bağlı bir Webview. Grafik kaynak üzerinde düzenleme yapmaz. Custom editor kaydı `priority: option` olur; XML dosyasının normal metin editörü varsayılan kalır. VS Code metin tabanlı kaynaklar için bu belge modelini öneriyor. Kaynak: [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors).

## 3. Kullanıcı akışı

1. Kullanıcı bir `.xml` dosyasını metin editöründe açar.
2. Editör başlığı, Explorer sağ tık menüsü veya Command Palette üzerinden `XML Viewer: Open Visual Preview` komutunu çalıştırır.
3. Grafik kaynak editörünün yanında açılır; dosya URI'sine bağlı kalır. Başka bir metin sekmesine geçmek panelin belgesini değiştirmez.
4. Grafikte element seçildiğinde detay alanında tam ad, namespace URI, attribute'lar ve içerik görünür.
5. `Kaynakta göster` eylemi ilgili aralığı metin editöründe seçer. Kaynakta imleç hareketi de en yakın ilgili XML düğümünü grafikte vurgular; klavye odağı otomatik taşınmaz.
6. Metinde yapılan değişiklikler kaydedilmeyi beklemeden grafiğe yansır. Grafik üzerindeki eylemler dosyayı değiştirmez.

Alternatif giriş: `Reopen Editor With → XML Viewer`. `untitled` ve XML dil modundaki uzantısız belgeler komut üzerinden desteklenir; Explorer ilişkisi başlangıçta `.xml` ile sınırlıdır.

## 4. İlk sürüm özellikleri

| Özellik | Beklenen davranış |
|---|---|
| Hiyerarşik grafik | Elementler kart, ebeveyn–çocuk ilişkileri bağlantı olarak gösterilir |
| XML kartları | Tag adı, attribute özeti, kısa metin ve çocuk sayısı görünür |
| Dalları aç/kapat | Tek dal veya seçilen alt ağaç üzerinde çalışır; kaynak çocuk sırası korunur |
| Gezinme | Pan, zoom, ekrana sığdırma ve minimap |
| Yerleşim | Varsayılan soldan sağa; isteğe bağlı yukarıdan aşağıya |
| Detay alanı | Kesilmiş değerlerin tamamı, namespace bilgisi ve kaynak konumu |
| Arama | Element adı, attribute adı/değeri ve metin içinde arama; sonuç sayısı, sonraki/önceki sonuç |
| Gizli sonuçlara ulaşma | Kapalı dal içindeki eşleşmede atalar açılır, büyük kardeş listesinde ilgili sayfa yüklenir |
| Kaynak bağlantısı | Grafikten kaynağa gitme ve imleçten grafikte vurgulama |
| Canlı güncelleme | Başlangıçta 400 ms debounce; aynı belge sürümündeki sonuç kullanılır |
| Hata görünümü | Bozuk XML için satır/sütun ve açıklama; boş belge için yönlendirme |
| Tema ve erişilebilirlik | VS Code açık/koyu/yüksek kontrast renkleri, klavye ile seçim ve anlamlı etiketler |
| Yerel işleme | Ağ servisi, hesap veya API anahtarı gerektirmez |

Arayüz komut etiketleri başlangıçta İngilizce; tasarım metinleri çeviriye uygun tutulur. Node detayları ayrı, yeniden boyutlandırılabilir bir yan alanda açılır; dar panelde kapatılabilir.

### İlk sürüm dışında

- Grafikten XML düzenleme, sürükleyerek yeniden ebeveynleme veya bağlantı oluşturma.
- XSD/DTD şema doğrulaması, otomatik düzeltme ve formatlama.
- XPath sorgu çalıştırma. İlk sürümde kopyalanabilen yol yalnızca konum göstergesidir; çalıştırılabilir XPath garantisi verilmez.
- Dosya karşılaştırma, dönüşüm, bulut paylaşımı, AI açıklama ve işbirliği.
- PNG/SVG dışa aktarma, ayrı yerel TreeView ve sınırsız büyüklükte XML desteği.

## 5. XML'in doğru temsili

XML düz bir JSON nesnesine çevrilmez. Eklentiye ait model belge yapısını ve kaynak eşlemesini birlikte taşır.

| XML ayrıntısı | Model ve görünüm kararı |
|---|---|
| Aynı adlı kardeşler | Ayrı düğümler; kaynak sırası ve kardeş indeksi korunur |
| Attribute'lar | Elementten ayrı alanlar; kartta özet, detayda tam değer |
| Namespace | Prefix, local name ve çözümlenmiş URI ayrı tutulur; varsayılan namespace'in prefixesiz attribute'lara uygulanmadığı dikkate alınır |
| Karma içerik | `<p>Merhaba <b>dünya</b>!</p>` içindeki metin–element–metin sırası korunur |
| Whitespace | Modelde korunur; yalnızca görsel girinti metinleri varsayılan olarak gizlenir; `xml:space` dikkate alınır |
| CDATA, yorum ve processing instruction | Türleri korunur; yorum/PI görünürlüğü kullanıcı tarafından açılabilir |
| Boş element | `<item/>` gösterilir; kaynak yazımı değiştirilmez |
| Entity'ler | Standart XML entity'leri ve sayısal karakter referansları desteklenir; kaynak metni ile gösterilen değer ayrı tutulur |
| DTD / harici kaynak | İlk sürüm DOCTYPE içeren belgeleri açık bir desteklenmiyor durumuyla durdurur; entity çözmek için ağ/dosya erişimi yapmaz |
| Bildirim ve kodlama | VS Code'un çözdüğü TextDocument metni kullanılır; bildirim metadata olarak gösterilir; XML 1.1 açıkça kapsam dışı bildirilir |

Modelin temel alanları: belge URI'si ve sürümü; düğüm kimliği ve türü; ebeveyn/çocuk sırası; XML adı ve namespace bilgisi; attribute'lar; ham/gösterilen değer; kaynak aralıkları.

Element için tüm element ve açılış adı aralığı, attribute için ad/değer aralığı tutulur. Kaynak offset'leri VS Code'un UTF-16 konumlarıyla uyumlu, sonu hariç aralıklar olur. CRLF, emoji ve entity uzunlukları konum testlerine dahil edilir.

Düğüm kimlikleri belge sürümüne bağlıdır. Metin değişince seçim ve açık dallar yapısal yol üzerinden mümkün olduğunca geri eşlenir; güvenilir eşleşme yoksa seçim kaldırılır. Yanlış kaynağa gitmek yerine yeniden seçim istenir.

Örnek gösterim:

```xml
<catalog>
  <book id="42">
    <title>XML Guide</title>
  </book>
</catalog>
```

```text
catalog ── book [@id="42"] ── title ["XML Guide"]
```

Kısa yaprak metni kart içinde gösterilir. Karma içerikte ise sıralı metin parçaları gerektiğinde ayrı düğümlerle gösterilir; içerik birleştirilip anlamı değiştirilmez.

## 6. Teknik mimari

```text
VS Code TextDocument
        │ belge sürümü + metin
        ▼
Extension katmanı ── Ayrıştırma worker'ı ── XML modeli + kaynak indeksi
        │                                         │
        │ sürümlü mesajlar                        │ grafik izdüşümü
        ▼                                         ▼
React Webview ◄──────────────────────── Görünen düğüm/bağlantılar
        │
        ├── ELK yerleşim worker'ı → düğüm konumları
        └── düğüm seçimi → Extension → kaynakta göster
```

| Katman | Sorumluluk | Önerilen teknoloji |
|---|---|---|
| VS Code adaptörü | Komutlar, belge olayları, kaynakta seçim, panel yaşam döngüsü | TypeScript + VS Code API |
| XML çekirdeği | Ayrıştırma, sıralı model, namespace çözümü ve kaynak indeksi | UI'dan bağımsız TypeScript modülleri |
| Ayrıştırıcı adaptörü | Konum bilgili CST/token akışını modele dönüştürme | Aşama 1'de doğrulanacak kütüphane |
| Grafik izdüşümü | Görünür alt ağaç, arama, gizlenen çocuk sayıları | Saf fonksiyonlar |
| Webview | Kartlar, detay alanı, arama ve gezinme | React + TypeScript + `@xyflow/react` |
| Yerleşim | Düğüm boyutlarına göre sıralı ağaç yerleşimi | ELK.js, worker içinde |
| Paketleme | Extension ve Webview için ayrı derleme çıktıları | esbuild + Vite |
| Doğrulama | Çekirdek testleri, UI testleri, gerçek VS Code entegrasyonu | Vitest, Playwright ve VS Code test araçları |

React Flow etkileşimli grafik arayüzü için, ELK.js otomatik konumlandırma için öneriliyor; bunlar farklı sorumluluklardır. Resmi kaynaklar: [React Flow](https://reactflow.dev/learn), [ELK.js](https://github.com/kieler/elkjs).

Ayrıştırıcı için `@xml-tools/parser` ve ilgili konum araçları ilk değerlendirilecek adaydır. Eski proje deposu yeni kaynak adresine yönlendiriyor; güncel paket/bakım durumu uygulama öncesinde ayrıca doğrulanmalıdır. Tek kütüphanenin hem kaynak aralıklarını hem gerekli XML kurallarını sağladığı varsayılmaz. Kaynak: [XML Tools](https://github.com/SAP-archive/xml-tools).

Seçim kapısı: Karma içerik, namespace kapsamı, bozuk XML, attribute konumu ve UTF-16 eşleme örnekleri geçmeden ayrıştırıcı sabitlenmez. Ham kaynak aralıkları desteklenmiyorsa JSON dönüşümüne geçilmez; başka konum bilgili parser değerlendirilir. Arşivlenmiş `saxes` yeni projenin varsayılan bağımlılığı olarak önerilmiyor. Kaynak: [saxes deposu](https://github.com/lddubeau/saxes).

### Mesajlaşma ve durum

- Mesajlar URI, belge sürümü, istek kimliği ve tür taşır; çalışma anında doğrulanır.
- Extension yalnızca bağlı belgenin geçerli modelindeki nodeId üzerinden kaynak aralığına karar verir; Webview'dan keyfi dosya URI'si/aralık kabul etmez.
- Ayrıştırma ve layout sonuçları eskidiyse uygulanmaz. Yeni istek öncekinin işini iptal eder veya sonucunu geçersiz kılar.
- Parse hatasında son geçerli grafik varsa görünür biçimde eski sürüm etiketi taşır; güncel konum eşlemesi ve kaynakta gösterme devre dışı olur. İlk açılış hatalıysa hata görünümü açılır.
- Yakınlaştırma ve dal durumu küçük Webview state'i olarak tutulur; XML içeriği kalıcı state'e yazılmaz. Panel kapanınca olay abonelikleri ve worker işleri temizlenir.

Webview eklentiyle mesajlaşır; kaynaklar paket içinden yüklenir. Sıkı CSP, sınırlı localResourceRoots ve XML değerlerinin HTML olarak çalıştırılmadan metin olarak gösterilmesi tasarımın parçasıdır. Worker paketlemesi CSP ile prototipte doğrulanır. Kaynak: [Webview API](https://code.visualstudio.com/api/extension-guides/webview).

## 7. Performans ve kapasite

Dosya boyutu ile çizilecek düğüm sayısı ayrı ölçülür. İlk hedefler aşağıdaki başlangıç bütçeleridir; doğrulanmış kapasite iddiası değildir.

- Standart profil: en fazla 1 MiB UTF-8 eşdeğeri metin ve 5.000 model düğümü; ilk grafikte en fazla 300 düğüm. Referans cihazda komuttan kullanılabilir görünüme p95 ≤ 2 saniye hedefi.
- Büyük profil: en fazla 10 MiB ve 50.000 model düğümü; kök ve sınırlı derinlik ilk açılışta gösterilir. Kullanıcıya ilerleme/iptal sunulur; tam açık grafik vaat edilmez.
- Görünür grafik bütçesi başlangıçta 1.000 düğüm. Aynı ebeveynin uzun çocuk listesi 100'lük gruplarla açılır. Bütçe aşılınca sessiz veri atmak yerine alt ağaca odaklanma önerilir.
- İlk derinlik 2; kullanıcı genişletir. Azami ayrıştırma derinliği başlangıçta 256; daha derin belgeler açıklamalı sınır durumuna geçer.
- Parse işlemi Extension Host'u, layout işlemi Webview ana iş parçacığını bloke etmez. Worker iptali ve zaman bütçesi uygulanır.
- 10 MiB / 50.000 düğüm üzeri belgeler ilk sürümde açıklamalı sınır durumuna geçer. Toplam parse bütçesi başlangıçta 10 saniyedir; aşılırsa sonlandırılır.
- Grafikte kısa özetler taşınır; büyük değerler seçim sırasında istenir. İlk sürüm tam belgeyi yeniden ayrıştırır; incremental parser kapsam dışıdır.
- Benchmark kaydı cihaz, işletim sistemi, VS Code sürümü, dosya boyutu, düğüm sayısı, derinlik, parse/layout süresi ve bellek artışını içerir.

Kapalı ağaçları gerektiğinde açmak React Flow'un da önerdiği performans yöntemlerinden biridir. Kaynak: [React Flow performans rehberi](https://reactflow.dev/learn/advanced-use/performance).

## 8. Geliştirme aşamaları

Tahmin: Bir geliştirici için toplam 14–18 iş günü. Bu tahmin ilk parser/worker denemesinden sonra güncellenir; Marketplace inceleme süresi dahil değildir.

| Aşama | Süre | İşler | Çıkış ölçütü |
|---|---|---|---|
| 1. Teknik doğrulama | 2 gün | Temsilci XML örnekleri; parser/konum denemesi; ELK worker + CSP; node bütçesi ölçümü | Kaynak eşlemesi kanıtlanır, parser kararı ve ölçüm raporu çıkar |
| 2. Extension temeli | 2 gün | TypeScript yapılandırması, komutlar, optional custom editor, yan panel, sürümlü mesaj sözleşmesi | XML yanında Webview açılır; iki dosya/panel birbirine karışmaz |
| 3. XML çekirdeği | 3–4 gün | Sıralı model, namespace, kaynak indeksi, worker, hatalı XML durumları | XML test matrisi ve konum testleri geçer |
| 4. Görsel keşif | 3–4 gün | XML kartları, yerleşim, dallar, pan/zoom, minimap, detay ve arama | Geçerli dosya grafikten okunabilir ve aranabilir |
| 5. Senkronizasyon ve kapasite | 2–3 gün | İki yönlü seçim, debounce, stale sonuçları reddetme, büyük dosya modu, tema/klavye | Kaynak değişince yanlış düğüm/satır gösterilmez; bütçeler ölçülür |
| 6. Yayın adayı | 2–3 gün | Entegrasyon, işletim sistemi smoke testleri, README, örnekler, bağımlılık lisansları ve VSIX | Temiz VS Code profiline kurulabilen, belgelenmiş paket oluşur |

Bağımlılık sırası: 1 → 2 → 3 → 4 → 5 → 6. İlk kullanıcıya gösterilebilir teknik demo aşama 4 sonunda beklenir. Aşama 1 başarısızsa parser/yerleşim kararı ve süre yeniden değerlendirilir.

## 9. Test ve kabul ölçütleri

### XML test matrisi

- Küçük örnek, tekrar eden kardeşler, attribute'lar ve self-closing elementler.
- Namespace prefix yeniden tanımlama, varsayılan namespace, aynı local name/farklı URI ve prefixesiz attribute.
- Metin–element–metin, CDATA, yorum, PI, `xml:space`, satır sonları, Türkçe ve emoji.
- Entity çözülmüş değer ile ham kaynak aralığı farkı; uzun attribute/metin.
- Bozuk kapanış, eksik tırnak, birden çok kök ve desteklenmeyen DOCTYPE/XML sürümü.
- Çok geniş, çok derin, büyük ve limit üstü belgeler.

### Kullanıcı kabul listesi

- [ ] `.xml` dosyası tek komutla kaynağın yanında görselleşir; metin editörü varsayılan kalır.
- [ ] Görselleştirici hiçbir belgeyi değiştirmez veya dirty hale getirmez.
- [ ] Çocuk sırası ve karma içerik tüm örneklerde korunur.
- [ ] Grafikten kaynağa geçiş tekrar eden isimler, CRLF ve emoji içeren belgelerde doğru aralığı seçer.
- [ ] Kaynak imleci ilgili graf düğümünü vurgular; odak kaybına yol açmaz.
- [ ] Hızlı ardışık değişikliklerde eski parse/layout sonucu son görünümü geri alamaz.
- [ ] Parse hatası görünür; eski grafikte güncelmiş gibi kaynak gezintisi yapılamaz.
- [ ] Kapalı veya sayfalanmış dallardaki arama sonuçlarına ulaşılır.
- [ ] En az iki dosya ve aynı dosyaya ait iki görünüm bağımsız görünüm durumlarıyla çalışır.
- [ ] Büyük dosya bütçeleri, iptal, worker sonlandırma ve panel kapatma doğrulanır.
- [ ] Paket ağ bağlantısı olmadan çalışır; XML'deki HTML/URL içerikleri yürütülmez veya otomatik yüklenmez.
- [ ] Açık/koyu/yüksek kontrast tema ve klavye gezinmesi kontrol edilir.
- [ ] VSIX temiz VS Code profiline kurulur; Windows, macOS ve Linux üzerinde temel akış doğrulanır.

Çekirdek ve kaynak eşlemesi için 30 test; grafik etkileşimleri için 8 tarayıcı testi; komutlar, TextDocument olayları, Webview ve kaynak seçimi için gerçek VS Code Extension Host senaryosu eklendi. macOS doğrulaması tamamlandı. Ayrıntılar: docs/implementation.md.

## 10. Yayın sonrası sıralama

1. v0.2: seçili alt ağacı SVG/PNG dışa aktarma ve namespace-aware XPath sorguları.
2. v0.3: daha büyük dosyalar için incremental işleme, yerel outline görünümü ve kullanım verisine göre performans iyileştirme.
3. v0.4: XSD doğrulaması ve yapısal XML karşılaştırma; ayrı teknik keşif gerektirir.
4. Görsel düzenleme: Kullanıcı talebi doğrulanırsa ayrı ürün aşaması. Kaynak yazımı, undo/redo ve belge koruma kuralları yeniden tasarlanır.

İlk geliştirme adımı, konum eşlemesini ve worker paketlemesini doğrulayan sınırlı teknik prototiptir. İlk sürüm kapsamı yalnızca görsel incelemedir.
