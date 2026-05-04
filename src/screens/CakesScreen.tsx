import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Image,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppState } from '../store/AppState';
import { AddCakeDraft, Cake, CakeShape } from '../types';
import type { RootTabParamList } from '../../App';
import { cakesStyles as styles } from '../styles/cakesStyles';

const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
];

const weekdayShort = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const shapeOptions: { label: string; value: CakeShape }[] = [
    { label: 'Redonda', value: 'redonda' },
    { label: 'Cuadrada', value: 'cuadrada' },
    { label: 'Otra', value: 'otra' },
];

const clientColors = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E1BAFF'];

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-');
    return `${day}-${month}-${year}`;
};

const parseDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const getWeekRange = (dateKey: string) => {
    const baseDate = parseDateKey(dateKey);
    const currentDay = baseDate.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
        start,
        end,
        startKey: formatDateKey(start),
        endKey: formatDateKey(end),
    };
};

const formatShortDate = (date: Date) => `${date.getDate()} ${monthNames[date.getMonth()].slice(0, 3)}`;

const getColorForClient = (cliente?: string | null) => {
    if (!cliente) return '#ccc';
    let hash = 0;
    for (let i = 0; i < cliente.length; i += 1) {
        hash = (hash + cliente.charCodeAt(i)) % clientColors.length;
    }
    return clientColors[hash];
};

const getCakeAccentColor = (cake: Cake) => {
    if (cake.pagada && cake.entregada) return '#2b8a5b';
    if (cake.pagada) return '#e91e63';
    if (cake.entregada) return '#1d8f6a';
    return getColorForClient(cake.cliente);
};

type TortasNav = import('@react-navigation/native').NavigationProp<RootTabParamList, 'Tortas'>;

type SummaryKBreakdownItem = {
    ingredientId: string;
    nombre: string;
    cantidad: number;
    unidad?: string;
    costoUnitario: number;
    subtotal: number;
};

type SummaryKBreakdownCake = {
    cakeId: string;
    cakeNombre: string;
    cliente?: string;
    fecha: string;
    total: number;
    items: SummaryKBreakdownItem[];
};

type SummaryKGroupedItem = {
    ingredientId: string;
    nombre: string;
    unidad?: string;
    totalCantidad: number;
    totalSubtotal: number;
    cakesCount: number;
    usagesCount: number;
};

