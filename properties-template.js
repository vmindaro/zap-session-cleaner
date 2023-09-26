/*
** Cambiar el nombre de archivo a 
** 'properties.js' una vez añadidos
*/

const projectBaseUrl = 'https://mipagina.com:8443/proyecto';

const nodeBlacklist = [
    'js', 'css', 'treemenu'
];

const exactParamBlacklist = [
    'exactParameterName1', 'exactParameterName2' 
];
const regexParamBlacklist = [
    /theParameterContainsThis/i, /^[1-9]\d*$/
];

module.exports = {
    projectBaseUrl,
    nodeBlacklist,
    exactParamBlacklist,
    regexParamBlacklist
};