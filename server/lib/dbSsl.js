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

  
  return { rejectUnauthorized: false };
}

module.exports = { getDbSslConfig };
