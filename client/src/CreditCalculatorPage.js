import React, { useState } from 'react';
import axios from 'axios';
import './CreditCalculatorPage.css'; 

function CreditCalculatorPage() {
    const [formVerisi, setFormVerisi] = useState({
        krediTutari: "",
        vade: "",
        aylikFaizOrani: "",
    });
    const [sonuc, setSonuc] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(false);


    const handleDegisiklik = (e) => {
        const { name, value } = e.target;
        setFormVerisi(prev => ({ ...prev, [name]: value }));
    };

    const handleHesapla = async (e) => {
        e.preventDefault();
        setYukleniyor(true);
        setSonuc(null);
        try {
            const response = await axios.post('http://localhost:5000/api/kredi/hesapla', {
                krediTutari: Number(formVerisi.krediTutari),
                vade: Number(formVerisi.vade),
                aylikFaizOrani: Number(formVerisi.aylikFaizOrani),
            });
            setSonuc(response.data);
        } catch (error) {
            console.error("Hesaplama sırasında hata oluştu!", error);
            alert("Hesaplama başarısız oldu.");
        } finally {
            setYukleniyor(false);
        }
    };
    
    const formatlaPara = (deger) => {
        return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(deger);
    };

    const oneCikanTeklif = sonuc?.alternatifTeklifler?.find(t => t.oneCikan);
    const digerTeklifler = sonuc?.alternatifTeklifler?.filter(t => !t.oneCikan);


    return (
        <div className="credit-page-wrapper">
            <div className="main-content-area">
                <div className="calculator-card">
                    <h2 className="calculator-title">Araç Kredisi Hesaplama</h2>
                    <p className="required-notice">* Doldurulması zorunlu alanlar.</p>
                    
                    <form onSubmit={handleHesapla}>
                        <div className="form-group">
                            <label className="form-label">* Kredi Tutarı:</label>
                            <input type="number" name="krediTutari" className="form-input" value={formVerisi.krediTutari} onChange={handleDegisiklik} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">* Vade (Ay):</label>
                            <input type="number" name="vade" className="form-input" value={formVerisi.vade} onChange={handleDegisiklik} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">* Faiz Oranı (%):</label>
                            <input type="number" step="0.01" name="aylikFaizOrani" className="form-input" value={formVerisi.aylikFaizOrani} onChange={handleDegisiklik} required />
                        </div>
                        <button type="submit" className="calculate-btn" disabled={yukleniyor}>
                            {yukleniyor ? 'Hesaplanıyor...' : 'Hesapla'}
                        </button>
                    </form>
                </div>

                {sonuc && (
                    <div className="results-container">
                        <div className="sonuc-alani">
                            <h3>Hesaplama Sonuçları</h3>
                            <div className="ozet-bilgiler">
                                <div><strong>Kredi Türü:</strong> {sonuc.krediTuru}</div>
                                <div><strong>Kredi Tutarı:</strong> {formatlaPara(sonuc.krediTutari)} TL</div>
                                <div><strong>Toplam Geri Ödenecek Tutar:</strong> {formatlaPara(sonuc.toplamGeriOdeme)} TL</div>
                                <div><strong>Aylık Taksit Tutarı:</strong> {formatlaPara(sonuc.aylikTaksit)} TL</div>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>NO</th><th>TARİH</th><th>TAKSİT</th><th>ANAPARA</th><th>FAİZ</th><th>KKDF</th><th>BSMV</th><th>KALAN ANAPARA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sonuc.odemePlani.map((taksit) => (
                                        <tr key={taksit.taksitNo}>
                                            <td>{taksit.taksitNo}</td><td>{taksit.tarih}</td><td>{formatlaPara(taksit.taksitTutari)} TL</td><td>{formatlaPara(taksit.anapara)} TL</td><td>{formatlaPara(taksit.faiz)} TL</td><td>{formatlaPara(taksit.kkdf)} TL</td><td>{formatlaPara(taksit.bsmv)} TL</td><td>{formatlaPara(taksit.kalanAnapara)} TL</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {sonuc.alternatifTeklifler && (
                            <div className="teklifler-alani">
                                {oneCikanTeklif && (
                                    <div className="one-cikan-wrapper">
                                        <h4 className="one-cikan-baslik">Sizin İçin En Uygun Teklif</h4>
                                        <div className="teklif-karti one-cikan-kart">
                                            <span className="one-cikan-etiket">Önerilen</span>
                                            <img src={oneCikanTeklif.logoUrl} alt={`${oneCikanTeklif.bankaAdi} logo`} />
                                            <span className="ornek-faiz-yazisi">Örnek Faiz: %{oneCikanTeklif.ornekFaizOrani}</span>
                                            <a href={oneCikanTeklif.yonlendirmeUrl} target="_blank" rel="noopener noreferrer" className="teklif-butonu">Teklifi İncele</a>
                                        </div>
                                    </div>
                                )}
                                {digerTeklifler && digerTeklifler.length > 0 && (
                                    <div>
                                        <h4 className="diger-teklifler-baslik">Diğer Teklifler</h4>
                                        <div className="teklif-listesi">
                                            {digerTeklifler.map((teklif, index) => (
                                                <div key={index} className="teklif-karti">
                                                    <img src={teklif.logoUrl} alt={`${teklif.bankaAdi} logo`} />
                                                    <a href={teklif.yonlendirmeUrl} target="_blank" rel="noopener noreferrer" className="teklif-butonu">İncele</a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreditCalculatorPage;