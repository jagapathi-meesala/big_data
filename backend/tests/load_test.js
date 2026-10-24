const http = require('http');

console.log("=== Starting API Load Test Simulation ===");
const targetOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const sendRequest = (index) => {
  return new Promise((resolve) => {
    const req = http.request(targetOptions, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        console.log(`[Request #${index}] Status Code: ${res.statusCode}`);
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`[Request #${index}] Error: ${e.message}`);
      resolve();
    });
    
    req.write(JSON.stringify({ email: "test@aid-dras.gov", password: "password" }));
    req.end();
  });
};

const runSuite = async () => {
  const promises = [];
  for (let i = 1; i <= 20; i++) {
    promises.push(sendRequest(i));
  }
  await Promise.all(promises);
  console.log("=== Load Test Simulation Completed ===");
};

runSuite();
