import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Cake, Ingredient } from '../types';
import { AppBackupData, buildBackupData, parseBackupData } from './localStorage';

const BACKUP_FILE_PREFIX = 'tortactrl-backup';

/**
 * Genera un archivo JSON con todas las tortas e ingredientes actuales y
 * lo guarda en la carpeta de caché. Si el dispositivo soporta compartir,
 * abre el diálogo del sistema para enviarlo por WhatsApp, Drive, etc.
 *
 * Devuelve información útil sobre el proceso: si se compartió o no,
 * la ruta del archivo generado y el objeto de respaldo.
 */
export async function exportAppBackup(ingredients: Ingredient[], cakes: Cake[]) {
    const backup = buildBackupData({ ingredients, cakes });
    const stamp = backup.exportedAt.replace(/[:.]/g, '-');
    const backupFile = new File(Paths.cache, `${BACKUP_FILE_PREFIX}-${stamp}.json`);

    if (backupFile.exists) {
        backupFile.delete();
    }

    backupFile.create({ intermediates: true, overwrite: true });
    backupFile.write(JSON.stringify(backup, null, 2));

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(backupFile.uri, {
            mimeType: 'application/json',
            UTI: 'public.json',
            dialogTitle: 'Exportar respaldo de TortaCtrl',
        });
    }

    return {
        shared: canShare,
        fileUri: backupFile.uri,
        backup,
    };
}

/**
 * Abre un selector de archivos para que el usuario elija un JSON de respaldo.
 * Si el usuario cancela, devuelve null.
 * Si el archivo es válido, lo lee, lo parsea y devuelve un AppBackupData listo
 * para usar con replaceAllData en el store.
 */
export async function importAppBackup(): Promise<AppBackupData | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
    });

    if (result.canceled || !result.assets?.length) {
        return null;
    }

    const pickedFile = new File(result.assets[0].uri);
    const raw = await pickedFile.text();
    return parseBackupData(raw);
}