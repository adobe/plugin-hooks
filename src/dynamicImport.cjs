/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

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
