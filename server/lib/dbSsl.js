/**
 * MySQL SSL (Aiven / bulut). DB_SSL=true iken kullanilir.
 * DB_SSL_CA: Aiven CA sertifikasi (PEM, tek satirda \n ile de olabilir)
 * DB_SSL_REJECT_UNAUTHORIZED=false: zorla (varsayilan bulutta false)
 */
function getDbSslConfig() {
  if (process.env.DB_SSL !== 'true') {
    return false;
  }

  const caRaw = process.env.DB_SSL_CA;
  if (caRaw && String(caRaw).trim()) {
    const ca = String(caRaw).includes('\\n')
      ? String(caRaw).replace(/\\n/g, '\n')
      : String(caRaw);
    return { ca, rejectUnauthorized: true };
  }

  const strict = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  if (strict === 'true') {
    return { rejectUnauthorized: true };
  }

  // Aiven + Render: CA dosyasi yoksa "self-signed certificate in chain" onlenir
  return { rejectUnauthorized: false };
}

module.exports = { getDbSslConfig };