const CakesScreen: React.FC = () => {
    const navigation = useNavigation<TortasNav>();
    const { cakes, ingredients, updateCakeStatus, updateCakeSaleAmount } = useAppState();

    const today = useMemo(() => new Date(), []);
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1),
    );
    const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
    const [viewMode, setViewMode] = useState<'mes' | 'agenda'>('mes');
    const [showFilters, setShowFilters] = useState(false);
    const [searchCliente, setSearchCliente] = useState('');
    const [filtroForma, setFiltroForma] = useState<'todas' | CakeShape>('todas');
    const [statusFilter, setStatusFilter] = useState<'todas' | 'pagadas' | 'entregadas' | 'pendientes'>('todas');
    const [summaryMode, setSummaryMode] = useState<'semana' | 'mes'>('mes');
    const [summaryHidden, setSummaryHidden] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);
    const [selectedCakeId, setSelectedCakeId] = useState<string | null>(null);
    const [photoZoomed, setPhotoZoomed] = useState(false);
    const [showKBreakdown, setShowKBreakdown] = useState(false);
    const [saleAmountInput, setSaleAmountInput] = useState('');
    const [isSavingSaleAmount, setIsSavingSaleAmount] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.headerActionsRow}>
                    <Pressable
                        onPress={() => setShowFilters((prev) => !prev)}
                        style={styles.headerIconButton}
                    >
                        <Ionicons name="search" size={22} color="#333" />
                    </Pressable>
                    <Pressable
                        onPress={() => navigation.navigate('Ajustes')}
                        style={styles.headerIconButton}
                    >
                        <Ionicons name="settings-outline" size={22} color="#333" />
                    </Pressable>
                </View>
            ),
        });
    }, [navigation]);

    const normalizedDateRange = useMemo(() => {
        const start = dateFrom || null;
        const end = dateTo || null;

        if (start && end && start > end) {
            return { start: end, end: start };
        }

        return { start, end };
    }, [dateFrom, dateTo]);

    const hasDateRangeFilter = Boolean(normalizedDateRange.start || normalizedDateRange.end);

    const daysInMonth = useMemo(() => {
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const date = new Date(year, month, 1);
        const result: { key: string; label: string; weekday: string }[] = [];
        while (date.getMonth() === month) {
            const iso = date.toISOString().slice(0, 10);
            result.push({
                key: iso,
                label: String(date.getDate()),
                weekday: weekdayShort[date.getDay()],
            });
            date.setDate(date.getDate() + 1);
        }
        return result;
    }, [visibleMonth]);

    const filteredCakes = useMemo(
        () =>
            cakes.filter((c) => {
                if (filtroForma !== 'todas' && c.forma !== filtroForma) return false;
                if (statusFilter === 'pagadas' && !c.pagada) return false;
                if (statusFilter === 'entregadas' && !c.entregada) return false;
                if (statusFilter === 'pendientes' && (c.pagada || c.entregada)) return false;
                if (searchCliente.trim()) {
                    const q = searchCliente.trim().toLowerCase();
                    const cliente = (c.cliente || '').toLowerCase();
                    if (!cliente.includes(q)) return false;
                }
                if (normalizedDateRange.start && c.fecha < normalizedDateRange.start) return false;
                if (normalizedDateRange.end && c.fecha > normalizedDateRange.end) return false;
                return true;
            }),
        [cakes, filtroForma, normalizedDateRange.end, normalizedDateRange.start, searchCliente, statusFilter],
    );

    const cakesBySelectedDate = useMemo(
        () => filteredCakes.filter((c) => c.fecha === selectedDate),
        [filteredCakes, selectedDate],
    );

    const agendaSections = useMemo(() => {
        const grouped: Record<string, typeof cakes> = {};
        filteredCakes.forEach((c) => {
            if (!grouped[c.fecha]) grouped[c.fecha] = [];
            grouped[c.fecha].push(c);
        });
        const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        return dates.map((date) => ({ date, items: grouped[date] }));
    }, [filteredCakes]);

    const selectedCake: Cake | null = useMemo(
        () => cakes.find((c) => c.id === selectedCakeId) || null,
        [cakes, selectedCakeId],
    );

    useEffect(() => {
        setSaleAmountInput(
            selectedCake?.montoVenta != null
                ? selectedCake.montoVenta.toString()
                : '',
        );
    }, [selectedCake?.id, selectedCake?.montoVenta]);

    const selectedCakeLines = useMemo(
        () => {
            if (!selectedCake) return [];
            return selectedCake.ingredientes.map((usage) => {
                const ing = ingredients.find((x) => x.id === usage.ingredientId);
                const nombre = ing ? ing.nombre : 'Ingrediente eliminado';
                const unidad = ing?.unidad;
                const costoUnidad = ing?.costoPorUnidad ?? 0;
                const unitPrice =
                    usage.costoLinea != null && !Number.isNaN(usage.costoLinea)
                        ? usage.costoLinea
                        : costoUnidad;
                const subtotal = unitPrice * usage.cantidad;
                return {
                    id: usage.ingredientId,
                    nombre,
                    cantidad: usage.cantidad,
                    unidad,
                    costoUnitario: unitPrice,
                    subtotal,
                };
            });
        },
        [selectedCake, ingredients],
    );

    const selectedCakeGain = useMemo(() => {
        if (!selectedCake || selectedCake.montoVenta == null) {
            return null;
        }

        return selectedCake.montoVenta - selectedCake.costoTotal;
    }, [selectedCake]);

    const ingredientMap = useMemo(
        () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
        [ingredients],
    );

    const buildSummary = (periodCakes: Cake[], label: string) => {
        const kBreakdown = periodCakes.reduce<SummaryKBreakdownCake[]>((acc, cake) => {
            const items = cake.ingredientes.reduce<SummaryKBreakdownItem[]>((usageAcc, usage) => {
                const ingredient = ingredientMap.get(usage.ingredientId);

                if (!ingredient?.esMontoK) {
                    return usageAcc;
                }

                const unitPrice = usage.costoLinea != null && !Number.isNaN(usage.costoLinea)
                    ? usage.costoLinea
                    : ingredient.costoPorUnidad;

                usageAcc.push({
                    ingredientId: usage.ingredientId,
                    nombre: ingredient.nombre,
                    cantidad: usage.cantidad,
                    unidad: ingredient.unidad,
                    costoUnitario: unitPrice,
                    subtotal: unitPrice * usage.cantidad,
                });

                return usageAcc;
            }, []);

            if (!items.length) {
                return acc;
            }

            acc.push({
                cakeId: cake.id,
                cakeNombre: cake.nombre || 'Torta sin nombre',
                cliente: cake.cliente,
                fecha: cake.fecha,
                total: items.reduce((sum, item) => sum + item.subtotal, 0),
                items,
            });

            return acc;
        }, []);

        const kGroupedMap = new Map<string, SummaryKGroupedItem>();

        kBreakdown.forEach((cake) => {
            cake.items.forEach((item) => {
                const existing = kGroupedMap.get(item.ingredientId);

                if (!existing) {
                    kGroupedMap.set(item.ingredientId, {
                        ingredientId: item.ingredientId,
                        nombre: item.nombre,
                        unidad: item.unidad,
                        totalCantidad: item.cantidad,
                        totalSubtotal: item.subtotal,
                        cakesCount: 0,
                        usagesCount: 1,
                    });
                    return;
                }

                existing.totalCantidad += item.cantidad;
                existing.totalSubtotal += item.subtotal;
                existing.usagesCount += 1;
            });
        });

        const kGrouped = Array.from(kGroupedMap.values()).map((grouped) => ({
            ...grouped,
            cakesCount: kBreakdown.filter((cake) => cake.items.some((item) => item.ingredientId === grouped.ingredientId)).length,
        })).sort((a, b) => b.totalSubtotal - a.totalSubtotal);

        const totalCost = periodCakes.reduce((acc, cake) => acc + cake.costoTotal, 0);
        const totalSale = periodCakes.reduce((acc, cake) => acc + (cake.montoVenta ?? 0), 0);
        const totalK = kBreakdown.reduce((acc, cake) => acc + cake.total, 0);

        return {
            label,
            totalCost,
            totalSale,
            totalGain: totalSale - totalCost,
            totalK,
            kBreakdown,
            kGrouped,
            totalCakes: periodCakes.length,
        };
    };

    const weekSummary = useMemo(() => {
        const range = getWeekRange(selectedDate);
        const periodCakes = filteredCakes.filter(
            (cake) => cake.fecha >= range.startKey && cake.fecha <= range.endKey,
        );
        return buildSummary(periodCakes, `Semana ${formatShortDate(range.start)} - ${formatShortDate(range.end)}`);
    }, [filteredCakes, ingredientMap, selectedDate]);

    const monthSummary = useMemo(() => {
        const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}`;
        const periodCakes = filteredCakes.filter((cake) => cake.fecha.startsWith(monthKey));
        return buildSummary(periodCakes, `${monthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`);
    }, [filteredCakes, ingredientMap, visibleMonth]);

    const rangeSummary = useMemo(() => {
        let label = 'Rango filtrado';

        if (normalizedDateRange.start && normalizedDateRange.end) {
            label = `${formatDisplayDate(normalizedDateRange.start)} - ${formatDisplayDate(normalizedDateRange.end)}`;
        } else if (normalizedDateRange.start) {
            label = `Desde ${formatDisplayDate(normalizedDateRange.start)}`;
        } else if (normalizedDateRange.end) {
            label = `Hasta ${formatDisplayDate(normalizedDateRange.end)}`;
        }

        return buildSummary(filteredCakes, label);
    }, [filteredCakes, ingredientMap, normalizedDateRange.end, normalizedDateRange.start]);

    const activeSummary = hasDateRangeFilter
        ? rangeSummary
        : (summaryMode === 'semana' ? weekSummary : monthSummary);

    // Cambia el mes visible en el calendario (anterior/siguiente).
    const handleChangeMonth = (delta: number) => {
        setVisibleMonth((prev) => {
            const year = prev.getFullYear();
            const month = prev.getMonth() + delta;
            return new Date(year, month, 1);
        });
    };

    // Cambia el estado pagada/entregada de una torta.
    const handleToggleCakeStatus = async (
        cakeId: string,
        field: 'pagada' | 'entregada',
        nextValue: boolean,
    ) => {
        await updateCakeStatus(cakeId, { [field]: nextValue });
    };

    // Guarda el monto de venta editado en el detalle de la torta seleccionada.
    const handleSaveSaleAmount = async () => {
        if (!selectedCake || isSavingSaleAmount) {
            return;
        }

        const rawValue = saleAmountInput.trim().replace(',', '.');

        if (!rawValue) {
            setIsSavingSaleAmount(true);
            const synced = await updateCakeSaleAmount(selectedCake.id, undefined);
            setIsSavingSaleAmount(false);

            if (!synced) {
                Alert.alert(
                    'Monto actualizado localmente',
                    'No se pudo sincronizar con Firebase en este momento.',
                );
            }
            return;
        }

        const parsedAmount = Number(rawValue);
        if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
            Alert.alert('Monto inválido', 'Ingresa un monto de venta válido.');
            return;
        }

        setIsSavingSaleAmount(true);
        const synced = await updateCakeSaleAmount(selectedCake.id, parsedAmount);
        setIsSavingSaleAmount(false);

        if (!synced) {
            Alert.alert(
                'Monto actualizado localmente',
                'No se pudo sincronizar con Firebase en este momento.',
            );
        }
    };

    // Crea un borrador a partir de una torta existente y navega a "Agregar".
    const handleDuplicateCake = (cake: Cake) => {
        const draft: AddCakeDraft = {
            nombre: cake.nombre,
            cliente: cake.cliente,
            fecha: cake.fecha,
            forma: cake.forma,
            tamanio: cake.tamanio,
            notas: cake.notas,
            fotoUri: cake.fotoUri,
            montoVenta: cake.montoVenta,
            ingredientesUsados: cake.ingredientes.map((item) => ({
                ingredientId: item.ingredientId,
                cantidad: item.cantidad,
                costoLinea: item.costoLinea,
            })),
        };

        setSelectedCakeId(null);
        setPhotoZoomed(false);
        navigation.navigate('Agregar', {
            duplicateCake: draft,
            duplicateSourceId: `${cake.id}-${Date.now()}`,
        });
    };

    // Guarda una fecha seleccionada en el rango del filtro.
    const handleRangeDateChange = (field: 'from' | 'to') => (
        event: DateTimePickerEvent,
        selectedDate?: Date,
    ) => {
        if (field === 'from') {
            setShowDateFromPicker(false);
        } else {
            setShowDateToPicker(false);
        }

        if (event.type !== 'set' || !selectedDate) {
            return;
        }

        const nextValue = formatDateKey(selectedDate);

        if (field === 'from') {
            setDateFrom(nextValue);
            return;
        }

        setDateTo(nextValue);
    };

    const renderCakeStatusBadges = (cake: Cake) => {
        if (!cake.pagada && !cake.entregada) {
            return null;
        }

        return (
            <View style={styles.cakeStatusBadgeRow}>
                {cake.pagada && (
                    <View style={[styles.cakeStatusBadge, styles.cakeStatusBadgePaid]}>
                        <Text style={styles.cakeStatusBadgeText}>Pagada</Text>
                    </View>
                )}
                {cake.entregada && (
                    <View style={[styles.cakeStatusBadge, styles.cakeStatusBadgeDelivered]}>
                        <Text style={styles.cakeStatusBadgeText}>Entregada</Text>
                    </View>
                )}
            </View>
        );
    };

    const monthLabel = `${monthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

    const renderSelectedCakeLines = () => {
        if (!selectedCakeLines.length) {
            return <Text style={styles.detailHintText}>No hay ingredientes detallados.</Text>;
        }

        return (
            <View style={styles.detailLinesContainer}>
                {selectedCakeLines.map((line) => (
                    <View key={line.id} style={styles.detailLineRow}>
                        <View style={styles.detailLineInfo}>
                            <Text style={styles.detailLineText}>{line.nombre}</Text>
                            <Text style={styles.detailLineMeta}>
                                {line.cantidad} {line.unidad || 'unidad'}
                                {` • $${line.costoUnitario.toFixed(2)} c/u`}
                            </Text>
                        </View>
                        <Text style={styles.detailLineCost}>
                            {`$${line.subtotal.toFixed(2)}`}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderKBreakdown = () => {
        if (!activeSummary.kBreakdown.length) {
            return <Text style={styles.kBreakdownEmptyText}>No hay conceptos K en este resumen.</Text>;
        }

        return activeSummary.kBreakdown.map((cake) => (
            <View key={cake.cakeId} style={styles.kBreakdownCakeCard}>
                <View style={styles.kBreakdownCakeHeader}>
                    <View style={styles.kBreakdownCakeInfo}>
                        <Text style={styles.kBreakdownCakeTitle}>{cake.cakeNombre}</Text>
                        <Text style={styles.kBreakdownCakeMeta}>
                            {cake.fecha}
                            {cake.cliente ? ` • ${cake.cliente}` : ''}
                        </Text>
                    </View>
                    <Text style={styles.kBreakdownCakeTotal}>${cake.total.toFixed(2)}</Text>
                </View>

                <View style={styles.kBreakdownItemsList}>
                    {cake.items.map((item) => (
                        <View key={`${cake.cakeId}-${item.ingredientId}`} style={styles.kBreakdownItemRow}>
                            <View style={styles.kBreakdownItemInfo}>
                                <Text style={styles.kBreakdownItemName}>{item.nombre}</Text>
                                <Text style={styles.kBreakdownItemMeta}>
                                    {item.cantidad} {item.unidad || 'unidad'}
                                    {` • $${item.costoUnitario.toFixed(2)} c/u`}
                                </Text>
                            </View>
                            <Text style={styles.kBreakdownItemTotal}>${item.subtotal.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        ));
    };

    const renderKGroupedSummary = () => {
        if (!activeSummary.kGrouped.length) {
            return null;
        }

        return activeSummary.kGrouped.map((item) => (
            <View key={item.ingredientId} style={styles.kGroupedItemCard}>
                <View style={styles.kGroupedItemHeader}>
                    <View style={styles.kGroupedItemInfo}>
                        <Text style={styles.kGroupedItemTitle}>{item.nombre}</Text>
                        <Text style={styles.kGroupedItemMeta}>
                            {item.totalCantidad} {item.unidad || 'unidad'}
                            {` • ${item.cakesCount} torta(s)`}
                            {` • ${item.usagesCount} registro(s)`}
                        </Text>
                    </View>
                    <Text style={styles.kGroupedItemTotal}>${item.totalSubtotal.toFixed(2)}</Text>
                </View>
            </View>
        ));
    };

    return (
        <View style={styles.container}>

            <View style={styles.viewModeRow}>
                <Pressable
                    style={[
                        styles.viewModeButton,
                        viewMode === 'mes' && styles.viewModeButtonActive,
                    ]}
                    onPress={() => setViewMode('mes')}
                >
                    <Text
                        style={[
                            styles.viewModeButtonText,
                            viewMode === 'mes' && styles.viewModeButtonTextActive,
                        ]}
                    >
                        Mes
                    </Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.viewModeButton,
                        viewMode === 'agenda' && styles.viewModeButtonActive,
                    ]}
                    onPress={() => setViewMode('agenda')}
                >
                    <Text
                        style={[
                            styles.viewModeButtonText,
                            viewMode === 'agenda' && styles.viewModeButtonTextActive,
                        ]}
                    >
                        Agenda
                    </Text>
                </Pressable>
            </View>

            {showFilters && (
                <View style={styles.filtersOverlay}>
                    <Pressable
                        style={styles.filtersBackdrop}
                        onPress={() => setShowFilters(false)}
                    />

                    <View style={styles.filtersCard}>
                        <View style={styles.filtersHeaderRow}>
                            <View>
                                <Text style={styles.filtersTitle}>Filtros</Text>
                                <Text style={styles.filtersSubtitle}>Busca, filtra por fecha, estado y forma</Text>
                            </View>

                            <Pressable
                                style={styles.filtersCloseButton}
                                onPress={() => setShowFilters(false)}
                            >
                                <Ionicons name="close" size={18} color="#a54d75" />
                            </Pressable>
                        </View>

                        <View style={styles.filtersSection}>
                            <Text style={styles.filtersSectionLabel}>Cliente</Text>
                            <View style={styles.searchBox}>
                                <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
                                <TextInput
                                    placeholder="Buscar cliente"
                                    placeholderTextColor="#888"
                                    value={searchCliente}
                                    onChangeText={setSearchCliente}
                                    style={styles.filterInput}
                                    selectionColor="#e91e63"
                                    cursorColor="#e91e63"
                                    underlineColorAndroid="transparent"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <View style={styles.filtersSection}>
                            <Text style={styles.filtersSectionLabel}>Rango de fechas</Text>
                            <View style={styles.filterRow}>
                                <Pressable
                                    style={styles.dateRangeButton}
                                    onPress={() => setShowDateFromPicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={16} color="#a54d75" />
                                    <Text
                                        style={[
                                            styles.dateRangeButtonText,
                                            !dateFrom && styles.dateRangeButtonPlaceholder,
                                        ]}
                                    >
                                        {dateFrom ? formatDisplayDate(dateFrom) : 'Desde'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={styles.dateRangeButton}
                                    onPress={() => setShowDateToPicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={16} color="#a54d75" />
                                    <Text
                                        style={[
                                            styles.dateRangeButtonText,
                                            !dateTo && styles.dateRangeButtonPlaceholder,
                                        ]}
                                    >
                                        {dateTo ? formatDisplayDate(dateTo) : 'Hasta'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.filtersSection}>
                            <Text style={styles.filtersSectionLabel}>Estado</Text>
                            <View style={styles.statusFilterRow}>
                                {[
                                    { label: 'Todas', value: 'todas' },
                                    { label: 'Pagadas', value: 'pagadas' },
                                    { label: 'Entregadas', value: 'entregadas' },
                                    { label: 'Pendientes', value: 'pendientes' },
                                ].map((option) => (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => setStatusFilter(option.value as typeof statusFilter)}
                                        style={[
                                            styles.statusFilterButton,
                                            statusFilter === option.value && styles.statusFilterButtonActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusFilterButtonText,
                                                statusFilter === option.value && styles.statusFilterButtonTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filtersSection}>
                            <Text style={styles.filtersSectionLabel}>Forma</Text>
                            <View style={styles.shapeFilterGrid}>
                                <Pressable
                                    onPress={() => setFiltroForma('todas')}
                                    style={[
                                        styles.shapeFilterButton,
                                        filtroForma === 'todas' && styles.shapeButtonActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.shapeButtonText,
                                            filtroForma === 'todas' && styles.shapeButtonTextActive,
                                        ]}
                                    >
                                        Todas
                                    </Text>
                                </Pressable>
                                {shapeOptions.map((opt) => (
                                    <Pressable
                                        key={opt.value}
                                        onPress={() => setFiltroForma(opt.value)}
                                        style={[
                                            styles.shapeFilterButton,
                                            filtroForma === opt.value && styles.shapeButtonActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.shapeButtonText,
                                                filtroForma === opt.value && styles.shapeButtonTextActive,
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filtersActionsRow}>
                            <Pressable
                                style={styles.filtersResetButton}
                                onPress={() => {
                                    setSearchCliente('');
                                    setDateFrom('');
                                    setDateTo('');
                                    setStatusFilter('todas');
                                    setFiltroForma('todas');
                                }}
                            >
                                <Text style={styles.filtersResetButtonText}>Limpiar</Text>
                            </Pressable>

                            <Pressable
                                style={styles.filtersApplyButton}
                                onPress={() => setShowFilters(false)}
                            >
                                <Text style={styles.filtersApplyButtonText}>Listo</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.summaryCard}>
                <View style={styles.summaryHeaderRow}>
                    <View>
                        <Text style={styles.summaryTitle}>Resumen total</Text>
                        <Text style={styles.summarySubtitle}>{activeSummary.label}</Text>
                    </View>

                    {hasDateRangeFilter ? (
                        <View style={[styles.summaryToggleButton, styles.summaryToggleButtonActive]}>
                            <Text style={[styles.summaryToggleButtonText, styles.summaryToggleButtonTextActive]}>
                                Rango
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.summaryToggleRow}>
                            <Pressable
                                style={[
                                    styles.summaryToggleButton,
                                    summaryMode === 'semana' && styles.summaryToggleButtonActive,
                                ]}
                                onPress={() => setSummaryMode('semana')}
                            >
                                <Text
                                    style={[
                                        styles.summaryToggleButtonText,
                                        summaryMode === 'semana' && styles.summaryToggleButtonTextActive,
                                    ]}
                                >
                                    Semana
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.summaryToggleButton,
                                    summaryMode === 'mes' && styles.summaryToggleButtonActive,
                                ]}
                                onPress={() => setSummaryMode('mes')}
                            >
                                <Text
                                    style={[
                                        styles.summaryToggleButtonText,
                                        summaryMode === 'mes' && styles.summaryToggleButtonTextActive,
                                    ]}
                                >
                                    Mes
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {!summaryHidden ? (
                    <>
                        <View style={styles.summaryMetricsGrid}>
                            <View style={styles.summaryMetricCard}>
                                <Text style={styles.summaryMetricLabel}>Costo total</Text>
                                <Text style={styles.summaryMetricValue}>${activeSummary.totalCost.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryMetricCard}>
                                <Text style={styles.summaryMetricLabel}>Venta total</Text>
                                <Text style={styles.summaryMetricValue}>${activeSummary.totalSale.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryMetricCard}>
                                <Text style={styles.summaryMetricLabel}>Ganancia total</Text>
                                <Text style={styles.summaryMetricValue}>${activeSummary.totalGain.toFixed(2)}</Text>
                            </View>
                            <Pressable
                                style={[
                                    styles.summaryMetricCard,
                                    styles.summaryMetricCardInteractive,
                                    activeSummary.totalK <= 0 && styles.summaryMetricCardDisabled,
                                ]}
                                onPress={() => activeSummary.totalK > 0 && setShowKBreakdown(true)}
                                disabled={activeSummary.totalK <= 0}
                            >
                                <Text style={styles.summaryMetricLabel}>Monto K</Text>
                                <Text style={[styles.summaryMetricValue, styles.summaryMetricAccent]}>${activeSummary.totalK.toFixed(2)}</Text>
                                <Text style={styles.summaryMetricHint}>
                                    {activeSummary.totalK > 0 ? 'Tocar para ver detalle' : 'Sin conceptos K'}
                                </Text>
                            </Pressable>
                        </View>
                        <View style={styles.summaryFooterRow}>
                            <Text style={styles.summaryMeta}>{activeSummary.totalCakes} torta(s) dentro del resumen.</Text>
                            <Pressable
                                style={styles.summaryCollapseButton}
                                onPress={() => setSummaryHidden(true)}
                            >
                                <Ionicons name="chevron-up" size={14} color="#a54d75" />
                            </Pressable>
                        </View>
                    </>
                ) : (
                    <View style={styles.summaryFooterRowCompact}>
                        <Pressable
                            style={styles.summaryCollapseButton}
                            onPress={() => setSummaryHidden(false)}
                        >
                            <Ionicons name="chevron-down" size={14} color="#a54d75" />
                        </Pressable>
                    </View>
                )}

            </View>

            {viewMode === 'mes' && (
                <View style={styles.monthViewContainer}>
                    <View style={styles.calendarBlock}>
                        <View style={styles.calendarHeader}>
                            <Pressable onPress={() => handleChangeMonth(-1)} style={styles.calendarNavButton}>
                                <Text style={styles.calendarNavText}>{'<'}</Text>
                            </Pressable>
                            <Text style={styles.calendarMonth}>{monthLabel}</Text>
                            <Pressable onPress={() => handleChangeMonth(1)} style={styles.calendarNavButton}>
                                <Text style={styles.calendarNavText}>{'>'}</Text>
                            </Pressable>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.calendarDaysRow}
                            contentContainerStyle={styles.calendarDaysContent}
                        >
                            {daysInMonth.map((d) => {
                                const isSelected = d.key === selectedDate;
                                return (
                                    <Pressable
                                        key={d.key}
                                        onPress={() => setSelectedDate(d.key)}
                                        style={[
                                            styles.dayChip,
                                            isSelected && styles.dayChipSelected,
                                        ]}
                                    >
                                        <Text style={styles.dayChipWeek}>{d.weekday}</Text>
                                        <Text style={styles.dayChipLabel}>{d.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View style={styles.daySection}>
                        <Text style={styles.daySectionDate}>{selectedDate}</Text>

                        <ScrollView
                            style={styles.monthListScroll}
                            contentContainerStyle={styles.monthListContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {cakesBySelectedDate.length === 0 ? (
                                <Text style={styles.emptyText}>No hay tortas registradas este día.</Text>
                            ) : (
                                cakesBySelectedDate.map((item) => (
                                    <Pressable
                                        key={item.id}
                                        style={styles.cakeRow}
                                        onPress={() => setSelectedCakeId(item.id)}
                                    >
                                        <View
                                            style={[
                                                styles.clientDot,
                                                { backgroundColor: getCakeAccentColor(item) },
                                            ]}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cakeName}>{item.nombre || 'Sin nombre'}</Text>
                                            <Text style={styles.cakeSubtitle}>
                                                {item.cliente ? `${item.cliente} • ` : ''}
                                                {item.forma} {item.tamanio ? `• ${item.tamanio}` : ''}
                                            </Text>
                                            {renderCakeStatusBadges(item)}
                                            {item.montoVenta != null && (
                                                <Text style={styles.cakeProfitText}>
                                                    Ganancia: ${(item.montoVenta - item.costoTotal).toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.cakeCost,
                                            item.pagada && styles.cakeCostPaid,
                                            item.entregada && !item.pagada && styles.cakeCostDelivered,
                                        ]}>${item.costoTotal.toFixed(2)}</Text>
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            )}

            {viewMode === 'agenda' && (
                <ScrollView style={{ flex: 1 }}>
                    {agendaSections.length === 0 ? (
                        <Text style={styles.emptyText}>No hay tortas registradas.</Text>
                    ) : (
                        agendaSections.map((section) => (
                            <View key={section.date}>
                                <Text style={styles.sectionTitle}>{section.date}</Text>
                                {section.items.map((item) => (
                                    <Pressable
                                        key={item.id}
                                        style={styles.cakeRow}
                                        onPress={() => setSelectedCakeId(item.id)}
                                    >
                                        <View
                                            style={[
                                                styles.clientDot,
                                                { backgroundColor: getCakeAccentColor(item) },
                                            ]}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cakeName}>{item.nombre || 'Sin nombre'}</Text>
                                            <Text style={styles.cakeSubtitle}>
                                                {item.cliente ? `${item.cliente} • ` : ''}
                                                {item.forma} {item.tamanio ? `• ${item.tamanio}` : ''}
                                            </Text>
                                            {renderCakeStatusBadges(item)}
                                            {item.montoVenta != null && (
                                                <Text style={styles.cakeProfitText}>
                                                    Ganancia: ${(item.montoVenta - item.costoTotal).toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.cakeCost,
                                            item.pagada && styles.cakeCostPaid,
                                            item.entregada && !item.pagada && styles.cakeCostDelivered,
                                        ]}>${item.costoTotal.toFixed(2)}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {showDateFromPicker && (
                <DateTimePicker
                    value={dateFrom ? parseDateKey(dateFrom) : today}
                    mode="date"
                    display="default"
                    onChange={handleRangeDateChange('from')}
                />
            )}

            {showDateToPicker && (
                <DateTimePicker
                    value={dateTo ? parseDateKey(dateTo) : today}
                    mode="date"
                    display="default"
                    onChange={handleRangeDateChange('to')}
                />
            )}

            {showKBreakdown && (
                <View style={styles.detailOverlay}>
                    <View style={styles.kBreakdownModalCard}>
                        <View style={styles.kBreakdownModalHeader}>
                            <View>
                                <Text style={styles.kBreakdownModalTitle}>Desglose monto K</Text>
                                <Text style={styles.kBreakdownModalSubtitle}>{activeSummary.label}</Text>
                            </View>
                            <Pressable onPress={() => setShowKBreakdown(false)}>
                                <Text style={styles.detailCloseText}>Cerrar</Text>
                            </Pressable>
                        </View>

                        <View style={styles.kBreakdownTotalBox}>
                            <Text style={styles.kBreakdownTotalLabel}>Total a pagar al ayudante</Text>
                            <Text style={styles.kBreakdownTotalValue}>${activeSummary.totalK.toFixed(2)}</Text>
                        </View>

                        <ScrollView
                            style={styles.kBreakdownScroll}
                            contentContainerStyle={styles.kBreakdownScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.kBreakdownSection}>
                                <Text style={styles.kBreakdownSectionTitle}>Resumen por concepto</Text>

                                <View style={styles.kGroupedList}>
                                    {renderKGroupedSummary()}
                                </View>
                            </View>

                            <View style={styles.kBreakdownSection}>
                                <Text style={styles.kBreakdownSectionTitle}>Detalle por torta</Text>

                            </View>
                            {renderKBreakdown()}
                        </ScrollView>
                    </View>
                </View>
            )}

            {selectedCake && (
                <View style={styles.detailOverlay}>
                    <View style={styles.detailCard}>
                        <View style={styles.detailHeaderRow}>
                            <View>
                                <Text style={styles.detailDate}>{selectedCake.fecha}</Text>
                                <Text style={styles.detailClient}>{selectedCake.cliente || 'Sin cliente'}</Text>
                            </View>
                            <Pressable onPress={() => setSelectedCakeId(null)}>
                                <Text style={styles.detailCloseText}>Cerrar</Text>
                            </Pressable>
                        </View>

                        <View style={styles.detailTopSection}>
                            <View style={styles.detailTitleBlock}>
                                <Text style={styles.detailTitle}>{selectedCake.nombre || 'Torta'}</Text>
                                <Text style={styles.detailTopMeta}>
                                    {selectedCakeLines.length} ingrediente{selectedCakeLines.length === 1 ? '' : 's'}
                                </Text>
                            </View>

                            {selectedCake.fotoUri ? (
                                <Pressable onPress={() => setPhotoZoomed(true)} style={styles.detailPhotoCompactWrapper}>
                                    <Image
                                        source={{ uri: selectedCake.fotoUri }}
                                        style={styles.detailPhotoCompact}
                                        resizeMode="cover"
                                    />
                                </Pressable>
                            ) : null}
                        </View>

                        <View style={styles.cakeStatusRow}>
                            <Pressable
                                style={[
                                    styles.cakeStatusButton,
                                    selectedCake.pagada && styles.cakeStatusButtonPaid,
                                ]}
                                onPress={() => handleToggleCakeStatus(
                                    selectedCake.id,
                                    'pagada',
                                    !selectedCake.pagada,
                                )}
                            >
                                <Ionicons
                                    name={selectedCake.pagada ? 'cash' : 'cash-outline'}
                                    size={16}
                                    color={selectedCake.pagada ? '#fff' : '#a84a72'}
                                />
                                <Text
                                    style={[
                                        styles.cakeStatusButtonText,
                                        selectedCake.pagada && styles.cakeStatusButtonTextActive,
                                    ]}
                                >
                                    {selectedCake.pagada ? 'Pagada' : 'Marcar pagada'}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.cakeStatusButton,
                                    selectedCake.entregada && styles.cakeStatusButtonDelivered,
                                ]}
                                onPress={() => handleToggleCakeStatus(
                                    selectedCake.id,
                                    'entregada',
                                    !selectedCake.entregada,
                                )}
                            >
                                <Ionicons
                                    name={selectedCake.entregada ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                    size={16}
                                    color={selectedCake.entregada ? '#fff' : '#2b8a5b'}
                                />
                                <Text
                                    style={[
                                        styles.cakeStatusButtonText,
                                        selectedCake.entregada && styles.cakeStatusButtonTextActive,
                                    ]}
                                >
                                    {selectedCake.entregada ? 'Entregada' : 'Marcar entregada'}
                                </Text>
                            </Pressable>
                        </View>

                        <Pressable
                            style={styles.duplicateCakeButton}
                            onPress={() => handleDuplicateCake(selectedCake)}
                        >
                            <Ionicons name="copy-outline" size={16} color="#e91e63" />
                            <Text style={styles.duplicateCakeButtonText}>Duplicar torta</Text>
                        </Pressable>



                        <ScrollView
                            style={styles.detailIngredientsScroll}
                            contentContainerStyle={styles.detailIngredientsContent}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                        >
                            {renderSelectedCakeLines()}
                        </ScrollView>

                        <View style={styles.detailFooterPanel}>
                            <Text style={styles.saleEditorLabel}>Monto de venta</Text>
                            <View style={styles.saleEditorRow}>
                                <View style={styles.saleInputWrapper}>
                                    <Text style={styles.saleCurrencyPrefix}>$</Text>
                                    <TextInput
                                        value={saleAmountInput}
                                        onChangeText={setSaleAmountInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#9b7b8d"
                                        keyboardType="decimal-pad"
                                        style={styles.saleAmountInput}
                                        editable={!isSavingSaleAmount}
                                    />
                                </View>

                                <Pressable
                                    style={[
                                        styles.saleSaveButton,
                                        isSavingSaleAmount && styles.saleSaveButtonDisabled,
                                    ]}
                                    onPress={handleSaveSaleAmount}
                                    disabled={isSavingSaleAmount}
                                >
                                    <Text style={styles.saleSaveButtonText}>
                                        {isSavingSaleAmount ? 'Guardando...' : 'Guardar'}
                                    </Text>
                                </Pressable>
                            </View>

                            <View style={styles.detailTotalRow}>
                                <Text style={styles.detailTotalLabel}>COSTO</Text>
                                <Text style={styles.detailTotalValue}>
                                    {`$${selectedCake.costoTotal.toFixed(2)}`}
                                </Text>
                            </View>

                            {selectedCake.montoVenta != null ? (
                                <>
                                    <View style={styles.detailMetricRow}>
                                        <Text style={styles.detailMetricLabel}>GANANCIA</Text>
                                        <Text
                                            style={[
                                                styles.detailMetricValue,
                                                styles.detailProfitValue,
                                                selectedCakeGain != null && selectedCakeGain < 0 && styles.detailLossValue,
                                            ]}
                                        >
                                            {selectedCakeGain != null ? `$${selectedCakeGain.toFixed(2)}` : '$0.00'}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.detailHintText}>
                                    Guarda el monto de venta para ver la ganancia.
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {selectedCake && photoZoomed && selectedCake.fotoUri && (
                <Pressable
                    style={styles.detailOverlay}
                    onPress={() => setPhotoZoomed(false)}
                >
                    <Image
                        source={{ uri: selectedCake.fotoUri }}
                        style={{ width: '90%', height: '70%', borderRadius: 8 }}
                        resizeMode="contain"
                    />
                </Pressable>
            )}
        </View>
    );
};

export default CakesScreen;
