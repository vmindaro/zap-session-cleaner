const fs = require('fs');
const yaml = require('js-yaml');

const configYaml = fs.readFileSync('properties.yaml', 'utf-8');
const config = yaml.load(configYaml);

const urlBlacklistRegex = config.urlBlacklistRegex;
const paramBlacklistExact = config.paramBlacklistExact;
const paramBlacklistRegex = config.paramBlacklistRegex;

const paramNotInBlacklist = (param) => {
    // Lista negra de nombre exacto
    if (paramBlacklistExact.includes(param)) {
        return false;
    }

    // Lista negra de regex
    if (paramBlacklistRegex.some(regex => new RegExp(regex, 'i').test(param))) {
        return false;
    }
    
    return true;
};

const getParamsFromEntry = (entry) => {
    const rq = entry.request;
    const dataType = rq.postData.mimeType;

    let res = new Set();
    let dataTypeIsForm = dataType === 'application/x-www-form-urlencoded'
    let dataTypeIsJson = dataType === 'application/json'
    let dataTypeIsText = dataType === 'text/plain'
    
    if (rq.queryString) {
        rq.queryString.forEach(param => {
            if (paramNotInBlacklist(param.name)) {
                res.add(param.name);
            }
        });
    }

    if (dataTypeIsForm || dataTypeIsJson) {
        rq.postData.params.forEach(param => {
            if (paramNotInBlacklist(param.name)) {
                res.add(param.name);
            }
        });
    }  
    
    if (dataTypeIsText) {
        const parts = rq.postData.text.split('\n');
        for (const part of parts) {
            if (part.includes('=')) {
                const [param] = part.split('=');
                if (paramNotInBlacklist(param)) {
                    res.add(param.name);
                }
            }
        }
    } 
    
    if (rq.postData.mimeType.startsWith('multipart/form-data')) {
        const boundary = rq.postData.mimeType.split('boundary=')[1].trim();
        const parts = rq.postData.text.split(boundary).slice(1, -1);
        parts.forEach(part => {
            const match = part.match(/name="([^"]+)"/);
            if (match && paramNotInBlacklist(match[1])) {
                res.add(match[1]);
            }
        });
    }

    return [...res];
};

const filterEntries = (entries) => {
    let target = "default";
    const res = [];
    const paramsCovered = new Set();

    for (const entry of entries) {
        // Nos quedamos con la URL sin query, para que en caso de los GET no 
        // considerar un parámetro con valores diferentes como URLs diferentes
        const urlNoQuery = entry.request.url.split('?')[0];
        const entryParams = getParamsFromEntry(entry);

        // Se descarta si está en la lista negra de regex
        if (urlBlacklistRegex.some(regex => {
            return new RegExp(regex, 'i').test(urlNoQuery)
        })) {
            continue;
        }
        
        // Si la URL encontrada es nueva, seguro que es la que más parámetros
        // tiene, así que la añadimos al resultado final. Limpiamos los 
        // parámetros cubiertos hasta ahora e incluimos los de la nueva URL
        if (urlNoQuery !== target) {
            target = urlNoQuery;
            paramsCovered.clear();
            entryParams.forEach(param => paramsCovered.add(param));
            res.push(entry);
        } else {
            // Si la URL encontrada es la misma que la de antes, puede tener o 
            // no parámetros diferentes que sus anteriores
            const newParams = entryParams.some(param => {
                return !paramsCovered.has(param)
            });

            if (newParams) {
                // Si los tiene, se añade al resultado final, y sus parámetros 
                // se consideran "cubiertos"
                res.push(entry);
                entryParams.forEach(param => paramsCovered.add(param));
            }
        }
    }

    return res;
};

const harJson = JSON.parse(fs.readFileSync('./HarFile.har', 'utf8'));
const allEntries = harJson.log.entries;
let minimizedEntries = [];

// Realiza la operación de limpieza por método
['GET', 'POST', 'PUT', 'DELETE'].forEach((method) => {
    const methodEntries = allEntries.filter(entry => {
        return entry.request.method === method
    });
    
    // Ordena alfanuméricamente las URLs, en coincidencia, por nº de params
    const sortedEntries = [...methodEntries].sort((a,b) => {
        const urlA = a.request.url.split('?')[0];
        const urlB = b.request.url.split('?')[0];
        const urlComparison = urlA.localeCompare(urlB);
        if (urlComparison !== 0) return urlComparison;
        return getParamsFromEntry(b).length - getParamsFromEntry(a).length;
    });
    const filteredEntries = filterEntries(sortedEntries);
    minimizedEntries = minimizedEntries.concat(filteredEntries);
});

const newLogJson = { ...harJson.log, entries: minimizedEntries };
const newHarJson = { ...harJson, log: newLogJson};
const newHarString = JSON.stringify(newHarJson, null, 2);
console.log(allEntries.length);
console.log(minimizedEntries.length);
fs.writeFileSync('./MinimizedHarFile.har', newHarString, 'utf8');