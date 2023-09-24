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

const filterEntries = (entries) => {
    const result = [];
    const paramsCovered = new Set();

    for (let entry of entries) {
        const entryParams = getParametersFromEntry(entry);
        const newParams = entryParams.some(param => !paramsCovered.has(param));
        if (newParams || (entry.request.postData.mimeType && entry.request.postData.text)) {
            result.push(entry);
            entryParams.forEach(param => paramsCovered.add(param));
        }
    }
    return result;
}

const groupByNode = (entries) => {
    return entries.reduce((acc, entry) => {
        const myUrl = new URL(entry.request.url);
        const segments = myUrl.pathname.split('/');
        const firstTwoNodes = segments.slice(0, 3).join('/')
        const node = `${myUrl.protocol}//${myUrl.host}${firstTwoNodes}`;
        acc[node] = (acc[node] || []).concat(entry);
        return acc;
    }, {});
}

const harJson = JSON.parse(fs.readFileSync('./HarFile.har', 'utf8'));

console.log(`Número de peticiones en el HAR original: ${harJson.log.entries.length}`);

const entriesByNode = groupByNode(harJson.log.entries);

let minimizedEntries = [];

for (const node in entriesByNode) {
    const nodeEntries = entriesByNode[node];

    const getEntries = nodeEntries.filter(entry => entry.request.method === 'GET');
    const postEntries = nodeEntries.filter(entry => entry.request.method === 'POST');  

    const sortedGetEntries = [...getEntries].sort((a, b) => numberOfParameters(b, 'GET') - numberOfParameters(a, 'GET'));
    const sortedPostEntries = [...postEntries].sort((a, b) => numberOfParameters(b, 'POST') - numberOfParameters(a, 'POST'));
    
    const minimizedGetEntries = filterEntries(sortedGetEntries);
    const minimizedPostEntries = filterEntries(sortedPostEntries);

    minimizedEntries = minimizedEntries.concat(minimizedGetEntries, minimizedPostEntries);
}

console.log(`Número de peticiones en el HAR reducido: ${minimizedEntries.length}`);

const minimizedHarJson = { ...harJson, log: { ...harJson.log, entries: minimizedEntries } };
fs.writeFileSync('./MinimizedHarFile.har', JSON.stringify(minimizedHarJson, null, 2), 'utf8');