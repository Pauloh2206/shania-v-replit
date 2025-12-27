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
 * BUSCA DE METADADOS
 * Garante que a busca seja precisa e retorne a música correta.
 */
export async function getVideoMetadata(query) {
    const command = `yt-dlp --dump-json "ytsearch1:${query}" --no-playlist --restrict-filenames`;

    try {
        const { stdout } = await execPromise(command, { encoding: 'utf8', maxBuffer: 1024 * 10000 });
        const metadata = JSON.parse(stdout);

        return {
            title: metadata.title,
            author: metadata.channel,
            views: metadata.view_count ? metadata.view_count.toLocaleString('pt-BR') : 'N/A',
            duration: metadata.duration_string || 'N/A',
            url: metadata.webpage_url,
            thumbnail: metadata.thumbnail,
            seconds: metadata.duration,
            id: metadata.id
        };
    } catch (error) {
        if (error.code === 127 || String(error).includes('yt-dlp')) {
            throw new Error(`❌ yt-dlp não encontrado.`);
        }
        throw new Error(`Falha ao buscar informações da música.`);
    }
}

/**
 * DOWNLOAD INTELIGENTE COM FALLBACK
 * Tenta múltiplos formatos para garantir o sucesso do download.
 */
export async function downloadYoutubeM4A_Fast(videoUrl) {
    const timestamp = Date.now();
    const fileName = path.join(TEMP_FOLDER, `${timestamp}_audio.m4a`);
    
    // Lista de formatos para tentar em ordem de preferência
    const formats = [
        'bestaudio[ext=m4a]',
        'bestaudio[ext=mp4]',
        'bestaudio[ext=webm]',
        'bestaudio',
        'best[ext=m4a]'
    ];

    let lastError = null;

    for (const format of formats) {
        try {
            console.log(`[YOUTUBE] Tentando formato: ${format}`);
            const command = `yt-dlp -f "${format}" --output "${fileName}" --restrict-filenames "${videoUrl}"`;
            await execPromise(command);

            if (fs.existsSync(fileName)) {
                console.log(`[YOUTUBE] Sucesso com formato: ${format}`);
                return fileName;
            }
        } catch (error) {
            console.error(`[YOUTUBE] Falha no formato ${format}:`, error.message);
            lastError = error;
            // Continua para o próximo formato
        }
    }

    console.error("Erro final no download de áudio após todas as tentativas.");
    throw new Error('Falha ao baixar a música. O YouTube pode ter alterado suas proteções. Tente novamente em instantes.');
}
