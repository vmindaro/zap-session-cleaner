/*
** Cambiar el nombre de archivo a 
** 'blacklist.js' una vez añadidos
*/

const exactBlacklist = [
    'exactParameterName' 
];
const regexBlacklist = [/theParameterContainsThis/i];

module.exports = {
    exactBlacklist,
    regexBlacklist
};