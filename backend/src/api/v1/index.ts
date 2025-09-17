import express from 'express';
import fs from 'fs';
import path from 'path';

const v1 = express.Router();
const routesDir = path.join(__dirname);

fs.readdirSync(routesDir, { withFileTypes: true }).forEach((dirent) => {
    if (dirent.isDirectory()) {
        // support both TS source (during development) and JS emitted files (in dist when built)
        const tsRouteFile = path.join(routesDir, dirent.name, `${dirent.name}.routes.ts`);
        const jsRouteFile = path.join(routesDir, dirent.name, `${dirent.name}.routes.js`);
        const routeFile = fs.existsSync(jsRouteFile) ? jsRouteFile : (fs.existsSync(tsRouteFile) ? tsRouteFile : null);
        if (routeFile) {
            import(routeFile).then((module) => {
                v1.use(`/${dirent.name}`, module.default);
            }).catch((err) => {
                console.error(`Failed to import routes for /v1/${dirent.name} from ${routeFile}:`, err);
            });
        } else {
            console.warn(`No route file found for /v1/${dirent.name} (looked for ${tsRouteFile} and ${jsRouteFile})`);
        }
    }
});

export default v1;
