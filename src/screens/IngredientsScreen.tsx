import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ListRenderItem,
  Pressable,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../store/AppState';
import { Ingredient } from '../types';
import { ingredientsStyles as styles } from '../styles/ingredientsStyles';

const IngredientsScreen: React.FC = () => {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useAppState();

  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('unidad');
  const [costo, setCosto] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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
    };

    if (editingId) {
      updateIngredient(editingId, payload);
    } else {
      addIngredient(payload);
    }

    setNombre('');
    setCosto('');
    setUnidad('unidad');
    setEditingId(null);
  };

  // Carga un ingrediente en el formulario para poder editarlo.
  const handleSelect = (item: Ingredient) => {
    setNombre(item.nombre);
    setUnidad(item.unidad);
    setCosto(String(item.costoPorUnidad));
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
          }
        },
      },
    ]);
  };

  const renderItem: ListRenderItem<Ingredient> = ({ item }) => (
    <View style={styles.itemRow}>
      <Pressable style={{ flex: 1 }} onPress={() => handleSelect(item)}>
        <Text style={styles.itemName}>{item.nombre}</Text>
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
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Todavía no agregaste ingredientes.</Text>
          }
        />
      </View>
    </TouchableWithoutFeedback>
  );
};
export default IngredientsScreen;
