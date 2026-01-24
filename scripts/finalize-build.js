const fs = require('fs');
const path = require('path');

module.exports = async function (context) {
    // context.appOutDir is the directory where the app is unpacked
    // e.g. .../release/win-unpacked
    const unpackedDir = context.appOutDir;
    const standaloneDir = path.join(unpackedDir, 'resources', 'standalone');
    const sourceNodeModules = path.join(__dirname, '../electron-dist/node_modules');

    console.log(`\n🔧 [afterPack] Finalizing build in ${unpackedDir}...`);

    if (!fs.existsSync(standaloneDir)) {
        console.warn('⚠️ Warning: resources/standalone not found. Skipping node_modules copy.');
        return;
    }

    const targetNodeModules = path.join(standaloneDir, 'node_modules');

    // Helper to copy folder recursive
    function copyFolderSync(from, to) {
        if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

        try {
            const items = fs.readdirSync(from);
            items.forEach(element => {
                const src = path.join(from, element);
                const dest = path.join(to, element);

                // Check if source exists (symlinks might be broken, etc)
                if (!fs.existsSync(src)) return;

                const stats = fs.lstatSync(src);

                if (stats.isFile()) {
                    fs.copyFileSync(src, dest);
                } else if (stats.isDirectory()) {
                    copyFolderSync(src, dest);
                }
            });
        } catch (e) {
            console.warn(`Warning: Failed to copy ${from}: ${e.message}`);
        }
    }

    if (fs.existsSync(sourceNodeModules)) {
        console.log(`   📂 Copying node_modules from ${sourceNodeModules} to ${targetNodeModules}...`);
        try {
            // Try modern cpSync
            fs.cpSync(sourceNodeModules, targetNodeModules, { recursive: true, force: true, dereference: true });
        } catch (e) {
            console.log('      Using legacy copy fallback...');
            copyFolderSync(sourceNodeModules, targetNodeModules);
        }
        console.log('   ✅ node_modules copied successfully!');
    } else {
        console.error('   ❌ Source node_modules not found in electron-dist!');
        throw new Error('Missing electron-dist/node_modules');
    }
};
