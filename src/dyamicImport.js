/**
 * Import a module.
 * @param modulePath Module path.
 */

export default async function importFn(modulePath) {
    /** @ts-ignore */
	return import(modulePath)
}