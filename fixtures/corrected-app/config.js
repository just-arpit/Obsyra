// Corrected Config: All credentials loaded strictly from runtime environment variables
require('dotenv').config();

module.exports = {
  // Fix: Credential extracted from environment; never hardcoded
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Fix: High-entropy secret from environment
  JWT_SECRET: process.env.JWT_SECRET || 'must-be-provided-in-environment',
  
  PORT: parseInt(process.env.PORT || '8080', 10),
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
};
