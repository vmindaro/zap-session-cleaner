const fs = require('fs');

const getParametersFromEntry = (entry) => {
    let res = new Set();
    if (entry.request.method === 'GET' && entry.request.queryString) {
        entry.request.queryString.forEach(param => {
            res.add(param.name);
        });
    } else if (entry.request.method === 'POST' && entry.request.postData && entry.request.postData.params) {
        entry.request.postData.params.forEach(param => {
            res.add(param.name);
        });
    }
    return [...res];
}

const filterEntries = (entries) => {
    const res = [];
    const paramsCovered = new Set();

    for (const entry of entries) {
        const entryParams = getParametersFromEntry(entry);
        const newParams = entryParams.some(param => !paramsCovered.has(param));
        if (newParams || (entry.request.postData.mimeType && entry.request.postData.text)) {
            res.push(entry);
            entryParams.forEach(param => paramsCovered.add(param));
        }
    }
    return res;
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
    const methods = ['GET', 'POST'];

    methods.forEach((method) => {
        const entries = nodeEntries.filter(entry => entry.request.method === method);
        const sortedEntries = [...entries].sort((a,b) => getParametersFromEntry(b).length - getParametersFromEntry(a).length);
        const filteredEntries = filterEntries(sortedEntries);
        minimizedEntries = minimizedEntries.concat(filteredEntries);
    });
}

console.log(`Número de peticiones en el HAR reducido: ${minimizedEntries.length}`);
const minimizedHarJson = { ...harJson, log: { ...harJson.log, entries: minimizedEntries } };
fs.writeFileSync('./MinimizedHarFile.har', JSON.stringify(minimizedHarJson, null, 2), 'utf8');