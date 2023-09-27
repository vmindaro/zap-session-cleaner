const fs = require('fs');
const { projectBaseUrl, nodeBlacklist, 
    exactParamBlacklist, regexParamBlacklist } = require('./properties');

const paramNotInBlacklist = (param) => {
    if (exactParamBlacklist.includes(param)) {
        return false;
    }

    for (const regex of regexParamBlacklist) {
        if (regex.test(param)) {
            return false; 
        }
    }
    return true;
};

const getParametersFromEntry = (entry) => {
    const rq = entry.request;
    let res = new Set();

    if (rq.method === 'GET' && rq.queryString) {
        rq.queryString.forEach(param => {
            if (paramNotInBlacklist(param.name)) {
                res.add(param.name);
            }
        });
    } else if (rq.method === 'POST') {
        if (rq.postData.mimeType === 'application/x-www-form-urlencoded') {
            rq.postData.params.forEach(param => {
                if (paramNotInBlacklist(param.name)) {
                    res.add(param.name);
                }
            });
        } else if (rq.postData.mimeType === 'text/plain') {
            const parts = rq.postData.text.split('\n');
            for (const part of parts) {
                if (part.includes('=')) {
                    const [param] = part.split('=');
                    if (paramNotInBlacklist(param)) {
                        res.add(param.name);
                    }
                }
            }
        } else if (rq.postData.mimeType.startsWith('multipart/form-data')) {
            const boundary = rq.postData.mimeType.split('boundary=')[1].trim();
            const parts = rq.postData.text.split(boundary).slice(1, -1);
            parts.forEach(part => {
                const match = part.match(/name="([^"]+)"/);
                if (match && paramNotInBlacklist(match[1])) {
                    res.add(match[1]);
                }
            });
        }
    } 
    return [...res];
};

const filterEntries = (entries) => {
    const res = [];
    const paramsCovered = new Set();

    for (const entry of entries) {
        const entryParams = getParametersFromEntry(entry);
        const newParams = entryParams.some(param => !paramsCovered.has(param));
        if (newParams || entry.request.url.endsWith('.dwr')) {
            res.push(entry);
            entryParams.forEach(param => paramsCovered.add(param));
        } 
    }
    return res;
};

const groupByNode = (entries) => {
    return entries.reduce((acc, entry) => {
        const myUrl = new URL(entry.request.url);
        const segments = myUrl.pathname.split('/');
        const firstTwoNodes = segments.slice(0, 3).join('/')
        const node = `${myUrl.protocol}//${myUrl.host}${firstTwoNodes}`;
        acc[node] = (acc[node] || []).concat(entry);
        return acc;
    }, {});
};

const harJson = JSON.parse(fs.readFileSync('./HarFile.har', 'utf8'));
const entriesByNode = groupByNode(harJson.log.entries);
const methods = ['GET', 'POST'];
let minimizedEntries = [];

for (const node in entriesByNode) {
    const secondLevelNode = new URL(node).pathname.split('/').filter(p => p)[1]
    if (!node.includes(projectBaseUrl) || nodeBlacklist.includes(secondLevelNode)) continue;

    const nodeEntries = entriesByNode[node];
    methods.forEach((method) => {
        const entries = nodeEntries.filter(entry => entry.request.method === method);
        const sortedEntries = [...entries].sort((a,b) => getParametersFromEntry(b).length - getParametersFromEntry(a).length);
        const filteredEntries = filterEntries(sortedEntries);
        minimizedEntries = minimizedEntries.concat(filteredEntries);
    });
};

const minimizedHarJson = { ...harJson, log: { ...harJson.log, entries: minimizedEntries } };
fs.writeFileSync('./MinimizedHarFile.har', JSON.stringify(minimizedHarJson, null, 2), 'utf8');

console.log(`Número de peticiones en el HAR original: ${harJson.log.entries.length}`);
console.log(`Número de peticiones en el HAR reducido: ${minimizedEntries.length}`);