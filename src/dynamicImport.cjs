/**
 * CommonJS version of dynamic import function.
 * 
 * This file exists to support dual module formats (CommonJS + ES modules) in the plugin-hooks package.
 * It provides the same functionality as dynamicImport.js but uses CommonJS syntax for compatibility.
 * 
 * WHY THIS FILE EXISTS:
 * - The plugin-hooks package supports both CommonJS and ES module consumers
 * - Node.js 18.x is strict about module syntax and throws "SyntaxError: Unexpected token 'export'"
 *   when requiring ES module syntax in CommonJS contexts
 * - SMS (Schema Management Service) and other CommonJS consumers need proper module.exports syntax
 * - Modern applications using ES modules can use the dynamicImport.js version
 * 
 * @param {string} modulePath Module path to dynamically import.
 * @returns {Promise<any>} Promise that resolves to the imported module.
 */
async function importFn(modulePath) {
	return import(modulePath);
}

module.exports = importFn; 