# zap-session-cleaner
## Descripción
### Finalidad
El script creado tiene como finalidad automatizar la limpieza de sesiones de OWASP ZAP, eliminando posibles entradas redundantes y permitiendo, en un análisis activo, aplicar reglas más exhaustivas (*strength* con valor *high* o *insane*) en busca de un mayor número de vulnerabilidades.

### Funcionamiento
1. Convierte el archivo `.har` en un `.json`
2. Ordena las entradas según carpetas por la URL de la petición
3. Para cada carpeta (únicamente de primer nivel):
	1. Segrega las peticiones en función del método (GET o POST), y para cada método:
		1. Ordena las entradas en función del número de parámetros de la petición
		2. Recopila en un `set` el nombre de los parámetros de las peticiones
		3. Filtra las peticiones en función de un algoritmo *greedy*, de tal forma que recorriendo las peticiones ordenadas, elige aquellas que tengan un parámetro que hasta el momento no incluía ninguna petición anterior
	2. Añade las peticiones filtradas de ambos métodos al `.json` resultado
4. Se sustituyen las entradas del `.json` original por las del `.json` resultado
5. Se convierte el `.json` en un `.har` importable a OWASP ZAP

## Requisitos

* Node.js (sin versión específica)
* Un fichero `harFile.har` que contenga una secuencia de peticiones-respuesta de interés de una sesión de OWASP ZAP, generado con la extensión `Import/export` 
* (Opcional, de cara al análisis) Última versión de OWASP ZAP, y aún más importante, tener el set de reglas de análisis activo actualizado, con el fin de minimizar falsos positivos/negativos

## Uso
Descargar el script `AutoClean.js` y situarlo en el mismo directorio que el fichero `harFile.har` y ejecutar por línea de comando:
```
node AutoClean.js
``` 
Esto indicará por consola el número de entradas original y el nuevo tras el filtrado. En el mismo directorio se generará el fichero `MinimizedHarFile.har`, que se puede importar a una sesión nueva de OWASP ZAP para realizar un análisis.

## Limitaciones y problemas 
- Aquellas peticiones `POST` con MIME tipo `application/x-www-form-urlencoded` sin parámetros de ningún tipo no se incluyen en el resultado final. Aquellas de diferente MIME tipo son todas incluidas sin excepción. En el futuro se buscará una solución a esto al menos para el tipo `multipart/form-data`. De forma similar, las peticiones `GET` sin *query* no se incluyen en el resultado final.