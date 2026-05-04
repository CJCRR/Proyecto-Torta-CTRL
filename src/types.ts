export type CakeShape = 'redonda' | 'cuadrada' | 'otra';

export interface AddCakeDraft {
  nombre?: string;
  cliente?: string;
  fecha?: string;
  forma: CakeShape;
  tamanio?: string;
  notas?: string;
  fotoUri?: string;
  montoVenta?: number;
  ingredientesUsados: {
    ingredientId: string;
    cantidad: number;
    costoLinea?: number;
  }[];
}

export interface Ingredient {
  id: string;
  nombre: string;
  unidad: string; // ej: 'kg', 'g', 'unidad', 'ml'
  costoPorUnidad: number;
  esMontoK?: boolean;
  notas?: string;
}

export interface CakeIngredientUsage {
  ingredientId: string;
  cantidad: number;
  costoLinea?: number;
}

export interface Cake {
  id: string;
  nombre?: string;
  cliente?: string;
  fecha: string; // ISO date
  forma: CakeShape;
  tamanio?: string;
  ingredientes: CakeIngredientUsage[];
  costoTotal: number;
  montoVenta?: number;
  fotoUri?: string;
  notas?: string;
  decoracionCost?: number;
  discoMdfCost?: number;
  velasCost?: number;
  pagada?: boolean;
  entregada?: boolean;
}
