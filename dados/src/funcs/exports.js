import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// createRequire is only used for JSON or true CJS modules
const require = createRequire(import.meta.url);

/**
 * Carrega e faz o parse de um arquivo JSON de forma síncrona.
 * @param {string} filePath - O caminho relativo para o arquivo JSON.
 * @returns {any | undefined} O objeto JSON ou undefined se falhar.
 */
function loadJsonSync(filePath) {
    try {
        const fullPath = path.resolve(__dirname, filePath);
        if (!fs.existsSync(fullPath)) {
            console.warn(`[AVISO] Arquivo JSON não encontrado: ${filePath}`);
            return {};
        }
        const data = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[ERRO] Falha ao carregar o arquivo JSON: ${filePath}. Erro: ${error.message}`);
        return {};
    }
}

/**
 * Inicializa e retorna o objeto de módulos agregados.
 */
let modulesPromise;

async function loadModules() {
    if (modulesPromise) return modulesPromise;

    modulesPromise = (async () => {
        const modules = {};

        // --- downloads ---
        try {
            const lyricsMod = await import('./utils/lyrics.js');
            modules.Lyrics = lyricsMod.default ?? lyricsMod;
        } catch (e) {
            console.warn('[EXPORTS] Falha ao carregar Lyrics, usando stub');
            modules.Lyrics = { search: () => { throw new Error('Lyrics não disponível'); } };
        }

        // --- utils ---
        const utilModules = [
            { name: 'styleText', path: './utils/gerarnick.js' },
            { name: 'VerifyUpdate', path: './utils/update-verify.js' },
            { name: 'emojiMix', path: './utils/emojimix.js' },
            { name: 'upload', path: './utils/upload.js' },
            { name: 'tictactoe', path: './utils/tictactoe.js' },
            { name: 'stickerModule', path: './utils/sticker.js' },
            { name: 'commandStats', path: './utils/commandStats.js' },
            { name: 'relationshipManager', path: './utils/relationships.js' },
        ];

        for (const mod of utilModules) {
            try {
                const loaded = await import(mod.path);
                modules[mod.name] = loaded.default ?? loaded;
            } catch (e) {
                console.warn(`[EXPORTS] Falha ao carregar ${mod.name}, usando stub`);
                modules[mod.name] = {};
            }
        }

        // Stub para sendSticker se necessário
        if (modules.stickerModule && modules.stickerModule.sendSticker) {
            modules.sendSticker = modules.stickerModule.sendSticker;
        } else {
            modules.sendSticker = () => { throw new Error('sendSticker não disponível'); };
        }

        // --- private ---
        try {
            const iaMod = await import('./private/ia.js');
            const loadedIA = iaMod.default ?? iaMod;
            modules.ia = {
                makeAssistentRequest: loadedIA.makeAssistentRequest || loadedIA.processUserMessages || (() => { throw new Error('IA request não disponível'); }),
                makeCognimaRequest: loadedIA.makeCognimaRequest || (() => { throw new Error('Cognima request não disponível'); }),
                notifyOwnerAboutApiKey: loadedIA.notifyOwnerAboutApiKey || (() => {}),
                ...loadedIA
            };
        } catch (e) {
            console.warn('[EXPORTS] Falha ao carregar IA, usando stub');
            modules.ia = {
                makeAssistentRequest: () => { throw new Error('IA não disponível'); },
                makeCognimaRequest: () => { throw new Error('IA não disponível'); }
            };
        }

        try {
            const temuScammerMod = await import('./private/temuScammer.js');
            modules.temuScammer = temuScammerMod.default ?? temuScammerMod;
        } catch (e) {
            modules.temuScammer = {};
        }

        // --- JSONs ---
        const toolsJsonData = loadJsonSync('json/tools.json');
        const vabJsonData = loadJsonSync('json/vab.json');

        modules.toolsJson = () => toolsJsonData;
        modules.vabJson = () => vabJsonData;

        return modules;
    })();

    return modulesPromise;
}

export async function getModules() {
    return await loadModules();
}

const modules = await loadModules();

const safeModules = new Proxy(modules, {
    get(target, prop) {
        if (!(prop in target)) {
            console.warn(`[EXPORTS] Módulo '${prop}' não encontrado`);
            return undefined;
        }
        return target[prop];
    }
});

export default safeModules;
