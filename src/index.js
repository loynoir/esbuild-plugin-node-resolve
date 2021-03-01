const fs = require("fs");
const path = require("path");
const { builtinModules } = require("module")
const { memoize } = require('lodash')

const name = 'loynoir'
const defaultNameSpace = 'loynoir/node_modules'
const regx_namedImport = /^[^(\/|\.)]/;

// FIXME: need a good name 
const _dotmulflat = (a, b) => a.map((x) => b.map((y) => [x, y])).flat();

// aka: find "path/to/node_modules" filter by "path/to/node_modules/<name>/package.json" exists
const getNamedImportRoot = memoize((
    name,
    paths = process.env.NODE_PATH.split(":"),
    segments = ["package.json"]
) => _dotmulflat(paths, segments)
    .find(([x, y]) => fs.existsSync(path.resolve(x, name, y)))[0]
);


// input: 'lodash/debounce'
// output:  {public: 'lodash/debounce.js', private: 'path/to/node_modules/lodash/debounce.js'}
const defaultGetNamedImportPath = memoize((namedImport) => {
    var ret;
    const [pack, ...segments] = namedImport.split("/");
    const metaroot = getNamedImportRoot(pack);
    const metadir = path.resolve(metaroot, pack);
    const metapath = path.resolve(metadir, "package.json");
    const meta = JSON.parse(fs.readFileSync(metapath));
    if (segments.length === 0) {
        ret = path.join(
            ((meta.exports || {})["."] || {} || {}).import ||
            meta.module ||
            meta.main
        )
    } else {
        const subpath = path.join(...segments);
        const exts = ["", ".js", ".mjs"];
        ret = _dotmulflat([subpath, subpath + "/index"], exts)
            .find((x) => {
                const y = path.join(metadir, x.join(""));
                return fs.existsSync(y) && fs.statSync(y).isFile();
            })
            .join("")
    }

    return {
        private: path.join(metaroot, pack, ret),
        public: path.join(pack, ret),
    }
});


const plugin = ({
    alias,
    getNamedImportPath,
    namespace,
    external,
}) => {
    alias = alias || {}
    getNamedImportPath  = getNamedImportPath || defaultGetNamedImportPath
    namespace = namespace || defaultNameSpace
    external = external || []

    const _external = new Set([...builtinModules, ...external]);
    return {
        name,
        setup(build) {
            build.onResolve({ filter: regx_namedImport }, (ags) => {
                const fallback = { path: ags.path, external: true }
                if (alias.hasOwnProperty(ags.path)) { return { path: alias[ags.path] }; }
                if (_external.has(ags.path.split('/')[0])) { return fallback; }

                try {
                    const namedImportPath = ags.path
                    const ret = getNamedImportPath(namedImportPath)
                    return { path: ret.public, namespace };
                } catch (e) {
                    return fallback
                }
            });

            build.onResolve({ filter: /.*/, namespace }, (ags) => {
                const fallback = { path: ags.path, external: true }
                if (alias.hasOwnProperty(ags.path)) { return { path: alias[ags.path] }; }
                if (_external.has(ags.path.split('/')[0])) { return fallback; }

                try {
                    var namedImportPath;
                    if (regx_namedImport.test(ags.path)) {
                        namedImportPath = ags.path
                    } else {
                        namedImportPath = path.join(path.dirname(ags.importer), ags.path)
                    }
                    const ret = getNamedImportPath(namedImportPath)
                    return { path: ret.public, namespace };
                } catch (e) {
                    return fallback
                }
            });

            build.onLoad({ filter: /.*/, namespace }, async (ags) => {
                try {
                    const namedImportPath = ags.path
                    const ret = getNamedImportPath(namedImportPath)
                    const contents = fs.readFileSync(ret.private, "utf8");
                    return { contents };
                } catch (e) {
                    throw e
                }
            });
        },
    };
};

exports.plugin = exports.NodeResolvePlugin = plugin
exports.getNamedImportPath = defaultGetNamedImportPath