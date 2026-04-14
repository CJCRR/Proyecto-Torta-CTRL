import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Cake, Ingredient, CakeIngredientUsage } from '../types';
import {
    clearAllStoredData,
    loadIngredients,
    saveIngredients,
    loadCakes,
    saveCakes,
    saveAllStoredData,
    StoredAppData,
} from '../services/localStorage';
import {
    deleteCakeFromFirebase,
    deleteIngredientFromFirebase,
    ensureAnonymousFirebaseAuth,
    syncCakeToFirebase,
    syncIngredientToFirebase,
    uploadCakePhotoIfNeeded,
} from '../services/firebase';

/**
 * Forma tipada del estado global de la aplicación.
 * Aquí definimos qué listas tenemos (ingredientes y tortas)
 * y qué operaciones de negocio expone el contexto.
 */
interface AppState {
    ingredients: Ingredient[];
    cakes: Cake[];
    addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
    updateIngredient: (id: string, data: Omit<Ingredient, 'id'>) => void;
    deleteIngredient: (id: string) => void;
    updateCakeStatus: (id: string, data: Pick<Partial<Cake>, 'pagada' | 'entregada'>) => Promise<boolean>;
    updateCakeSaleAmount: (id: string, montoVenta?: number) => Promise<boolean>;
    replaceAllData: (data: StoredAppData) => Promise<boolean>;
    clearAllData: (options?: { deleteRemote?: boolean }) => Promise<boolean>;
    addCake: (data: {
        nombre?: string;
        cliente?: string;
        fecha: string;
        forma: Cake['forma'];
        tamanio?: string;
        notas?: string;
        montoVenta?: number;
        ingredientesUsados: { ingredientId: string; cantidad: number; costoLinea?: number }[];
        fotoUri?: string;
        decoracionCost?: number;
        discoMdfCost?: number;
        velasCost?: number;
    }) => Promise<boolean>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

interface AppStateProviderProps {
    children: ReactNode;
}

/**
 * Proveedor del contexto global de estado.
 * - Hidrata ingredientes y tortas desde AsyncStorage al iniciar.
 * - Intenta sincronizar los datos locales con Firebase en segundo plano.
 * - Expone las funciones de negocio (agregar/editar/borrar) al resto de pantallas.
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [cakes, setCakes] = useState<Cake[]>([]);

    useEffect(() => {
        // Hidrata datos locales y dispara sincronización inicial con Firebase.
        const hydrate = async () => {
            const [storedIngredients, storedCakes] = await Promise.all([
                loadIngredients(),
                loadCakes(),
            ]);
            setIngredients((prev) => (prev.length ? prev : storedIngredients));
            setCakes((prev) => (prev.length ? prev : storedCakes));

            const isAuthenticated = await ensureAnonymousFirebaseAuth();
            if (!isAuthenticated) return;

            void Promise.allSettled([
                ...storedIngredients.map((ingredient) => syncIngredientToFirebase(ingredient)),
                ...storedCakes.map((cake) => syncCakeToFirebase(cake)),
            ]);
        };

        hydrate();
    }, []);

    /**
     * Agrega un ingrediente nuevo.
     * - Genera un id local.
     * - Guarda la lista en AsyncStorage.
     * - Intenta subir el ingrediente a Firebase.
     */
    const addIngredient = (ingredient: Omit<Ingredient, 'id'>) => {
        const newIngredient: Ingredient = {
            id: Date.now().toString(),
            ...ingredient,
        };

        setIngredients((prev) => {
            const next = [...prev, newIngredient];
            saveIngredients(next);
            return next;
        });

        void syncIngredientToFirebase(newIngredient);
    };

    /**
     * Actualiza un ingrediente existente por id.
     * También vuelve a guardar en AsyncStorage
     * y re-sincroniza el ingrediente modificado a Firebase.
     */
    const updateIngredient = (id: string, data: Omit<Ingredient, 'id'>) => {
        let updatedIngredient: Ingredient | undefined;

        setIngredients((prev) => {
            const next = prev.map((ing) =>
                ing.id === id
                    ? { ...ing, ...data }
                    : ing,
            );
            updatedIngredient = next.find((ing) => ing.id === id);
            saveIngredients(next);
            return next;
        });

        if (updatedIngredient) {
            void syncIngredientToFirebase(updatedIngredient);
        }
    };

    /**
     * Elimina un ingrediente por id.
     * - Actualiza la lista local y AsyncStorage.
     * - Intenta borrar el documento correspondiente en Firebase.
     */
    const deleteIngredient = (id: string) => {
        setIngredients((prev) => {
            const next = prev.filter((ing) => ing.id !== id);
            saveIngredients(next);
            return next;
        });

        void deleteIngredientFromFirebase(id);
    };

    /**
     * Helper interno para aplicar cambios a una torta y sincronizarla con Firebase.
     * Se usa tanto para cambiar estados (pagada/entregada) como para actualizar el monto de venta.
     */
    const updateCake = async (id: string, data: Partial<Cake>) => {
        let updatedCake: Cake | undefined;

        setCakes((prev) => {
            const next = prev.map((cake) =>
                cake.id === id
                    ? { ...cake, ...data }
                    : cake,
            );
            updatedCake = next.find((cake) => cake.id === id);
            saveCakes(next);
            return next;
        });

        if (!updatedCake) {
            return false;
        }

        return syncCakeToFirebase(updatedCake);
    };

    /**
     * Marca una torta como pagada y/o entregada.
     * Devuelve true si se pudo sincronizar el cambio con Firebase.
     */
    const updateCakeStatus: AppState['updateCakeStatus'] = async (id, data) => updateCake(id, data);

