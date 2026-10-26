import { parsers as babelParsers } from 'prettier/plugins/babel';

// Prettier preserves multiline objects, but has no option to expand every object.
// Use its own parser to find object literals without touching strings or blocks.
export const parsers = {
    babel: {
        ...babelParsers.babel,
        async preprocess(source, options) {
            const ast = await babelParsers.babel.parse(source, options);
            const positions = [];

            function visit(node) {
                if (!node || typeof node !== 'object') {
                    return;
                }

                if (node.type === 'ObjectExpression' && node.properties.length) {
                    positions.push(node.start + 1);
                }

                for (const value of Object.values(node)) {
                    if (Array.isArray(value)) {
                        for (const child of value) {
                            visit(child);
                        }
                    } else if (value && typeof value === 'object') {
                        visit(value);
                    }
                }
            }

            visit(ast);

            for (const position of positions.sort((a, b) => b - a)) {
                if (!/^\s*\n/.test(source.slice(position))) {
                    source = source.slice(0, position) + '\n' + source.slice(position);
                }
            }

            return source;
        },
    },
};
