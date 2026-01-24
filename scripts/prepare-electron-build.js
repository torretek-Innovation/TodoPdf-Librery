const fs = require('fs');
const path = require('path');

// This script prepares the standalone build for Electron packaging
console.log('📦 Preparing Electron Build...');

const distDir = path.join(__dirname, '../electron-dist');
const standaloneDir = path.join(__dirname, '../.next/standalone');
const staticSource = path.join(__dirname, '../.next/static');
const publicSource = path.join(__dirname, '../public');

// 1. Clean and create dist directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Helper to copy recursive
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        const src = path.join(from, element);
        const dest = path.join(to, element);
        const stats = fs.lstatSync(src);

        if (stats.isFile()) {
            fs.copyFileSync(src, dest);
        } else if (stats.isDirectory()) {
            copyFolderSync(src, dest);
        } else if (stats.isSymbolicLink()) {
            // Handle symlinks by copying the target or skipping? 
            // Next.js standalone often uses symlinks for node_modules in pnpm, 
            // but here it seems to be standard copy. We'll disable symlink copy to be safe 
            // and just copy content if possible, or skip.
            // For now, let's treat as directory if it connects to one, or just ignore.
            // Better: fs.cpSync in Node 16+ handles this.
        }
    });
}

// Node 16.7.0+ has fs.cpSync which is much better
const copyRecursive = (src, dest) => {
    try {
        fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
    } catch (err) {
        // Fallback for older node if needed, but we are likely on modern node
        copyFolderSync(src, dest);
    }
}

// 3. Copy Standalone build
if (!fs.existsSync(standaloneDir)) {
    console.error('❌ .next/standalone folder not found. Did you run "npm run build"?');
    process.exit(1);
}
console.log('📂 Copying standalone build...');
copyRecursive(standaloneDir, distDir);

// Verify node_modules/next exists
const nextModule = path.join(distDir, 'node_modules', 'next');
if (!fs.existsSync(nextModule)) {
    console.warn('⚠️ WARNING: node_modules/next not found in standalone build. Application may fail to start.');
    // Try to copy from root node_modules if missing (fallback)
    const rootNext = path.join(__dirname, '../node_modules/next');
    if (fs.existsSync(rootNext)) {
        console.log('   Attempting to copy next from root node_modules...');
        copyRecursive(rootNext, nextModule);
    }
}

// 4. Copy .next/static -> electron-dist/.next/static
const staticDest = path.join(distDir, '.next/static');
console.log('📂 Copying static assets...');
if (fs.existsSync(staticSource)) {
    copyRecursive(staticSource, staticDest);
} else {
    console.warn('⚠️ No .next/static folder found.');
}

// 5. Copy public -> electron-dist/public
const publicDest = path.join(distDir, 'public');
console.log('📂 Copying public folder...');
if (fs.existsSync(publicSource)) {
    copyRecursive(publicSource, publicDest);
}

// 6. Ensure Prisma Client is present (often a pain point)
// Check if .prisma/client is in dest
const prismaClientDest = path.join(distDir, 'node_modules/.prisma/client');
if (!fs.existsSync(prismaClientDest)) {
    console.log('📂 Ensuring Prisma Client is copied...');
    const prismaClientSrc = path.join(__dirname, '../node_modules/.prisma/client');
    if (fs.existsSync(prismaClientSrc)) {
        copyRecursive(prismaClientSrc, prismaClientDest);
    }
}

console.log('✅ Build preparation complete. Ready for electron-builder.');
