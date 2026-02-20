const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Preparing Electron Build...');

const rootDir = path.resolve(__dirname, '../');
const distDir = path.join(rootDir, 'electron-dist');
const standaloneDir = path.join(rootDir, '.next/standalone');
const staticSource = path.join(rootDir, '.next/static');
const publicSource = path.join(rootDir, 'public');

// --- 0. Generate Template Database (Robustly) ---
console.log('🗄️  Generating Template Database...');
try {
    const templateDbPath = path.join(rootDir, 'prisma', 'template.db');

    // Ensure we start fresh
    if (fs.existsSync(templateDbPath)) {
        try { fs.unlinkSync(templateDbPath); } catch (e) {
            console.warn(`Duplicate template.db removal failed: ${e.message}`);
        }
    }

    // Also check for nested one which happens with relative paths in prisma
    const nestedDbPath = path.join(rootDir, 'prisma', 'prisma', 'template.db');
    if (fs.existsSync(nestedDbPath)) {
        try { fs.unlinkSync(nestedDbPath); } catch (e) { }
    }

    // Prisma SQLite requires "file:" prefix (NOT "file:///")
    const dbUrl = `file:${templateDbPath.replace(/\\/g, '/')}`;

    console.log(`   Target DB Path: ${templateDbPath}`);
    console.log(`   Database URL: ${dbUrl}`);
    console.log('   Running prisma db push (creates DB from schema)...');

    // Use db push instead of migrate deploy to create the DB directly from schema
    // This ensures ALL columns from schema.prisma are present, regardless of migration state
    execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
        cwd: rootDir,
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'inherit'
    });

    // Verification
    if (fs.existsSync(templateDbPath)) {
        const stats = fs.statSync(templateDbPath);
        console.log(`✅ Template database generated successfully (${stats.size} bytes).`);
    } else {
        // Fallback check
        if (fs.existsSync(nestedDbPath)) {
            console.log('⚠️ Database generated in nested folder, moving it...');
            fs.renameSync(nestedDbPath, templateDbPath);
            console.log('✅ Database moved to correct location.');
        } else {
            throw new Error(`Database not found at ${templateDbPath}`);
        }
    }
} catch (error) {
    console.error('❌ Failed to generate template database:', error);
    process.exit(1);
}

// --- 1. Clean Dist Directory (Robustly) ---
console.log('🧹 Cleaning dist directory...');
if (fs.existsSync(distDir)) {
    let attempts = 0;
    let cleaned = false;
    while (attempts < 5 && !cleaned) {
        try {
            // Using robust rmSync options
            fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
            cleaned = true;
        } catch (e) {
            attempts++;
            console.log(`   ⏳ Clean failed (Attempt ${attempts}/5): ${e.message}`);
            // Synchronous wait
            const start = Date.now();
            while (Date.now() - start < 1000) { }
        }
    }
    if (!cleaned) {
        console.error('❌ Could not clean electron-dist. Please close open files/apps and try again.');
        process.exit(1);
    }
}
fs.mkdirSync(distDir, { recursive: true });

// --- Helper for copying ---
const copyRecursive = (src, dest) => {
    try {
        fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
    } catch (err) {
        // Fallback for older nodes (though rarely needed now)
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(element => {
            const srcPath = path.join(src, element);
            const destPath = path.join(dest, element);
            const stats = fs.statSync(srcPath);
            if (stats.isDirectory()) {
                copyRecursive(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        });
    }
}

// --- 2. Copy Standalone Build ---
if (!fs.existsSync(standaloneDir)) {
    console.error('❌ .next/standalone folder not found. Did you run "npm run build"?');
    process.exit(1);
}
console.log('📂 Copying standalone build...');
copyRecursive(standaloneDir, distDir);

// --- 3. Fix Missing Next.js Module ---
const nextModule = path.join(distDir, 'node_modules', 'next');
if (!fs.existsSync(nextModule)) {
    console.warn('⚠️ node_modules/next missing in standalone. Copying from root...');
    const rootNext = path.join(rootDir, 'node_modules', 'next');
    if (fs.existsSync(rootNext)) {
        copyRecursive(rootNext, nextModule);
    }
}

// --- 4. Copy Static Assets ---
const staticDest = path.join(distDir, '.next/static');
console.log('📂 Copying static assets...');
if (fs.existsSync(staticSource)) {
    copyRecursive(staticSource, staticDest);
} else {
    console.warn('⚠️ No .next/static folder found.');
}

// --- 5. Copy Public Folder ---
const publicDest = path.join(distDir, 'public');
console.log('📂 Copying public folder...');
if (fs.existsSync(publicSource)) {
    copyRecursive(publicSource, publicDest);
}

// --- 6. Connect Prisma Client (Critical for SQLite) ---
const prismaClientDest = path.join(distDir, 'node_modules/.prisma/client');
if (!fs.existsSync(prismaClientDest)) {
    console.log('📂 Ensuring Prisma Client is copied...');
    const prismaClientSrc = path.join(rootDir, 'node_modules/.prisma/client');
    if (fs.existsSync(prismaClientSrc)) {
        copyRecursive(prismaClientSrc, prismaClientDest);
    }
}

console.log('✅ Build preparation complete.');
