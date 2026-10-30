// npm run qr -- https://spark.your-tailnet.ts.net — print a QR code for the URL in the terminal.
import QRCode from 'qrcode';

const url = process.argv[2];
if (!url) { console.error('Usage: npm run qr -- <url>'); process.exit(1); }
console.log(await QRCode.toString(url, { type: 'terminal', small: true }));
console.log(url);
