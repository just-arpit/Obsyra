// WARNING: Synthetic test fixture containing deliberate dummy credentials for testing scanners
module.exports = {
  // Vulnerability: Hardcoded synthetic Gemini API Key (exact standard length)
  GEMINI_API_KEY: "AIzaSyD9876543210abcdefghijklmnopq",
  
  // Vulnerability: Hardcoded synthetic AWS credentials
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  
  // Vulnerability: Hardcoded JWT signing secret
  JWT_SECRET: "weak_jwt_dev_secret_123",
  
  PORT: 8080,
};
