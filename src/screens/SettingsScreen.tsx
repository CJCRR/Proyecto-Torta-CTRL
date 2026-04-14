import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../store/AppState';
import { exportAppBackup, importAppBackup } from '../services/dataTransfer';
import { settingsStyles as styles } from '../styles/settingsStyles';

type PendingAction = 'export' | 'import' | 'clear' | null;

const SettingsScreen: React.FC = () => {
    const { ingredients, cakes, replaceAllData, clearAllData } = useAppState();
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);

    // Envuelve acciones largas de ajustes mostrando estado de carga y manejando errores.
    const runAction = async (action: Exclude<PendingAction, null>, work: () => Promise<void>) => {
        if (pendingAction) {
            return;
        }

        setPendingAction(action);
        try {
            await work();
        } catch (error) {
            console.error('Error en ajustes de datos:', error);
            Alert.alert('No se pudo completar la acción', 'Inténtalo de nuevo en unos segundos.');
        } finally {
            setPendingAction(null);
        }
    };

    // Genera un archivo JSON de respaldo y abre el menú de compartir.
    const handleExport = () => {
        void runAction('export', async () => {
            const result = await exportAppBackup(ingredients, cakes);

            Alert.alert(
                'Respaldo listo',
                result.shared
                    ? 'Se abrió el menú para compartir el archivo JSON de respaldo.'
                    : `Se creó el archivo de respaldo en ${result.fileUri}`,
            );
        });
    };

    // Pide confirmación e importa un archivo de respaldo seleccionado por el usuario.
    const handleImport = () => {
        Alert.alert(
            'Importar datos',
            'Esto reemplazará las tortas e ingredientes actuales de este teléfono por los del archivo seleccionado.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Importar',
                    onPress: () => {
                        void runAction('import', async () => {
                            const backup = await importAppBackup();

                            if (!backup) {
                                return;
                            }

                            const synced = await replaceAllData({
                                ingredients: backup.ingredients,
                                cakes: backup.cakes,
                            });

                            Alert.alert(
                                'Importación completada',
                                synced
                                    ? `Se importaron ${backup.cakes.length} tortas y ${backup.ingredients.length} ingredientes.`
                                    : 'Los datos se importaron localmente, pero no se pudo sincronizar todo con Firebase.',
                            );
                        });
                    },
                },
            ],
        );
    };

    // Pide confirmación y borra todos los datos locales (y en Firebase si es posible).
    const handleClear = () => {
        Alert.alert(
            'Borrar base de datos',
            'Se eliminarán todas las tortas e ingredientes de este teléfono y se intentará borrar lo sincronizado en Firebase.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar todo',
                    style: 'destructive',
                    onPress: () => {
                        void runAction('clear', async () => {
                            const remoteCleared = await clearAllData({ deleteRemote: true });

                            Alert.alert(
                                'Datos eliminados',
                                remoteCleared
                                    ? 'Se borraron los datos locales y los documentos conocidos en Firebase.'
                                    : 'Se borraron los datos locales, pero no se pudo borrar todo en Firebase.',
                            );
                        });
                    },
                },
            ],
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View>
                <Text style={styles.title}>Ajustes</Text>
                <Text style={styles.subtitle}>Respaldo, migración y borrado de datos</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Estado actual</Text>
                <Text style={styles.sectionText}>
                    Antes de cambiar de teléfono, exporta un respaldo en el viejo y luego impórtalo en el nuevo.
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{cakes.length}</Text>
                        <Text style={styles.statLabel}>Tortas</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{ingredients.length}</Text>
                        <Text style={styles.statLabel}>Ingredientes</Text>
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Respaldo y migración</Text>
                <Text style={styles.sectionText}>
                    Exporta un archivo JSON con todas tus tortas e ingredientes para guardarlo o compartirlo al otro teléfono.
                </Text>

                <Pressable
                    style={[
                        styles.actionButton,
                        pendingAction === 'export' && styles.actionButtonDisabled,
                    ]}
                    onPress={handleExport}
                    disabled={pendingAction !== null}
                >
                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>
                        {pendingAction === 'export' ? 'Exportando...' : 'Exportar datos'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.actionButton,
                        styles.actionButtonSecondary,
                        pendingAction === 'import' && styles.actionButtonDisabled,
                    ]}
                    onPress={handleImport}
                    disabled={pendingAction !== null}
                >
                    <Ionicons name="download-outline" size={18} color="#a24770" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                        {pendingAction === 'import' ? 'Importando...' : 'Importar datos'}
                    </Text>
                </Pressable>

                <Text style={styles.hintText}>
                    La importación reemplaza los datos actuales del teléfono por los del archivo seleccionado.
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Borrado total</Text>
                <Text style={styles.sectionText}>
                    Usa esta opción solo si quieres reiniciar la app. Borra los datos locales e intenta borrar también lo sincronizado en Firebase.
                </Text>

                <Pressable
                    style={[
                        styles.actionButton,
                        styles.actionButtonDanger,
                        pendingAction === 'clear' && styles.actionButtonDisabled,
                    ]}
                    onPress={handleClear}
                    disabled={pendingAction !== null}
                >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>
                        {pendingAction === 'clear' ? 'Borrando...' : 'Borrar base de datos'}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
};

export default SettingsScreen;