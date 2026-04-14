## TortaCtrl

Aplicación móvil para llevar el control de tortas por encargo.

Permite:
- Registrar ingredientes con su costo por unidad.
- Crear tortas indicando cliente, fecha, forma, tamaño, notas y foto opcional.
- Cargar el detalle de ingredientes usados para calcular el costo total.
- Marcar tortas como **pagadas** y/o **entregadas** y ver la ganancia.
- Navegar por mes o agenda diaria con filtros por forma, estado y cliente.
- Ver un resumen de ganancias por semana o por mes (solo tortas pagadas).
- Respaldar datos a un archivo JSON e importarlos en otro teléfono.

### Tecnologías

- React Native + Expo
- Context API para el estado global
- AsyncStorage para datos locales
- Firebase Firestore para sincronización opcional en la nube

### Desarrollo local

1. Instalar dependencias:
	```bash
	npm install
	```
2. Iniciar la app en modo desarrollo:
	```bash
	npx expo start
	```

### Build de APK (Android)

Se usa EAS Build:

1. Configurar el proyecto (una sola vez):
	```bash
	eas build:configure
	```
2. Generar un APK de prueba:
	```bash
	eas build -p android --profile preview
	```
3. Descargar el APK desde la URL que muestra la consola y instalarlo en el teléfono Android.

### Notas sobre Firebase

El código usa Firebase solo para sincronizar datos. No se suben datos reales de Firestore al repositorio, solo el código de integración.
