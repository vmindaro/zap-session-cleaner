/*
** Cambiar el nombre de archivo a 
** 'properties.js' una vez añadidos
*/

const projectBaseUrl = 'https://mipagina.com:8443/proyecto';

const exactBlacklist = [
    'exactParameterName' 
];
const regexBlacklist = [/theParameterContainsThis/i];

module.exports = {
    projectBaseUrl,
    exactBlacklist,
    regexBlacklist
};