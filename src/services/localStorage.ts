import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cake, Ingredient } from '../types';

const INGREDIENTS_KEY = 'tortactrl_ingredients_v1';
const CAKES_KEY = 'tortactrl_cakes_v1';

/**
 * Estructura mínima que guardamos localmente en el teléfono.
 * Son simplemente las listas de ingredientes y tortas serializadas en AsyncStorage.
 */
export interface StoredAppData {
    ingredients: Ingredient[];
    cakes: Cake[];
}

export interface AppBackupData extends StoredAppData {
    version: number;
    exportedAt: string;
}

/**
 * Carga todos los ingredientes desde AsyncStorage.
 * Si hay algún error o no hay datos guardados, devuelve un arreglo vacío.
 */
export async function loadIngredients(): Promise<Ingredient[]> {
    try {
        const raw = await AsyncStorage.getItem(INGREDIENTS_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as Ingredient[];
    } catch (e) {
        console.warn('Error cargando ingredientes', e);
        return [];
    }
}

/**
 * Guarda la lista completa de ingredientes en AsyncStorage.
 */
export async function saveIngredients(list: Ingredient[]): Promise<void> {
    try {
        await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Error guardando ingredientes', e);
    }
}

/**
 * Carga todas las tortas desde AsyncStorage.
 * Si hay algún problema, devuelve un arreglo vacío.
 */
export async function loadCakes(): Promise<Cake[]> {
    try {
        const raw = await AsyncStorage.getItem(CAKES_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as Cake[];
    } catch (e) {
        console.warn('Error cargando tortas', e);
        return [];
    }
}

/**
 * Guarda la lista completa de tortas en AsyncStorage.
 */
export async function saveCakes(list: Cake[]): Promise<void> {
    try {
        await AsyncStorage.setItem(CAKES_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Error guardando tortas', e);
    }
}

/**
 * Guarda de una sola vez los ingredientes y las tortas en AsyncStorage.
 * Se usa cuando importamos un respaldo o reemplazamos todo el estado.
 */
export async function saveAllStoredData(data: StoredAppData): Promise<void> {
    try {
        await AsyncStorage.multiSet([
            [INGREDIENTS_KEY, JSON.stringify(data.ingredients)],
            [CAKES_KEY, JSON.stringify(data.cakes)],
        ]);
    } catch (e) {
        console.warn('Error guardando respaldo local', e);
    }
}

/**
 * Elimina todas las claves usadas por la app en AsyncStorage.
 * No toca ningún otro dato de otras apps.
 */
export async function clearAllStoredData(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([INGREDIENTS_KEY, CAKES_KEY]);
    } catch (e) {
        console.warn('Error borrando datos locales', e);
    }
}

/**
 * Construye un objeto de respaldo listo para exportar a archivo.
 * Agrega metadatos como la versión del formato y la fecha de exportación.
 */
export function buildBackupData(data: StoredAppData): AppBackupData {
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        ingredients: data.ingredients,
        cakes: data.cakes,
    };
}

/**
 * Parsea el contenido de un archivo de respaldo JSON y valida
 * que tenga la estructura esperada (ingredientes y tortas).
 * Si el formato es incorrecto, lanza un error con un mensaje legible.
 */
export function parseBackupData(raw: string): AppBackupData {
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        throw new Error('El archivo no contiene un JSON válido.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('El respaldo tiene un formato inválido.');
    }

    const backup = parsed as Partial<AppBackupData>;

    if (!Array.isArray(backup.ingredients) || !Array.isArray(backup.cakes)) {
        throw new Error('El respaldo no contiene ingredientes y tortas válidos.');
    }

    return {
        version: typeof backup.version === 'number' ? backup.version : 1,
        exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : new Date().toISOString(),
        ingredients: backup.ingredients as Ingredient[],
        cakes: backup.cakes as Cake[],
    };
}
