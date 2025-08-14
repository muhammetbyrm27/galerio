import React, { useState } from 'react';
import './MarketValuePage.css';
import carData from './arabaVerisi.js';

// Path eşleştirmeleri
const sahibindenFuelMap = {
    'benzin': 'benzinli',
    'lpg': 'benzin-lpg',
    'dizel': 'dizel',
    'hibrit': 'hibrit',
    'elektrik': 'elektrikli'
};

const sahibindenGearMap = {
    'manuel': 'manuel',
    'otomatik': 'otomatik',
    'yari-otomatik': 'yari-otomatik'
};

const arabamFuelMap = {
    'benzin': 'benzinli',
    'lpg': 'benzin-lpg',
    'dizel': 'dizel',
    'hibrit': 'hibrit',
    'elektrik': 'elektrikli'
};

const arabamGearMap = {
    'manuel': 'duz',
    'otomatik': 'otomatik',
    'yari-otomatik': 'yari-otomatik'
};

export default function MarketValuePage() {
    const [filters, setFilters] = useState({
        brand: '', model: '', customBrand: '', customModel: '',
        yearMin: '', yearMax: '', kmMin: '', kmMax: '',
        gear: '', fuel: '',
    });

    const carBrands = Object.keys(carData).sort();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "brand") {
            setFilters(prev => ({
                ...prev,
                brand: value,
                model: '',
                customBrand: value === 'Other' ? prev.customBrand : '',
                customModel: ''
            }));
        }
        else if (name === "model") {
            setFilters(prev => ({
                ...prev,
                model: value,
                customModel: value === 'Other' ? prev.customModel : ''
            }));
        }
        else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const getFinalBrand = () => filters.brand === 'Other' ? filters.customBrand : filters.brand;
    const getFinalModel = () => filters.model === 'Other' ? filters.customModel : filters.model;

    // Sahibinden.com yönlendirme
    const redirectToSahibinden = () => {
        const finalBrand = getFinalBrand();
        const finalModel = getFinalModel();
        let pathParts = [];

        if (finalBrand) pathParts.push(finalBrand.toLowerCase().replace(/\s+/g, '-'));
        if (finalModel) pathParts.push(finalModel.toLowerCase().replace(/\s+/g, '-'));
        if (filters.fuel && sahibindenFuelMap[filters.fuel]) pathParts.push(sahibindenFuelMap[filters.fuel]);
        if (filters.gear && sahibindenGearMap[filters.gear]) pathParts.push(sahibindenGearMap[filters.gear]);

        const params = new URLSearchParams();
        if (filters.yearMin) params.append('a5_min', filters.yearMin);
        if (filters.yearMax) params.append('a5_max', filters.yearMax);
        if (filters.kmMin) params.append('a4_min', filters.kmMin);
        if (filters.kmMax) params.append('a4_max', filters.kmMax);

        let finalUrl = 'https://www.sahibinden.com/' + pathParts.join('/');
        if (params.toString()) finalUrl += `?${params.toString()}`;

        window.open(finalUrl, '_blank');
    };

    // Arabam.com yönlendirme
    const redirectToArabamCom = () => {
        const finalBrand = getFinalBrand();
        const finalModel = getFinalModel();
        let path = '/ikinci-el/otomobil';

        if (finalBrand) {
            path += `/${finalBrand.toLowerCase().replace(/\s+/g, '-')}`;
            if (finalModel) {
                path += `-${finalModel.toLowerCase().replace(/\s+/g, '-')}`;
            }
        }

        if (filters.gear && arabamGearMap[filters.gear]) path += `-${arabamGearMap[filters.gear]}`;
        if (filters.fuel && arabamFuelMap[filters.fuel]) path += `-${arabamFuelMap[filters.fuel]}`;

        const params = new URLSearchParams();
        if (filters.yearMin) params.append('minYear', filters.yearMin);
        if (filters.yearMax) params.append('maxYear', filters.yearMax);
        if (filters.kmMin) params.append('minkm', filters.kmMin);
        if (filters.kmMax) params.append('maxkm', filters.kmMax);

        let finalUrl = 'https://www.arabam.com' + path;
        if (params.toString()) finalUrl += `?${params.toString()}`;

        window.open(finalUrl, '_blank');
    };

    return (
        <div className="comparison-wrapper">
            <div className="comparison-card">
                <h2>Araç Piyasa Değeri Karşılaştırma</h2>
                <p>Filtreleri doldurarak Sahibinden.com ve Arabam.com'daki piyasa değerlerini anında görün.</p>

                <div className="filter-grid">
                    <div className="form-group">
                        <label>Marka</label>
                        <select name="brand" value={filters.brand} onChange={handleInputChange}>
                            <option value="">MARKA SEÇİNİZ</option>
                            {carBrands.map(brand => (<option key={brand} value={brand}>{brand}</option>))}
                            <option value="Other">DİĞER...</option>
                        </select>
                    </div>

                    {filters.brand === 'Other' && (
                        <div className="form-group">
                            <label>Markayı Manuel Girin</label>
                            <input type="text" name="customBrand" value={filters.customBrand} onChange={handleInputChange} placeholder="MARKAYI GİRİNİZ" />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Model</label>
                        <select name="model" value={filters.model} onChange={handleInputChange} disabled={!filters.brand}>
                            <option value="">MODEL SEÇİNİZ</option>
                            {filters.brand && carData[filters.brand] && carData[filters.brand].map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                            {filters.brand && <option value="Other">DİĞER...</option>}
                        </select>
                    </div>

                    {filters.model === 'Other' && (
                        <div className="form-group">
                            <label>Modeli Manuel Girin</label>
                            <input type="text" name="customModel" value={filters.customModel} onChange={handleInputChange} placeholder="MODELİ GİRİNİZ" />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Vites Tipi</label>
                        <select name="gear" value={filters.gear} onChange={handleInputChange}>
                            <option value="">TÜMÜ</option>
                            <option value="manuel">MANUEL</option>
                            <option value="otomatik">OTOMATİK</option>
                            <option value="yari-otomatik">YARI OTOMATİK</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Yakıt Tipi</label>
                        <select name="fuel" value={filters.fuel} onChange={handleInputChange}>
                            <option value="">TÜMÜ</option>
                            <option value="benzin">BENZİN</option>
                            <option value="dizel">DİZEL</option>
                            <option value="hibrit">HİBRİT</option>
                            <option value="elektrik">ELEKTRİK</option>
                            <option value="lpg">BENZİN & LPG</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Yıl (En Az)</label>
                        <input type="number" name="yearMin" value={filters.yearMin} onChange={handleInputChange} placeholder="örn: 2015" />
                    </div>
                    <div className="form-group">
                        <label>Yıl (En Çok)</label>
                        <input type="number" name="yearMax" value={filters.yearMax} onChange={handleInputChange} placeholder="örn: 2020" />
                    </div>
                    <div className="form-group">
                        <label>KM (En Az)</label>
                        <input type="number" name="kmMin" value={filters.kmMin} onChange={handleInputChange} placeholder="örn: 50000" />
                    </div>
                    <div className="form-group">
                        <label>KM (En Çok)</label>
                        <input type="number" name="kmMax" value={filters.kmMax} onChange={handleInputChange} placeholder="örn: 150000" />
                    </div>
                </div>

                <div className="button-container">
                    <button className="search-button sahibinden-button" onClick={redirectToSahibinden}>
                        Sahibinden.com'da Ara
                    </button>
                    <button className="search-button arabam-button" onClick={redirectToArabamCom}>
                        Arabam.com'da Ara
                    </button>
                </div>
            </div>
        </div>
    );
}
