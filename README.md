# zap-session-cleaner
## Descripción
### Finalidad
El script creado tiene como finalidad automatizar la limpieza de sesiones de OWASP ZAP, eliminando posibles entradas redundantes y permitiendo, en un análisis activo, aplicar reglas más exhaustivas (*strength* con valor *high* o *insane*) en busca de un mayor número de vulnerabilidades.

### Funcionamiento
1. Recopila información del fichero `properties.js` de cara al filtrado
2. Convierte el archivo `.har` en un `.json`
3. Ordena las entradas según carpetas por la URL de la petición
4. Para cada carpeta/nodo (únicamente de primer nivel respecto al path del proyecto):
	1. Segrega las peticiones en función del método (GET o POST), y para cada método:
		1. Ordena las entradas en función del número de parámetros de la petición
		2. Recopila en un `set` el nombre de los parámetros de las peticiones
		3. Filtra las peticiones en función de un algoritmo *greedy*, de tal forma que recorriendo las peticiones ordenadas, elige aquellas que tengan un parámetro que hasta el momento no incluía ninguna petición anterior
	2. Añade las peticiones filtradas de ambos métodos al `.json` resultado
5. Se sustituyen las entradas del `.json` original por las del `.json` resultado
6. Se convierte el `.json` en un `.har` importable a OWASP ZAP

## Requisitos

* Node.js (sin versión específica)
* Un fichero `harFile.har` generado en OWASP ZAP con la opción *Save Selected Entries as HAR* tras seleccionar todos las URLs en el árbol de nodos
* (Opcional, de cara al análisis) Última versión de OWASP ZAP, y aún más importante, tener el set de reglas de análisis activo actualizado, con el fin de minimizar falsos positivos/negativos

## Uso
1. Descargar el proyecto
2. Rellenar la plantilla `properties-template.js` y renombrarla a `properties.js`
3. Ejecutar por línea de comando:
```
node AutoClean.js
``` 
Esto indicará por consola el número de entradas original y el nuevo tras el filtrado. En el mismo directorio se generará el fichero `MinimizedHarFile.har`, que se puede importar a una sesión nueva de OWASP ZAP para realizar un análisis.

## Observaciones, limitacione y problemas 
- Las peticiones `GET` sin *query* y las `POST` sin *body* no se incluyen en el resultado final
- Todas las peticiones del tipo `.dwr` con contenido en el *body* son incluidas en el resultado final