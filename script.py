import glob
import json
import os
import requests
import shutil
import time
import yaml

### Funciones ###
def getLeavesFromSitesTree(url, urlIdsList):
    params = {'url': url}
    childNodes = requests.get(API_URL + '/JSON/core/view/childNodes/',
                              headers=JSON_HEADER,
                              params=params).json()['childNodes']
    for child in childNodes:
        if child['isLeaf'] is False:
            getLeavesFromSitesTree(child['uri'], urlIdsList)
        else:
           urlIdsList.append(child['hrefId']) 
    return urlIdsList

### Constantes globales ###
JSON_HEADER = {'Accept': 'application/json'}
ALL_HEADER = {'Accept': '*/*'}
API_URL = 'http://localhost:8080'

### Inicialización ZAP ### 
print('> Inicialización ZAP')
os.system('{ zap.sh -daemon -silent > /dev/null 2>&1 & }')

### Limpieza directorio sesión limpia ###
print('> Limpieza directorio sesión limpia')
newSesionPath = '/zap/wrk/sesionLimpia/'
for item in os.listdir(newSesionPath):
    itemPath = os.path.join(newSesionPath, item)
    os.remove(itemPath)

### Copia fichero de configuración a directorio de limpieza ###
print('> Copia fichero de configuración a directorio de limpieza')
srcFile = '/zap/wrk/properties.yaml'
dstFile = '/zap/zap-session-cleaner/properties.yaml'
shutil.copyfile(srcFile, dstFile)

### Espera ZAP ###
print('> Espera ZAP')
time.sleep(15)

### Carga de la sesión original ###
print('> Carga de la sesión original')
ogSessionPath = glob.glob('/zap/wrk/sesionOriginal/*.session')[0]
params = {'name': ogSessionPath}
requests.get(API_URL + '/JSON/core/action/loadSession/',
             headers=JSON_HEADER,
             params=params)

### Obtención de las URLs del Sites Tree de ZAP en formato .har ###
print('> Obtención de las URLs del Sites Tree de ZAP en formato .har')
with open('/zap/wrk/properties.yaml') as f:
    projectBaseUrl = yaml.safe_load(f)['projectBaseUrl']

urlIdsList = getLeavesFromSitesTree(projectBaseUrl, [])
urlIdsString = ','.join(map(str, urlIdsList))

params = {'ids': urlIdsString}
har = requests.get(API_URL + '/OTHER/exim/other/exportHarById/',
                headers=ALL_HEADER,
                params=params).json()

with open('/zap/zap-session-cleaner/HarFile.har', 'w', encoding='utf-8') as f:
    json.dump(har, f, ensure_ascii=False, indent=2)

### Limpieza ##
print('> Limpieza')
os.system('node /zap/zap-session-cleaner/limpieza.js')

### Creación de nueva sesión ###
print('> Creación de nueva sesión')
requests.get(API_URL + '/JSON/core/action/newSession/',
             headers=JSON_HEADER)

### Importación del .har limpio ###
print('> Importación del .har limpio')
params = {'filePath': '/zap/zap-session-cleaner/MinimizedHarFile.har'}
requests.get(API_URL + '/JSON/exim/action/importHar/',
             headers=JSON_HEADER,
             params=params)

### Espera al escáner pasivo ###
print('> Espera al escáner pasivo')
time.sleep(10)

### Guardado de sesión limpia ###
print('> Guardado de sesión limpia')
ogSessionName = os.path.basename(ogSessionPath)
newSessionName = ogSessionName.replace('.session', '_limpio.session')

params = {'name': f'/zap/wrk/sesionLimpia/{newSessionName}'}
requests.get(API_URL + '/JSON/core/action/saveSession/',
             headers=JSON_HEADER,
             params=params)

### Creación de nueva sesión ###
print('> Cerrando la sesión limpia')
requests.get(API_URL + '/JSON/core/action/newSession/',
             headers=JSON_HEADER)