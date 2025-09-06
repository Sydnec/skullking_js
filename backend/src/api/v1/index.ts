import express from 'express';
import fs from 'fs';
import path from 'path';

const v1 = express.Router();
const routesDir = path.join(__dirname);

fs.readdirSync(routesDir, { withFileTypes: true }).forEach((dirent) => {
    if (dirent.isDirectory()) {
        const routeFile = path.join(routesDir, dirent.name, `${dirent.name}.routes.ts`);
        if (fs.existsSync(routeFile)) {
            import(routeFile).then((module) => {
                v1.use(`/${dirent.name}`, module.default);
            });
        }
    }
});

export default v1;
