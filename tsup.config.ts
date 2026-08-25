import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: [
            'src/index.ts',
            // 'src/query/index.ts',
            // 'src/i18n/index.ts',
            // 'src/hook-form/index.ts',
        ],
        format: ['esm', 'cjs'],
        dts: true,
        clean: false,
        target: 'es2018',
        platform: 'node',
        external: ["react", "next", "class-transformer", "class-validator", "class-validator-jsonschema", "swagger-ui-dist"],
        outDir: 'dist',
        sourcemap: false,
        minify: true,
        esbuildOptions(options) {
            options.drop = ['console', 'debugger']
        }
    },
    {
        entry: { cli: 'src/cli.ts' },
        format: ['cjs'],
        dts: false,
        clean: false,
        target: 'es2018',
        platform: 'node',
        outDir: 'dist',
        sourcemap: false,
        minify: true,
    }
]);
