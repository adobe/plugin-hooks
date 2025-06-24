/**
 * Import a module.
 * @param modulePath Module path.
 */
export default async function importFn(modulePath) {
	return import(modulePath);
}