    /**
     * Actualiza el monto de venta de una torta.
     * Si el monto es undefined, se limpia el valor.
     */
    const updateCakeSaleAmount: AppState['updateCakeSaleAmount'] = async (id, montoVenta) =>
        updateCake(id, { montoVenta });

    /**
     * Reemplaza todos los datos locales (ingredientes y tortas) por los
     * que vienen en un respaldo/importación.
     * También intenta:
     * - Borrar en Firebase los registros que ya no existen.
     * - Subir/sincronizar todos los nuevos ingredientes y tortas.
     */
    const replaceAllData: AppState['replaceAllData'] = async (data) => {
        const currentIngredientIds = new Set(ingredients.map((ingredient) => ingredient.id));
        const currentCakeIds = new Set(cakes.map((cake) => cake.id));
        const nextIngredientIds = new Set(data.ingredients.map((ingredient) => ingredient.id));
        const nextCakeIds = new Set(data.cakes.map((cake) => cake.id));

        setIngredients(data.ingredients);
        setCakes(data.cakes);
        await saveAllStoredData(data);

        const remoteResults = await Promise.allSettled([
            ...Array.from(currentIngredientIds)
                .filter((id) => !nextIngredientIds.has(id))
                .map((id) => deleteIngredientFromFirebase(id)),
            ...Array.from(currentCakeIds)
                .filter((id) => !nextCakeIds.has(id))
                .map((id) => deleteCakeFromFirebase(id)),
            ...data.ingredients.map((ingredient) => syncIngredientToFirebase(ingredient)),
            ...data.cakes.map((cake) => syncCakeToFirebase(cake)),
        ]);

        return remoteResults.every(
            (result) => result.status === 'fulfilled' && result.value,
        );
    };

    /**
     * Borra todos los datos locales (ingredientes y tortas).
     * Opcionalmente también intenta borrar todos los registros remotos en Firebase.
     */
    const clearAllData: AppState['clearAllData'] = async (options) => {
        const deleteRemote = options?.deleteRemote ?? true;
        const ingredientIds = ingredients.map((ingredient) => ingredient.id);
        const cakeIds = cakes.map((cake) => cake.id);

        setIngredients([]);
        setCakes([]);
        await clearAllStoredData();

        if (!deleteRemote) {
            return true;
        }

        const remoteResults = await Promise.allSettled([
            ...ingredientIds.map((id) => deleteIngredientFromFirebase(id)),
            ...cakeIds.map((id) => deleteCakeFromFirebase(id)),
        ]);

        return remoteResults.every(
            (result) => result.status === 'fulfilled' && result.value,
        );
    };

    /**
     * Crea una nueva torta a partir de los datos del formulario.
     * - Calcula el costo total en base a los ingredientes y extras.
     * - Genera un id local y, si corresponde, sube la foto.
     * - Guarda la torta en memoria y AsyncStorage.
     * - Intenta sincronizarla con Firebase.
     */
    const addCake: AppState['addCake'] = async ({
        nombre,
        cliente,
        fecha,
        forma,
        tamanio,
        notas,
        montoVenta,
        ingredientesUsados,
        fotoUri,
        decoracionCost,
        discoMdfCost,
        velasCost,
    }) => {
        const ingredientes: CakeIngredientUsage[] = ingredientesUsados
            .filter((i) => i.cantidad > 0)
            .map((i) => ({
                ingredientId: i.ingredientId,
                cantidad: i.cantidad,
                costoLinea: i.costoLinea,
            }));

        // calcular costo total en base a los ingredientes actuales
        const baseIngredientes = ingredientes.reduce((total, usage) => {
            const ing = ingredients.find((x) => x.id === usage.ingredientId);
            if (!ing) return total;
            const unitPrice =
                usage.costoLinea != null && !Number.isNaN(usage.costoLinea)
                    ? usage.costoLinea
                    : ing.costoPorUnidad;
            return total + unitPrice * usage.cantidad;
        }, 0);

        const extraDecoracion = decoracionCost ?? 0;
        const extraDiscoMdf = discoMdfCost ?? 0;
        const extraVelas = velasCost ?? 0;

        const costoTotal = baseIngredientes + extraDecoracion + extraDiscoMdf + extraVelas;

        const id = Date.now().toString();
        const finalFotoUri = await uploadCakePhotoIfNeeded(fotoUri, id);

        const newCake: Cake = {
            id,
            nombre,
            cliente,
            fecha,
            forma,
            tamanio,
            notas,
            ingredientes,
            costoTotal,
            montoVenta,
            fotoUri: finalFotoUri,
            decoracionCost: extraDecoracion || undefined,
            discoMdfCost: extraDiscoMdf || undefined,
            velasCost: extraVelas || undefined,
        };

        setCakes((prev) => {
            const next = [newCake, ...prev];
            saveCakes(next);
            return next;
        });

        return syncCakeToFirebase(newCake);
    };

    const value: AppState = {
        ingredients,
        cakes,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        updateCakeStatus,
        updateCakeSaleAmount,
        replaceAllData,
        clearAllData,
        addCake,
    };

    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

/**
 * Hook de conveniencia para consumir el contexto de estado global.
 * Lanza un error claro si se usa fuera de AppStateProvider.
 */
export const useAppState = (): AppState => {
    const ctx = useContext(AppStateContext);
    if (!ctx) {
        throw new Error('useAppState debe usarse dentro de AppStateProvider');
    }
    return ctx;
};
