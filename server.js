const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

app.use('/v01/emulator', express.static(__dirname));

app.get('/', (req, res) => {
  res.redirect('/v01/emulator/');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/v01/emulator/`);
});