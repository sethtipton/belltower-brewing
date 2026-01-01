import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));
const tsRecommended = tsPlugin.configs.recommended || {};
const tsRecommendedTypeChecked = tsPlugin.configs['recommended-type-checked'] || tsRecommended;
const tsStylisticTypeChecked = tsPlugin.configs['stylistic-type-checked'] || {};

export default [
	js.configs.recommended,
	{
		files: [ 'src/**/*.{ts,tsx,js,jsx}' ],
		languageOptions: {
			parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir,
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'react-refresh': reactRefresh,
		},
		rules: {
			...(tsRecommended.rules || {}),
			...(tsRecommendedTypeChecked.rules || {}),
			...(tsStylisticTypeChecked.rules || {}),
			'react-refresh/only-export-components': 'off',
		},
	},
	reactYouMightNotNeedAnEffect.configs.recommended
];
