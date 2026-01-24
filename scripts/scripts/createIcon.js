const fs = require('fs');
const path = require('path');

// Create a simple 128x128 PNG icon
// This is a minimal PNG with a basic design

const iconPath = path.join(__dirname, '..', 'media', 'icon.png');

// Check if Sharp or Jimp is available
let created = false;

// Try with sharp
try {
    const sharp = require('sharp');

    // Create SVG buffer
    const svgBuffer = Buffer.from(`
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="64" r="60" fill="#0B1A2C" stroke="#4B9EFF" stroke-width="4"/>
      <path d="M 64 28 L 84 68 L 64 60 L 44 68 Z" fill="#4B9EFF"/>
      <circle cx="64" cy="76" r="12" fill="#00D8FF"/>
    </svg>
  `);

    sharp(svgBuffer)
        .resize(128, 128)
        .png()
        .toFile(iconPath)
        .then(() => {
            console.log('✅ Icon created successfully with Sharp:', iconPath);
            created = true;
        })
        .catch(err => {
            console.error('Sharp error:', err.message);
        });

} catch (e) {
    // Sharp not available, try jimp
    try {
        const Jimp = require('jimp');

        new Jimp(128, 128, 0x0B1A2CFF, (err, image) => {
            if (err) throw err;

            // Draw a simple icon using Jimp
            // Background circle (dark blue)
            for (let y = 0; y < 128; y++) {
                for (let x = 0; x < 128; x++) {
                    const dx = x - 64;
                    const dy = y - 64;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= 60 && dist >= 56) {
                        // Blue border
                        image.setPixelColor(0x4B9EFFFF, x, y);
                    } else if (dist <= 60) {
                        // Dark background
                        image.setPixelColor(0x0B1A2CFF, x, y);
                    } else {
                        // Transparent
                        image.setPixelColor(0x00000000, x, y);
                    }

                    // Top triangle (approximate)
                    if (y >= 28 && y <= 68) {
                        const centerDist = Math.abs(x - 64);
                        const yOffset = y - 28;
                        if (centerDist < (40 - yOffset * 0.5)) {
                            image.setPixelColor(0x4B9EFFFF, x, y);
                        }
                    }

                    // Bottom circle
                    const bottomDx = x - 64;
                    const bottomDy = y - 76;
                    const bottomDist = Math.sqrt(bottomDx * bottomDx + bottomDy * bottomDy);
                    if (bottomDist <= 12) {
                        image.setPixelColor(0x00D8FFFF, x, y);
                    }
                }
            }

            image.write(iconPath, () => {
                console.log('✅ Icon created successfully with Jimp:', iconPath);
                created = true;
            });
        });

    } catch (e2) {
        // Neither library available - create a minimal valid PNG
        console.log('⚠️ No image library available (sharp or jimp)');
        console.log('Creating minimal placeholder PNG...');

        // Minimal valid 1x1 transparent PNG (89 bytes)
        const minimalPNG = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);

        fs.writeFileSync(iconPath, minimalPNG);
        console.log('📝 Created placeholder icon (1x1 transparent PNG)');
        console.log('💡 To create a proper 128x128 icon, install:');
        console.log('   npm install sharp');
        console.log('   OR');
        console.log('   npm install jimp');
        console.log('   Then run this script again.');
        created = true;
    }
}

// Set timeout to check if creation was successful
setTimeout(() => {
    if (!created) {
        console.log('\n⏳ Icon generation in progress...');
        console.log('   If this takes too long, check the output above for errors.');
    }
}, 100);
