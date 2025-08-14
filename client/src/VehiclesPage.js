import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './VehiclesPage.css';

function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [filter, setFilter] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialFormData = {
    brand: '', model: '', year: '', color: '', gear: '', fuel: '',
    mileage: '', purchase_price: '', sale_price: '', description: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  const token = localStorage.getItem('token');
  const authHeaders = { 
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } 
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      console.log("🔄 Araçlar yükleniyor...");
      
      const response = await axios.get('http://localhost:5000/api/vehicles');
      console.log("✅ Araçlar yüklendi:", response.data);
      setVehicles(response.data || []);
    } catch (error) { 
      console.error("❌ Araçlar çekilirken hata oluştu:", error);
      setError('Araçlar yüklenirken bir hata oluştu.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchVehicles(); 
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    console.log(`Form alanı güncellendi: ${name} = ${value}`);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(files);
    console.log(`${files.length} fotoğraf seçildi:`, files.map(f => f.name));
  };

  const cancelEdit = () => {
    console.log("✖️ Düzenleme iptal edildi");
    setIsEditing(false);
    setCurrentVehicle(null);
    setFormData(initialFormData);
    setPhotoFiles([]);
    setError('');
  };

  const handleEdit = async (vehicle) => {
    try {
      setLoading(true);
      console.log(`📝 Araç düzenleme başlatıldı: ID ${vehicle.id}`);
      
      const response = await axios.get(`http://localhost:5000/api/vehicles/${vehicle.id}`);
      console.log("✅ Araç detayları alındı:", response.data);
      
      setIsEditing(true);
      setCurrentVehicle(response.data);
      setFormData({
        brand: response.data.brand || '',
        model: response.data.model || '',
        year: response.data.year || '',
        color: response.data.color || '',
        gear: response.data.gear || '',
        fuel: response.data.fuel || '',
        mileage: response.data.mileage || '',
        purchase_price: response.data.purchase_price || '',
        sale_price: response.data.sale_price || '',
        description: response.data.description || ''
      });
      setPhotoFiles([]);
      setError('');
      window.scrollTo(0, 0);
    } catch (error) { 
      console.error("❌ Araç detayları alınırken hata:", error);
      alert("Araç detayları çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeletePhoto = async (photoId) => {
    if (window.confirm("Bu fotoğrafı kalıcı olarak silmek istediğinizden emin misiniz?")) {
      try {
        setLoading(true);
        console.log(`🗑️ Fotoğraf siliniyor: ID ${photoId}`);
        
        await axios.delete(`http://localhost:5000/api/photos/${photoId}`, authHeaders);
        console.log("✅ Fotoğraf silindi");
        
        alert("Fotoğraf silindi.");
        setCurrentVehicle(prev => ({ 
          ...prev, 
          photos: prev.photos.filter(p => p.id !== photoId) 
        }));
      } catch (error) { 
        console.error("❌ Fotoğraf silme hatası:", error);
        alert("Fotoğraf silinirken bir hata oluştu."); 
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu aracı ve TÜM fotoğraflarını silmek istediğinizden emin misiniz?")) {
      try {
        setLoading(true);
        console.log(`🗑️ Araç siliniyor: ID ${id}`);
        
        await axios.delete(`http://localhost:5000/api/vehicles/${id}`, authHeaders);
        console.log("✅ Araç silindi");
        
        alert("Araç başarıyla silindi.");
        fetchVehicles();
        
        // Eğer düzenlenen araç silinirse formu temizle
        if (isEditing && currentVehicle && currentVehicle.id === id) {
          cancelEdit();
        }
      } catch (error) { 
        console.error("❌ Araç silme hatası:", error);
        alert("Araç silinirken bir hata oluştu."); 
      } finally {
        setLoading(false);
      }
    }
  };

  const validateForm = () => {
    const requiredFields = ['brand', 'model', 'year'];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        setError(`${field === 'brand' ? 'Marka' : field === 'model' ? 'Model' : 'Yıl'} alanı zorunludur.`);
        return false;
      }
    }
    
    if (formData.year && (formData.year < 1900 || formData.year > new Date().getFullYear() + 1)) {
      setError('Geçerli bir yıl giriniz.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      if (isEditing) {
        console.log(`🔄 Araç güncelleniyor: ID ${currentVehicle.id}`, formData);
        
        // Araç bilgilerini güncelle
        await axios.put(
          `http://localhost:5000/api/vehicles/${currentVehicle.id}`, 
          formData, 
          authHeaders
        );
        console.log("✅ Araç bilgileri güncellendi");
        
        // Yeni fotoğraf varsa ekle
        if (photoFiles.length > 0) {
          console.log(`📷 ${photoFiles.length} yeni fotoğraf ekleniyor...`);
          const photoData = new FormData();
          photoFiles.forEach(file => { 
            photoData.append('photos', file); 
          });
          
          const photoConfig = { 
            headers: { 
              'Content-Type': 'multipart/form-data', 
              'Authorization': `Bearer ${token}` 
            } 
          };
          
          await axios.post(
            `http://localhost:5000/api/vehicles/${currentVehicle.id}/add-photos`, 
            photoData, 
            photoConfig
          );
          console.log("✅ Yeni fotoğraflar eklendi");
        }
        
        alert('Araç başarıyla güncellendi!');
      } else {
        console.log("🚗 Yeni araç ekleniyor:", formData);
        console.log("📷 Fotoğraf sayısı:", photoFiles.length);
        
        const vehicleData = new FormData();
        
        // Form verilerini ekle
        Object.keys(formData).forEach(key => {
          if (formData[key] !== '') {
            vehicleData.append(key, formData[key]);
          }
        });
        
        // Fotoğrafları ekle
        photoFiles.forEach(file => { 
          vehicleData.append('photos', file); 
        });
        
        // FormData içeriğini kontrol et
        console.log("📝 Form verisi hazırlandı:");
        for (let [key, value] of vehicleData.entries()) {
          console.log(`${key}:`, value);
        }
        
        const config = { 
          headers: { 
            'Content-Type': 'multipart/form-data', 
            'Authorization': `Bearer ${token}` 
          } 
        };
        
        const response = await axios.post('http://localhost:5000/api/vehicles', vehicleData, config);
        console.log("✅ Araç eklendi:", response.data);
        alert('Araç başarıyla eklendi!');
      }
      
      cancelEdit();
      fetchVehicles();
    } catch (error) {
      console.error("❌ İşlem hatası:", error);
      
      if (error.response) {
        console.error("Sunucu hatası:", error.response.data);
        setError(error.response.data.message || 'İşlem sırasında bir hata oluştu.');
      } else if (error.request) {
        console.error("Ağ hatası:", error.request);
        setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        console.error("Diğer hata:", error.message);
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    const searchTerm = filter.toLowerCase();
    if (!searchTerm) return vehicles;
    
    return vehicles.filter(v => 
      Object.values(v).some(val => 
        val != null && String(val).toLowerCase().includes(searchTerm)
      )
    );
  }, [vehicles, filter]);

  const formatPrice = (price) => {
    if (!price || price === 0) return '0 ₺';
    return parseFloat(price).toLocaleString('tr-TR', { 
      style: 'currency', 
      currency: 'TRY' 
    });
  };

  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    return parseInt(num).toLocaleString('tr-TR');
  };

  return (
    <div className="vehicle-page-wrapper">
      <div className="vehicle-page">
        {error && (
          <div className="error-message" style={{ 
            background: '#fee', 
            border: '1px solid #fcc', 
            color: '#c33', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px' 
          }}>
            ❌ {error}
          </div>
        )}
        
        <div className="form-container">
          <h2 className="page-title">
            {isEditing ? 'Aracı Düzenle' : 'Yeni Araç Kayıt'}
            {loading && <span style={{ marginLeft: '10px' }}>⏳</span>}
          </h2>
          
          <form className="vehicle-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <input 
                type="text" 
                name="brand" 
                placeholder="Marka *" 
                value={formData.brand} 
                onChange={handleInputChange} 
                required 
                disabled={loading}
              />
              <input 
                type="text" 
                name="model" 
                placeholder="Model *" 
                value={formData.model} 
                onChange={handleInputChange} 
                required 
                disabled={loading}
              />
              <input 
                type="number" 
                name="year" 
                placeholder="Yıl *" 
                value={formData.year} 
                onChange={handleInputChange} 
                min="1900"
                max={new Date().getFullYear() + 1}
                required 
                disabled={loading}
              />
            </div>
            
            <div className="form-row">
              <input 
                type="text" 
                name="color" 
                placeholder="Renk" 
                value={formData.color} 
                onChange={handleInputChange} 
                disabled={loading}
              />
              <input 
                type="text" 
                name="gear" 
                placeholder="Vites" 
                value={formData.gear} 
                onChange={handleInputChange} 
                disabled={loading}
              />
              <input 
                type="text" 
                name="fuel" 
                placeholder="Yakıt" 
                value={formData.fuel} 
                onChange={handleInputChange} 
                disabled={loading}
              />
            </div>
            
            <div className="form-row">
              <input 
                type="number" 
                name="mileage" 
                placeholder="Kilometre" 
                value={formData.mileage} 
                onChange={handleInputChange} 
                min="0"
                disabled={loading}
              />
              <input 
                type="number" 
                name="purchase_price" 
                placeholder="Alış Fiyatı" 
                value={formData.purchase_price} 
                onChange={handleInputChange} 
                min="0"
                step="0.01"
                disabled={loading}
              />
              <input 
                type="number" 
                name="sale_price" 
                placeholder="Satış Fiyatı" 
                value={formData.sale_price} 
                onChange={handleInputChange} 
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>
            
            <div className="form-row">
              <textarea 
                name="description" 
                placeholder="Açıklama" 
                value={formData.description} 
                onChange={handleInputChange}
                rows="3"
                disabled={loading}
              ></textarea>
            </div>
            
            <div className="form-row">
              <div>
                <label htmlFor="photo-upload" className="photo-upload-label">
                  {isEditing ? 'Yeni Fotoğraflar Ekle' : 'Araç Fotoğrafları (En fazla 10 adet)'}
                </label>
                <input 
                  id="photo-upload" 
                  type="file" 
                  name="photos" 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*" 
                  disabled={loading}
                />
                {photoFiles.length > 0 && (
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    📷 {photoFiles.length} fotoğraf seçildi
                  </small>
                )}
              </div>
            </div>

            {isEditing && currentVehicle?.photos?.length > 0 && (
              <div className="photo-management-container">
                <h3>Mevcut Fotoğraflar ({currentVehicle.photos.length})</h3>
                <div className="photo-grid">
                  {currentVehicle.photos.map(photo => (
                    <div key={photo.id} className="photo-item">
                      <img 
                        src={`http://localhost:5000/${photo.photo_url}`} 
                        alt="Araç"
                        onError={(e) => {
                          console.error(`Fotoğraf yüklenemedi: ${photo.photo_url}`);
                          e.target.src = '/placeholder-car.png'; // Fallback image
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => handleDeletePhoto(photo.id)} 
                        className="delete-photo-btn"
                        disabled={loading}
                        title="Fotoğrafı Sil"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="form-buttons-container">
              <button 
                type="submit" 
                className="add-vehicle-btn"
                disabled={loading}
              >
                {loading ? '⏳ İşleniyor...' : (isEditing ? 'Değişiklikleri Kaydet' : 'Aracı Ekle')}
              </button>
              
              {isEditing && (
                <button 
                  type="button" 
                  className="add-vehicle-btn cancel-edit-btn" 
                  onClick={cancelEdit}
                  disabled={loading}
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="table-card">
          <h2>Kayıtlı Araçlar ({vehicles.length})</h2>
          
          <div className="filter-container">
            <input 
              type="text" 
              placeholder="Araç listesinde ara..." 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              disabled={loading}
            />
            <small style={{ color: '#666', marginLeft: '10px' }}>
              {filteredVehicles.length !== vehicles.length && 
                `${filteredVehicles.length}/${vehicles.length} araç gösteriliyor`
              }
            </small>
          </div>
          
          {loading && vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              ⏳ Araçlar yükleniyor...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              {filter ? 'Arama kriterlerine uygun araç bulunamadı.' : 'Henüz araç eklenmemiş.'}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fotoğraf</th>
                    <th>Marka</th>
                    <th>Model</th>
                    <th>Yıl</th>
                    <th>Renk</th>
                    <th>Yakıt</th>
                    <th>KM</th>
                    <th>Alış Fiyatı</th>
                    <th>Satış Fiyatı</th>
                    <th>Açıklama</th>
                    <th className="sticky-col">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="photo-cell">
                        {vehicle.photo_url ? (
                          <img 
                            src={`http://localhost:5000/${vehicle.photo_url}`}
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            className="vehicle-thumbnail"
                            style={{ 
                              width: '50px', 
                              height: '40px', 
                              objectFit: 'cover', 
                              borderRadius: '4px' 
                            }}
                            onError={(e) => {
                              console.error(`Araç fotoğrafı yüklenemedi: ${vehicle.photo_url}`);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ 
                            width: '50px', 
                            height: '40px', 
                            backgroundColor: '#f0f0f0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#999'
                          }}>
                            📷
                          </div>
                        )}
                      </td>
                      <td>{vehicle.brand || '-'}</td>
                      <td>{vehicle.model || '-'}</td>
                      <td>{vehicle.year || '-'}</td>
                      <td>{vehicle.color || '-'}</td>
                      <td>{vehicle.fuel || '-'}</td>
                      <td>{formatNumber(vehicle.mileage)}</td>
                      <td className="price-cell">{formatPrice(vehicle.purchase_price)}</td>
                      <td className="price-cell">{formatPrice(vehicle.sale_price)}</td>
                      <td className="description-cell" title={vehicle.description}>
                        {vehicle.description ? 
                          (vehicle.description.length > 50 ? 
                            vehicle.description.substring(0, 50) + '...' : 
                            vehicle.description
                          ) : '-'
                        }
                      </td>
                      <td className="sticky-col">
                        <div className="action-buttons">
                          <button 
                            className="edit-btn" 
                            onClick={() => handleEdit(vehicle)}
                            disabled={loading}
                            title="Aracı Düzenle"
                          >
                            ✏️ Düzenle
                          </button>
                          <button 
                            className="delete-btn" 
                            onClick={() => handleDelete(vehicle.id)}
                            disabled={loading}
                            title="Aracı Sil"
                          >
                            🗑️ Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehiclesPage;