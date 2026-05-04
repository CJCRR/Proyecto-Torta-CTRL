import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ListRenderItem,
  Pressable,
  Alert,
  Keyboard,
  Switch,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../store/AppState';
import { Ingredient } from '../types';
import type { RootTabParamList } from '../../App';
import { ingredientsStyles as styles } from '../styles/ingredientsStyles';

type IngredientsNav = import('@react-navigation/native').NavigationProp<RootTabParamList, 'Ingredientes'>;

const IngredientsScreen: React.FC = () => {
  const navigation = useNavigation<IngredientsNav>();
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useAppState();

  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('unidad');
  const [costo, setCosto] = useState('');
  const [esMontoK, setEsMontoK] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchIngredient, setSearchIngredient] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActionsRow}>
          <Pressable
            onPress={() => setShowSearch((prev) => !prev)}
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

  // Crea o actualiza un ingrediente según si hay uno seleccionado.
  const handleSubmit = () => {
    const costoNumber = Number(costo.replace(',', '.'));
    if (!nombre.trim() || isNaN(costoNumber)) {
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      unidad: unidad.trim() || 'unidad',
      costoPorUnidad: costoNumber,
      esMontoK,
    };

    if (editingId) {
      updateIngredient(editingId, payload);
    } else {
      addIngredient(payload);
    }

    setNombre('');
    setCosto('');
    setUnidad('unidad');
    setEsMontoK(false);
    setEditingId(null);
  };

  // Carga un ingrediente en el formulario para poder editarlo.
  const handleSelect = (item: Ingredient) => {
    setNombre(item.nombre);
    setUnidad(item.unidad);
    setCosto(String(item.costoPorUnidad));
    setEsMontoK(Boolean(item.esMontoK));
    setEditingId(item.id);
  };

  // Si se borran todos los campos mientras se estaba editando,
  // volvemos al modo "Agregar ingrediente" automáticamente.
  useEffect(() => {
    if (editingId && !nombre.trim() && !unidad.trim() && !costo.trim()) {
      setEditingId(null);
    }
  }, [editingId, nombre, unidad, costo]);

  // Pregunta confirmación y elimina el ingrediente elegido.
  const handleDelete = (item: Ingredient) => {
    Alert.alert('Eliminar ingrediente', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteIngredient(item.id);
          if (editingId === item.id) {
            setEditingId(null);
            setNombre('');
            setUnidad('unidad');
            setCosto('');
            setEsMontoK(false);
          }
        },
      },
    ]);
  };

  const filteredIngredients = useMemo(() => {
    const query = searchIngredient.trim().toLowerCase();

    if (!query) {
      return ingredients;
    }

    return ingredients.filter((item) => item.nombre.toLowerCase().includes(query));
  }, [ingredients, searchIngredient]);

  const renderItem: ListRenderItem<Ingredient> = ({ item }) => (
    <View style={styles.itemRow}>
      <Pressable style={{ flex: 1 }} onPress={() => handleSelect(item)}>
        <View style={styles.itemNameRow}>
          <Text style={styles.itemName}>{item.nombre}</Text>
          {item.esMontoK ? <Text style={styles.kBadge}>K</Text> : null}
        </View>
        <Text style={styles.itemSubtitle}>
          {item.costoPorUnidad} por {item.unidad}
        </Text>
      </Pressable>
      <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={16} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>

        <View style={styles.form}>
          <TextInput
            placeholder="Nombre (ej. Harina)"
            value={nombre}
            onChangeText={setNombre}
            placeholderTextColor="#b5a0c5"
            style={styles.input}
          />
          <TextInput
            placeholder="Unidad (ej. kg, unidad)"
            value={unidad}
            onChangeText={setUnidad}
            placeholderTextColor="#b5a0c5"
            style={styles.input}
          />
          <TextInput
            placeholder="Costo por unidad"
            value={costo}
            onChangeText={setCosto}
            keyboardType="numeric"
            placeholderTextColor="#b5a0c5"
            style={styles.input}
          />
          <View style={styles.kSwitchRow}>
            <View style={styles.kSwitchTextBlock}>
              <Text style={styles.kSwitchLabel}>Monto K</Text>
              <Text style={styles.kSwitchHint}>Marca este ingrediente si se le paga al ayudante.</Text>
            </View>
            <Switch
              value={esMontoK}
              onValueChange={setEsMontoK}
              trackColor={{ false: '#ead4e0', true: '#f7a7c7' }}
              thumbColor={esMontoK ? '#e91e63' : '#f4f4f4'}
            />
          </View>
          <Pressable
            style={[styles.submitButton, editingId && styles.submitButtonEditing]}
            onPress={handleSubmit}
          >
            <Ionicons
              name={editingId ? 'create-outline' : 'add-circle-outline'}
              size={18}
              color="#fff"
            />
            <Text style={styles.submitButtonText}>
              {editingId ? 'Actualizar ingrediente' : 'Agregar ingrediente'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Lista de ingredientes</Text>
        {showSearch ? (
          <View style={styles.searchBox}>
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
        ) : null}
        <FlatList
          data={filteredIngredients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {ingredients.length === 0
                ? 'Todavía no agregaste ingredientes.'
                : 'No hay ingredientes que coincidan con la búsqueda.'}
            </Text>
          }
        />
      </View>
    </TouchableWithoutFeedback>
  );
};
export default IngredientsScreen;
