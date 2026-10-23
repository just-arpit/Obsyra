const express = require('express');
const config = require('./config');

const app = express();
app.use(express.json());

// Vulnerability 1: Overly permissive CORS wildcard
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Vulnerability 2: Remote Code Execution via eval()
app.get('/api/calculate', (req, res) => {
  const expression = req.query.expression || '1+1';
  // DANGEROUS: Evaluating untrusted user input directly
  const result = eval(req.query.expression);
  res.json({ result });
});

// Vulnerability 3: Sensitive admin deletion route exposed without authorization middleware
app.post('/api/admin/users/delete', async (req, res) => {
  const { userId } = req.body;
  // Flaw: No auth guard or role verification
  res.json({ success: true, message: `User ${userId} deleted by administrator` });
});

// Vulnerability 4: Insecure cookie without HttpOnly or Secure flag
app.post('/api/login', (req, res) => {
  const sessionToken = "session_" + Math.random().toString(36);
  res.cookie('auth_session', sessionToken, { httpOnly: false, secure: false });
  res.json({ success: true, token: sessionToken });
});

app.listen(config.PORT, () => {
  console.log(`Vulnerable demo running on port ${config.PORT}`);
});
