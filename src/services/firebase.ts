// Configuración y helpers para Firebase (Firestore + Storage)
// IMPORTANTE: Debes crear un proyecto en https://console.firebase.google.com
// y pegar tu configuración web en firebaseConfig.

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
    getFirestore,
    collection,
    setDoc,
    doc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { Cake, Ingredient } from '../types';
import firebaseConfig from './firebaseConfig';

let authPromise: Promise<boolean> | null = null;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (value === null || typeof value !== 'object') return false;
    return Object.getPrototypeOf(value) === Object.prototype;
};

const stripUndefined = <T,>(value: T): T => {
    if (Array.isArray(value)) {
        return value
            .map((item) => stripUndefined(item))
            .filter((item) => item !== undefined) as T;
    }

    if (isPlainObject(value)) {
        const cleanedEntries = Object.entries(value).flatMap(([key, entryValue]) => {
            if (entryValue === undefined) return [];
            return [[key, stripUndefined(entryValue)]];
        });

        return Object.fromEntries(cleanedEntries) as T;
    }

    return value;
};

/**
 * Devuelve (e inicializa si hace falta) la instancia principal de Firebase.
 * Si la configuración no está completa, devuelve null para indicar que Firebase está desactivado.
 */
export function getFirebaseApp() {
    if (!firebaseConfig.projectId || firebaseConfig.projectId.startsWith('PON_AQUI')) {
        return null; // aún no configurado
    }
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getApps()[0] || null;
}

/**
 * Devuelve la instancia de Firestore asociada a la app de Firebase.
 * Si Firebase no está configurado, devuelve null.
 */
export function getDb() {
    const app = getFirebaseApp();
    return app ? getFirestore(app) : null;
}

/**
 * Se asegura de que tengamos una sesión anónima válida en Firebase Auth.
 * - Si ya hay usuario autenticado, responde true.
 * - Si no, intenta hacer sign-in anónimo una sola vez y reutiliza la misma promesa.
 */
export async function ensureAnonymousFirebaseAuth(): Promise<boolean> {
    const app = getFirebaseApp();
    if (!app) return false;

    const auth = getAuth(app);
    if (auth.currentUser) {
        return true;
    }

    if (!authPromise) {
        authPromise = signInAnonymously(auth)
            .then(() => true)
            .catch((error) => {
                console.error('No se pudo iniciar sesión anónima en Firebase:', error);
                return false;
            })
            .finally(() => {
                authPromise = null;
            });
    }

    return authPromise;
}

/**
 * Sube o actualiza un ingrediente en la colección "ingredients" de Firestore.
 * Retorna true si la operación se completó sin errores.
 */
export async function syncIngredientToFirebase(ingredient: Ingredient): Promise<boolean> {
    const isAuthenticated = await ensureAnonymousFirebaseAuth();
    if (!isAuthenticated) return false;

    const db = getDb();
    if (!db) return false;

    try {
        const refDoc = doc(collection(db, 'ingredients'), ingredient.id);
        await setDoc(refDoc, {
            ...stripUndefined(ingredient),
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error('No se pudo sincronizar el ingrediente con Firebase:', error);
        return false;
    }
}

/**
 * Sube o actualiza una torta en la colección "cakes" de Firestore.
 * Retorna true si la escritura fue exitosa.
 */
export async function syncCakeToFirebase(cake: Cake): Promise<boolean> {
    const isAuthenticated = await ensureAnonymousFirebaseAuth();
    if (!isAuthenticated) return false;

    const db = getDb();
    if (!db) return false;

    try {
        const refDoc = doc(collection(db, 'cakes'), cake.id);
        await setDoc(refDoc, {
            ...stripUndefined(cake),
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error('No se pudo sincronizar la torta con Firebase:', error);
        return false;
    }
}

/**
 * Elimina un ingrediente por id en la colección "ingredients" de Firestore.
 */
export async function deleteIngredientFromFirebase(id: string): Promise<boolean> {
    const isAuthenticated = await ensureAnonymousFirebaseAuth();
    if (!isAuthenticated) return false;

    const db = getDb();
    if (!db) return false;

    try {
        await deleteDoc(doc(collection(db, 'ingredients'), id));
        return true;
    } catch (error) {
        console.error('No se pudo borrar el ingrediente de Firebase:', error);
        return false;
    }
}

/**
 * Elimina una torta por id en la colección "cakes" de Firestore.
 */
export async function deleteCakeFromFirebase(id: string): Promise<boolean> {
    const isAuthenticated = await ensureAnonymousFirebaseAuth();
    if (!isAuthenticated) return false;

    const db = getDb();
    if (!db) return false;

    try {
        await deleteDoc(doc(collection(db, 'cakes'), id));
        return true;
    } catch (error) {
        console.error('No se pudo borrar la torta de Firebase:', error);
        return false;
    }
}

/**
 * Stub de subida de foto de torta.
 * Por ahora simplemente devuelve la URI local para evitar usar Firebase Storage
 * y mantener la app sencilla y sin costos adicionales.
 */
export async function uploadCakePhotoIfNeeded(localUri?: string, _cakeId?: string): Promise<string | undefined> {
    // Versión sin Firebase Storage: devolvemos la URI local tal cual.
    // Así no necesitamos habilitar Storage ni pagar plan de pago.
    return localUri;
}
