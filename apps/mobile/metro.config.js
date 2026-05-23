const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
/** Monorepo root (hoisted dependencies live here with npm workspaces). */
const workspaceRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

const blockList = [
  /[/\\]android[/\\]app[/\\]\.cxx[/\\].*/,
  /[/\\]android[/\\]app[/\\]build[/\\].*/,
  /[/\\]android[/\\]build[/\\].*/,
];

const MAPBOX_PKG = `${path.sep}@rnmapbox${path.sep}maps${path.sep}`;

/**
 * react-native-image-picker@8 sets main to `src/index.ts`; Metro can fail to resolve it
 * in a hoisted monorepo. Point directly at the source file.
 */
function resolveImagePicker(moduleName) {
  if (moduleName !== 'react-native-image-picker') return null;
  const candidates = [
    path.join(workspaceRoot, 'node_modules', 'react-native-image-picker', 'src', 'index.ts'),
    path.join(projectRoot, 'node_modules', 'react-native-image-picker', 'src', 'index.ts'),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }
  return null;
}

/** @rnmapbox/maps ships Fabric specs as .ts; Metro must resolve them from .js imports. */
function resolveRnmapboxSpecs(context, moduleName) {
  const origin = context.originModulePath;
  if (!origin.includes(MAPBOX_PKG)) return null;

  let rel = null;
  if (moduleName.startsWith('./specs/')) rel = moduleName.slice(2);
  else if (moduleName.startsWith('../specs/')) rel = moduleName.slice(3);
  else return null;

  const base = path.join(path.dirname(origin), rel);
  for (const ext of ['.ts', '.tsx', '.js']) {
    const candidate = `${base}${ext}`;
    if (fs.existsSync(candidate)) {
      return { type: 'sourceFile', filePath: candidate };
    }
  }
  return null;
}

/**
 * Metro configuration — required because `apps/mobile/node_modules` is empty
 * and packages resolve from `zygo/node_modules`.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    blockList,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      const imagePickerResolved = resolveImagePicker(moduleName);
      if (imagePickerResolved) return imagePickerResolved;
      const mapboxResolved = resolveRnmapboxSpecs(context, moduleName);
      if (mapboxResolved) return mapboxResolved;
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
