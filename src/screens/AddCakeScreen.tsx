import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppState } from '../store/AppState';
import { AddCakeDraft, CakeShape } from '../types';
import type { RootTabParamList } from '../../App';
import { cakesStyles as styles } from '../styles/cakesStyles';

type LocalIngredientQty = {
    ingredientId: string;
    nombre: string;
    cantidad: string; // como texto, luego lo convertimos a número
    costoLinea: string; // precio unitario para este pastel (opcional)
    esMontoK?: boolean;
};

const shapeOptions: { label: string; value: CakeShape }[] = [
    { label: 'Redonda', value: 'redonda' },
    { label: 'Cuadrada', value: 'cuadrada' },
    { label: 'Otra', value: 'otra' },
];

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const formatDisplayDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-');
    return `${day}-${month}-${year}`;
};

type AddCakeNav = import('@react-navigation/native').NavigationProp<RootTabParamList, 'Agregar'>;
type AddCakeRoute = import('@react-navigation/native').RouteProp<RootTabParamList, 'Agregar'>;

const AddCakeScreen: React.FC = () => {
    const navigation = useNavigation<AddCakeNav>();
    const route = useRoute<AddCakeRoute>();
    const { ingredients, addCake } = useAppState();

    const [nombre, setNombre] = useState('');
    const [cliente, setCliente] = useState('');
    const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [forma, setForma] = useState<CakeShape>('redonda');
    const [tamanio, setTamanio] = useState('');
    const [notas, setNotas] = useState('');
    const [montoVenta, setMontoVenta] = useState('');
    const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);
    const [photoZoomed, setPhotoZoomed] = useState(false);
    const [searchIngredient, setSearchIngredient] = useState('');
    const [showCakeDatePicker, setShowCakeDatePicker] = useState(false);

    const [ingredientesLocal, setIngredientesLocal] = useState<LocalIngredientQty[]>([]);

    // sincronizar ingredientes locales con la lista global de ingredientes
    // siempre que cambie el costo del ingrediente, actualizamos el costo de referencia
    useEffect(() => {
        setIngredientesLocal((prev) => {
            const qtyMap = new Map(prev.map((p) => [p.ingredientId, p.cantidad]));
            return ingredients.map((ing) => ({
                ingredientId: ing.id,
                nombre: ing.nombre,
                cantidad: qtyMap.get(ing.id) ?? '',
                esMontoK: ing.esMontoK,
                costoLinea:
                    Number.isFinite(ing.costoPorUnidad as unknown as number)
                        ? String(ing.costoPorUnidad)
                        : '',
            }));
        });
    }, [ingredients]);

    useEffect(() => {
        const duplicateCake = route.params?.duplicateCake;
        const duplicateSourceId = route.params?.duplicateSourceId;

        if (!duplicateCake || !duplicateSourceId || !ingredients.length) {
            return;
        }

        const usageMap = new Map(
            duplicateCake.ingredientesUsados.map((item) => [item.ingredientId, item]),
        );

        setNombre(duplicateCake.nombre ?? '');
        setCliente(duplicateCake.cliente ?? '');
        setFecha(duplicateCake.fecha ?? new Date().toISOString().slice(0, 10));
        setForma(duplicateCake.forma);
        setTamanio(duplicateCake.tamanio ?? '');
        setNotas(duplicateCake.notas ?? '');
        setMontoVenta(
            duplicateCake.montoVenta != null && !Number.isNaN(duplicateCake.montoVenta)
                ? String(duplicateCake.montoVenta)
                : '',
        );
        setFotoUri(duplicateCake.fotoUri);
        setPhotoZoomed(false);
        setIngredientesLocal(
            ingredients.map((ing) => {
                const duplicatedUsage = usageMap.get(ing.id);

                return {
                    ingredientId: ing.id,
                    nombre: ing.nombre,
                    cantidad: duplicatedUsage ? String(duplicatedUsage.cantidad) : '',
                    esMontoK: ing.esMontoK,
                    costoLinea:
                        duplicatedUsage?.costoLinea != null && !Number.isNaN(duplicatedUsage.costoLinea)
                            ? String(duplicatedUsage.costoLinea)
                            : Number.isFinite(ing.costoPorUnidad as unknown as number)
                                ? String(ing.costoPorUnidad)
                                : '',
                };
            }),
        );

        navigation.setParams({
            duplicateCake: undefined,
            duplicateSourceId: undefined,
        });
    }, [route.params, ingredients, navigation]);

    const costoEstimado = useMemo(() => {
        const base = ingredientesLocal.reduce((total, item) => {
            const cantidadNum = Number(item.cantidad.replace(',', '.'));
            if (isNaN(cantidadNum) || cantidadNum <= 0) return total;
            const ing = ingredients.find((i) => i.id === item.ingredientId);
            if (!ing) return total;
            const unitOverride = Number(item.costoLinea.replace(',', '.'));
            const unitPrice = !Number.isNaN(unitOverride) && unitOverride > 0
                ? unitOverride
                : ing.costoPorUnidad;
            return total + unitPrice * cantidadNum;
        }, 0);

        return base;
    }, [ingredientesLocal, ingredients]);

    const gananciaEstimada = useMemo(() => {
        const venta = Number(montoVenta.replace(',', '.'));
        if (Number.isNaN(venta) || venta <= 0) {
            return null;
        }

        return venta - costoEstimado;
    }, [montoVenta, costoEstimado]);

    const filteredIngredientesLocal = useMemo(() => {
        const query = searchIngredient.trim().toLowerCase();

        if (!query) {
            return ingredientesLocal;
        }

        return ingredientesLocal.filter((item) => item.nombre.toLowerCase().includes(query));
    }, [ingredientesLocal, searchIngredient]);

    // Actualiza la cantidad usada de un ingrediente en el formulario.
    const handleChangeCantidad = (id: string, value: string) => {
        setIngredientesLocal((prev) =>
            prev.map((item) =>
                item.ingredientId === id
                    ? {
                        ...item,
                        cantidad: value,
                    }
                    : item,
            ),
        );
    };

    // Actualiza el costo por unidad (costo línea) de un ingrediente.
    const handleChangeCostoLinea = (id: string, value: string) => {
        setIngredientesLocal((prev) =>
            prev.map((item) =>
                item.ingredientId === id
                    ? {
                        ...item,
                        costoLinea: value,
                    }
                    : item,
            ),
        );
    };

    // Valida y guarda la nueva torta, calculando costos y limpiando el formulario.
    const handleGuardarTorta = async () => {
        if (!ingredients.length) {
            Alert.alert('Faltan ingredientes', 'Primero agrega ingredientes en la pestaña "Ingredientes".');
            return;
        }

        const ingredientesUsados = ingredientesLocal
            .map((item) => ({
                ingredientId: item.ingredientId,
                cantidad: Number(item.cantidad.replace(',', '.')) || 0,
                costoLinea: Number(item.costoLinea.replace(',', '.')) || undefined,
            }))
            .filter((i) => i.cantidad > 0);

        if (!ingredientesUsados.length) {
            Alert.alert(
                'Falta cantidad',
                'Indica la cantidad usada al menos para un ingrediente (puede ser 0.5, 1, 2, etc.).',
            );
            return;
        }

        const synced = await addCake({
            nombre: nombre.trim() || undefined,
            cliente: cliente.trim() || undefined,
            fecha,
            forma,
            tamanio: tamanio.trim() || undefined,
            notas: notas.trim() || undefined,
            montoVenta: Number(montoVenta.replace(',', '.')) || undefined,
            ingredientesUsados,
            fotoUri,
        });

        setNombre('');
        setCliente('');
        setNotas('');
        setMontoVenta('');
        setFotoUri(undefined);

        // limpiar cantidades y dejar costos de referencia listos para la próxima torta
        setIngredientesLocal((prev) =>
            prev.map((item) => ({
                ...item,
                cantidad: '',
            })),
        );

        Alert.alert(
            'Torta guardada',
            synced
                ? 'La torta se guardó y se sincronizó con Firebase.'
                : 'La torta se guardó en el teléfono, pero no se pudo sincronizar con Firebase.',
        );
    };

    // Abre la galería para seleccionar una foto y guardarla en el borrador.
    const handleSeleccionarFoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesito acceso a tus fotos para agregar la imagen.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
            setFotoUri(result.assets[0].uri);
        }
    };

    // Abre el selector nativo para elegir la fecha de la torta.
    const handleCakeDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowCakeDatePicker(false);

        if (event.type !== 'set' || !selectedDate) {
            return;
        }

        setFecha(formatDateKey(selectedDate));
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
            >

                <View style={styles.formSection}>
                    <TextInput
                        placeholder="Sabor (opcional)"
                        value={nombre}
                        onChangeText={setNombre}
                        placeholderTextColor="#b5a0c5"
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Cliente"
                        value={cliente}
                        onChangeText={setCliente}
                        placeholderTextColor="#b5a0c5"
                        style={styles.input}
                    />
                    <Pressable
                        onPress={() => setShowCakeDatePicker(true)}
                        style={[styles.input, styles.dateFieldButton]}
                    >
                        <Text style={styles.dateFieldButtonText}>{formatDisplayDate(fecha)}</Text>
                        <Ionicons name="calendar-outline" size={18} color="#a54d75" />
                    </Pressable>

                    <Text style={styles.label}>Forma</Text>
                    <View style={styles.shapeRow}>
                        {shapeOptions.map((opt) => (
                            <Pressable
                                key={opt.value}
                                onPress={() => setForma(opt.value)}
                                style={[
                                    styles.shapeButton,
                                    forma === opt.value && styles.shapeButtonActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.shapeButtonText,
                                        forma === opt.value && styles.shapeButtonTextActive,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <TextInput
                        placeholder="Tamaño (ej. 20cm, 1kg)"
                        value={tamanio}
                        onChangeText={setTamanio}
                        placeholderTextColor="#b5a0c5"
                        style={styles.input}
                    />

                    <TextInput
                        placeholder="Notas (opcional)"
                        value={notas}
                        onChangeText={setNotas}
                        placeholderTextColor="#b5a0c5"
                        style={[styles.input, { height: 60 }]}
                        multiline
                    />

                    <TextInput
                        placeholder="Monto de venta (opcional)"
                        value={montoVenta}
                        onChangeText={setMontoVenta}
                        keyboardType="numeric"
                        placeholderTextColor="#b5a0c5"
                        style={styles.input}
                    />
                </View>

                <Text style={styles.sectionTitle}>Detalle de costos</Text>
                {ingredients.length === 0 ? (
                    <Text style={styles.emptyText}>
                        Primero agrega ingredientes en la pestaña "Ingredientes".
                    </Text>
                ) : (
                    <View style={{ marginBottom: 8 }}>
                        <View style={[styles.searchBox, { marginBottom: 10 }]}> 
                            <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
                            <TextInput
                                placeholder="Buscar ingrediente"
                                placeholderTextColor="#888"
                                value={searchIngredient}
                                onChangeText={setSearchIngredient}
                                style={styles.filterInput}
                                selectionColor="#e91e63"
                                cursorColor="#e91e63"
                                underlineColorAndroid="transparent"
                                autoCorrect={false}
                            />
                        </View>

                        {filteredIngredientesLocal.length === 0 ? (
                            <Text style={styles.emptyText}>No hay ingredientes que coincidan con la búsqueda.</Text>
                        ) : filteredIngredientesLocal.map((item) => (
                            <View key={item.ingredientId} style={styles.ingRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.ingName}>{item.nombre}</Text>
                                        {item.esMontoK ? (
                                            <Text style={styles.inlineKBadge}>K</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <TextInput
                                    placeholder="Cant."
                                    value={item.cantidad}
                                    onChangeText={(v) => handleChangeCantidad(item.ingredientId, v)}
                                    keyboardType="numeric"
                                    placeholderTextColor="#b5a0c5"
                                    style={styles.ingInput}
                                />
                                <TextInput
                                    placeholder="Costo línea"
                                    value={item.costoLinea}
                                    onChangeText={(v) => handleChangeCostoLinea(item.ingredientId, v)}
                                    keyboardType="numeric"
                                    placeholderTextColor="#b5a0c5"
                                    style={[styles.ingInput, { marginLeft: 4 }]}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Otros costos eliminados: ahora se manejan creando ingredientes específicos (Decoración, Disco MDF, Velas, etc.) */}

                <Text style={styles.costLabel}>Costo estimado: ${costoEstimado.toFixed(2)}</Text>
                {gananciaEstimada != null && (
                    <Text
                        style={[
                            styles.gainLabel,
                            gananciaEstimada < 0 && styles.gainLabelNegative,
                        ]}
                    >
                        Ganancia estimada: ${gananciaEstimada.toFixed(2)}
                    </Text>
                )}
                <View style={styles.photoActionRow}>
                    <Pressable style={styles.photoPickerButton} onPress={handleSeleccionarFoto}>
                        <Ionicons name="image-outline" size={20} color="#e91e63" />
                        <Text style={styles.photoPickerButtonText}>
                            {fotoUri ? 'Cambiar' : 'Foto'}
                        </Text>
                    </Pressable>

                    {fotoUri ? (
                        <Pressable onPress={() => setPhotoZoomed(true)} style={styles.photoPreviewCard}>
                            <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
                            <View style={styles.photoPreviewBadge}>
                                <Ionicons name="expand-outline" size={14} color="#fff" />
                            </View>
                        </Pressable>
                    ) : (
                        <View style={styles.photoPlaceholderCard}>
                            <Ionicons name="image-outline" size={24} color="#caa3ba" />
                            <Text style={styles.photoPlaceholderText}>Sin foto</Text>
                        </View>
                    )}
                </View>

                <Pressable style={styles.saveCakeButton} onPress={handleGuardarTorta}>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveCakeButtonText}>Guardar torta</Text>
                </Pressable>
            </ScrollView>

            {photoZoomed && fotoUri && (
                <Pressable style={styles.detailOverlay} onPress={() => setPhotoZoomed(false)}>
                    <Image
                        source={{ uri: fotoUri }}
                        style={styles.expandedPhotoPreview}
                        resizeMode="contain"
                    />
                </Pressable>
            )}

            {showCakeDatePicker && (
                <DateTimePicker
                    value={parseDateKey(fecha)}
                    mode="date"
                    display="default"
                    onChange={handleCakeDateChange}
                />
            )}
        </View>
    );
};

export default AddCakeScreen;
