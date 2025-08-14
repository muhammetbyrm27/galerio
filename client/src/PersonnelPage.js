import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './PersonnelPage.css';

function PersonnelPage() {
    const [personnelList, setPersonnelList] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPersonnelId, setCurrentPersonnelId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const initialFormState = {
        ad: '', soyad: '', tc_kimlik: '', telefon: '', dogum_tarihi: '',
        adres: '', pozisyon: '', maas: '', ise_baslama_tarihi: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const authConfig = useMemo(() => {
        const token = localStorage.getItem('token');
        return {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
    }, []);

    const fetchPersonnel = useCallback(async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/personnel', authConfig);
            setPersonnelList(data);
        } catch (error) { 
            console.error("Personel listesi alınamadı:", error); 
            alert(error.response?.data?.message || 'Personel listesi alınamadı.');
        }
    }, [authConfig]);

    useEffect(() => { 
        fetchPersonnel(); 
    }, [fetchPersonnel]);

    const handleInputChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setCurrentPersonnelId(null);
        setFormData(initialFormState);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`http://localhost:5000/api/personnel/${currentPersonnelId}`, formData, authConfig);
                alert('Personel güncellendi!');
            } else {
                await axios.post('http://localhost:5000/api/personnel', formData, authConfig);
                alert('Personel eklendi!');
            }
            cancelEdit();
            fetchPersonnel();
        } catch (error) {
            alert(error.response?.data?.message || 'Bir hata oluştu.');
        }
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        // Gelen tarih formatını kontrol et
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    const handleEdit = (person) => {
        setIsEditing(true);
        setCurrentPersonnelId(person.id);
        setFormData({
            ...person,
            dogum_tarihi: formatDateForInput(person.dogum_tarihi),
            ise_baslama_tarihi: formatDateForInput(person.ise_baslama_tarihi)
        });
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            try {
                await axios.delete(`http://localhost:5000/api/personnel/${id}`, authConfig);
                alert("Personel silindi.");
                fetchPersonnel();
            } catch (error) { 
                console.error("Silme hatası:", error); 
                alert(error.response?.data?.message || 'Personel silinirken bir hata oluştu.');
            }
        }
    };

    const filteredPersonnel = useMemo(() => personnelList.filter(p =>
        Object.values(p).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    ), [personnelList, searchTerm]);

   
    return (
        <div className="personnel-page-wrapper">
            <div className="personnel-page">
                <div className="card form-card-personnel">
                    <h2>{isEditing ? 'Personel Bilgilerini Düzenle' : 'Yeni Personel Kayıt'}</h2>
                    <form onSubmit={handleSubmit} className="personnel-form">
                        <input name="ad" value={formData.ad} onChange={handleInputChange} placeholder="Ad" required />
                        <input name="soyad" value={formData.soyad} onChange={handleInputChange} placeholder="Soyad" required />
                        <input name="tc_kimlik" value={formData.tc_kimlik} onChange={handleInputChange} placeholder="TC Kimlik No" required maxLength="11" />
                        <input name="telefon" value={formData.telefon} onChange={handleInputChange} placeholder="Telefon" required />
                        <input name="pozisyon" value={formData.pozisyon} onChange={handleInputChange} placeholder="Pozisyon" />
                        <input name="maas" type="number" step="0.01" value={formData.maas} onChange={handleInputChange} placeholder="Maaş (₺)" />
                        <div className="date-input-group">
                            <label>Doğum Tarihi</label>
                            <input name="dogum_tarihi" type="date" value={formData.dogum_tarihi} onChange={handleInputChange} />
                        </div>
                        <div className="date-input-group">
                            <label>İşe Başlama Tarihi</label>
                            <input name="ise_baslama_tarihi" type="date" value={formData.ise_baslama_tarihi} onChange={handleInputChange} required />
                        </div>
                        <textarea name="adres" value={formData.adres} onChange={handleInputChange} placeholder="Adres" className="address-area-personnel"></textarea>
                        <div className="form-buttons-personnel">
                            <button type="submit" className="submit-btn-personnel">
                                {isEditing ? 'Bilgileri Güncelle' : 'Personeli Kaydet'}
                            </button>
                            {isEditing && (
                                <button type="button" className="cancel-btn-personnel" onClick={cancelEdit}>İptal</button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="card table-card-personnel">
                    <div className="table-header">
                        <h2>Kayıtlı Personeller</h2>
                        <input type="text" placeholder="Personel listesinde ara..." className="filter-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ad Soyad</th>
                                    <th>TC Kimlik</th>
                                    <th>Telefon</th>
                                    <th>Pozisyon</th>
                                    <th>Maaş</th>
                                    <th>İşe Başlama</th>
                                    <th>Doğum Tarihi</th>
                                    <th>Adres</th>
                                    <th className="actions-header">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPersonnel.map(person => (
                                    <tr key={person.id}>
                                        <td>{`${person.ad} ${person.soyad}`}</td>
                                        <td>{person.tc_kimlik}</td>
                                        <td>{person.telefon}</td>
                                        <td>{person.pozisyon || '-'}</td>
                                        <td>{person.maas ? parseFloat(person.maas).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}</td>
                                        <td>{new Date(person.ise_baslama_tarihi).toLocaleDateString('tr-TR')}</td>
                                        <td>{person.dogum_tarihi ? new Date(person.dogum_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                                        <td className="address-cell">{person.adres || '-'}</td>
                                        <td className="actions-cell">
                                            <div className="action-buttons">
                                                <button className="edit-btn" onClick={() => handleEdit(person)}>Düzenle</button>
                                                <button className="delete-btn" onClick={() => handleDelete(person.id)}>Sil</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PersonnelPage; // ===> HATA BURADAYDI, EKLENDİ <===