const bcrypt = require('bcryptjs');

const plain = process.argv[2]; // 從指令列拿密碼
if (!plain) {
  console.log('Usage: node hash.js <password>');
  process.exit(1);
}

bcrypt.hash(plain, 10).then((h) => {
  console.log('Hash:', h);
  process.exit(0);
});
