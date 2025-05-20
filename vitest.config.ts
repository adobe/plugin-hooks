import { defineConfig, coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		typecheck: {
			tsconfig: './tsconfig.test.json',
		},
		coverage: {
			exclude: [
				'**/dist/**',
				'**/examples/**',
				'**/scripts/**',
				'**/__tests__/**',
				'**/__fixtures__/**',
				'**/__mocks__/**',
				...coverageConfigDefaults.exclude,
			],
		},
	},
});
