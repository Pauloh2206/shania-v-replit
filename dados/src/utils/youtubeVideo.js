import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);
const TEMP_FOLDER = path.join(process.cwd(), 'temp_downloads');

if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true });
}

/**
 * MODO ULTRA FAST COM FALLBACK INTELIGENTE
 * Otimizado para arquivos grandes e conexões instáveis.
 * Tenta múltiplos formatos para garantir o sucesso do download de vídeo.
 */
export async function downloadYoutubeMp4_Fast(videoUrl) {
    const timestamp = Date.now();
    const fileName = path.join(TEMP_FOLDER, `${timestamp}_fast.mp4`);
    
    // Lista de formatos para tentar em ordem de preferência (máximo 720p para economizar dados)
    const formats = [
        'best[height<=720][ext=mp4]',
        'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'best[height<=480][ext=mp4]',
        'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'best'
    ];

    let lastError = null;

    for (const format of formats) {
        try {
            console.log(`[YOUTUBE-VIDEO] Tentando formato: ${format}`);
            const command = `yt-dlp -f "${format}" --output "${fileName}" --restrict-filenames "${videoUrl}"`;
            
            await execPromise(command, { maxBuffer: 1024 * 1024 * 100 });

            if (fs.existsSync(fileName)) {
                console.log(`[YOUTUBE-VIDEO] Sucesso com formato: ${format}`);
                return fileName;
            }
        } catch (error) {
            console.error(`[YOUTUBE-VIDEO] Falha no formato ${format}:`, error.message);
            lastError = error;
            // Continua para o próximo formato
        }
    }

    console.error("Erro final no download de vídeo após todas as tentativas.");
    throw new Error('Falha ao baixar o vídeo. O YouTube pode ter alterado suas proteções ou o formato solicitado não está disponível. Tente novamente em instantes.');
}
