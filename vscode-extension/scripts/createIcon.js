const fs = require('fs');
const path = require('path');

// Create a simple 128x128 PNG icon programmatically
// This creates a basic icon with the Copilot Orchestrator theme colors

// Note: If canvas module is not available, we'll create a placeholder
try {
    const { createCanvas } = require('canvas');

    const canvas = createCanvas(128, 128);
    const ctx = canvas.getContext('2d');

    // Background circle
    ctx.fillStyle = '#0B1A2C';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    // Border circle
    ctx.strokeStyle = '#4B9EFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Top triangle (agent)
    ctx.fillStyle = '#4B9EFF';
    ctx.beginPath();
    ctx.moveTo(64, 28);
    ctx.lineTo(84, 68);
    ctx.lineTo(64, 60);
    ctx.lineTo(44, 68);
    ctx.closePath();
    ctx.fill();

    // Bottom circle (hub)
    ctx.fillStyle = '#00D8FF';
    ctx.beginPath();
    ctx.arc(64, 76, 12, 0, Math.PI * 2);
    ctx.fill();

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    const iconPath = path.join(__dirname, '..', 'media', 'icon.png');
    fs.writeFileSync(iconPath, buffer);
    console.log('✅ Icon created successfully:', iconPath);
} catch (err) {
    console.log('⚠️ Canvas module not available, creating placeholder README');
    console.log('Error:', err.message);

    const readmePath = path.join(__dirname, '..', 'media', 'ICON-README.txt');
    const content = `Icon Placeholder
================

The extension icon should be a 128x128 PNG file with:
- Dark background circle (#0B1A2C)
- Blue border (#4B9EFF)
- Top triangle representing agent orchestration
- Bottom circle representing the central hub (#00D8FF)

To create manually:
1. Use any image editor (GIMP, Photoshop, etc.)
2. Create 128x128 canvas
3. Apply the design from copilot.svg
4. Export as icon.png
5. Place in media/ directory
`;
    fs.writeFileSync(readmePath, content);
    console.log('📝 Created icon README:', readmePath);
}
