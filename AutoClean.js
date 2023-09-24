const fs = require('fs');

const numberOfParameters = (entry, type) => {
    if (type === 'GET' && entry.request.queryString) {
        return entry.request.queryString.length;
    } else if (type === 'POST' && entry.request.postData && entry.request.postData.params) {
        return entry.request.postData.params.length;
    }
    return 0;
}

const getParametersFromEntry = (entry) => {
    let params = new Set();
    if (entry.request.method === 'GET' && entry.request.queryString) {
        entry.request.queryString.forEach(param => {
            params.add(param.name);
        });
    } else if (entry.request.method === 'POST' && entry.request.postData && entry.request.postData.params) {
        entry.request.postData.params.forEach(param => {
            params.add(param.name);
        });
    }
    return [...params];
}

const filterEntries = (entries, allUniqueParams) => {
    const result = [];
    const paramsCovered = new Set();

    for (let entry of entries) {
        const entryParams = getParametersFromEntry(entry);
        const newParams = entryParams.some(param => !paramsCovered.has(param));
        if (entryParams.length === 0 || newParams) {
            result.push(entry);
            entryParams.forEach(param => paramsCovered.add(param));
        }
        /* IMO, tiene sentido meter peticiones con parámetros nulos,
        ** no reduciría demasiado el tiempo del análisis y las visitaría
        ** para el posterior análisis pasivo
        if (paramsCovered.size === allUniqueParams.size) {
            break;
        }
        */
    }
    return result;
}

const harJson = JSON.parse(fs.readFileSync('./HarFile.har', 'utf8'));

console.log(`Número de peticiones en el HAR original: ${harJson.log.entries.length}`);

const getEntries = harJson.log.entries.filter(entry => entry.request.method === 'GET');
const postEntries = harJson.log.entries.filter(entry => entry.request.method === 'POST');

const sortedGetEntries = [...getEntries].sort((a, b) => numberOfParameters(b, 'GET') - numberOfParameters(a, 'GET'));
const sortedPostEntries = [...postEntries].sort((a, b) => numberOfParameters(b, 'POST') - numberOfParameters(a, 'POST'));

const uniqueGetParams = new Set(sortedGetEntries.flatMap(entry => getParametersFromEntry(entry, 'GET')));
const uniquePostParams = new Set(sortedPostEntries.flatMap(entry => getParametersFromEntry(entry, 'POST')));

const minimizedGetEntries = filterEntries(sortedGetEntries, uniqueGetParams);
const minimizedPostEntries = filterEntries(sortedPostEntries, uniquePostParams);

const minimizedEntries = [...minimizedGetEntries, ...minimizedPostEntries];
console.log(`Número de peticiones en el HAR reducido: ${minimizedEntries.length}`);

const minimizedHarJson = { ...harJson, log: { ...harJson.log, entries: minimizedEntries } };
fs.writeFileSync('./MinimizedHarFile.har', JSON.stringify(minimizedHarJson, null, 2), 'utf8');