import * as path from 'path';
import { createFsFromVolume, Volume, IFs } from 'memfs';
import joinPath from 'memory-fs/lib/join';
import API from '../../API';
import getConfig from '../../getConfig';
import winPath from '../../winPath';
import { Platform } from '@remax/types';
import { run } from '../../build';

function ensureWebpackMemoryFs(fs: IFs) {
  const nextFs = Object.create(fs);
  nextFs.join = joinPath;

  return nextFs;
}

interface OutputFile {
  fileName: string;
  code: string;
}

function getFilesInDir(fs: IFs, root: string, fsPath: string) {
  const list = fs.readdirSync(fsPath);
  let outputs: OutputFile[] = [];

  list.forEach((fileName: any) => {
    const filePath = path.join(fsPath, fileName);
    if (fs.statSync(filePath).isDirectory()) {
      outputs = outputs.concat(getFilesInDir(fs, root, filePath));
    } else {
      outputs.push({
        fileName: winPath(filePath).replace(winPath(root), ''),
        code: fs.readFileSync(filePath).toString(),
      });
    }
  });

  return outputs;
}

interface Options {
  include: string[];
  exclude: string[];
}

export default async function build(app: string, target: Platform, options: Partial<Options> = {}) {
  const cwd = path.resolve(__dirname, `../fixtures/${app}`);
  process.chdir(cwd);
  process.env.NODE_ENV = 'test';
  process.env.REMAX_PLATFORM = target;

  const config = getConfig();
  const api = new API();

  api.registerPlugins(config);

  const remaxOptions = {
    ...config,
    target,
    configWebpack({ config: webpackConfig, webpack }: any) {
      webpackConfig
        .mode('none')
        .plugins.delete('webpackbar')
        .end()
        .resolve.alias.merge({
          '@components': path.resolve(cwd, 'src/components'),
          '@c': path.resolve(cwd, 'src/components'),
        })
        .end()
        .end()
        .externals({
          react: 'react',
          'react-reconciler': 'react-reconciler',
          scheduler: 'scheduler',
          'regenerator-runtime': 'regenerator-runtime',
          remax: 'remax',
          '@remax/runtime': '@remax/runtime',
          'remax/ali': 'remax/ali',
          '@remax/ali': '@remax/ali',
          'remax/wechat': 'remax/wechat',
          '@remax/wechat': '@remax/wechat',
          'remax/toutiao': 'remax/toutiao',
          '@remax/toutiao': '@remax/toutiao',
          'remax/router': 'remax/router',
          'remax/web': 'remax/web',
        });

      if (typeof config.configWebpack === 'function') {
        config.configWebpack({ config: webpackConfig, webpack });
      }
    },
  };

  const fs = createFsFromVolume(new Volume());
  const webpackFs = ensureWebpackMemoryFs(fs);
  const compiler = run(remaxOptions);
  compiler.outputFileSystem = webpackFs;

  return new Promise(resolve => {
    compiler.hooks.done.tap('done', stats => {
      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors);
        throw new Error(info.errors.join('\n'));
      }

      if (stats.hasWarnings()) {
        info.warnings.forEach(warning => {
          console.warn(warning);
        });
      }

      const exclude = options.exclude || ['node_modules'];
      const include = options.include || [];
      const includeRegExp = new RegExp(`(${include.join('|')})`);
      const excludeRegExp = new RegExp(`(${exclude.join('|')})`);
      const outputDir = path.join(remaxOptions.cwd, remaxOptions.output);

      const output = getFilesInDir(fs, outputDir + '/', outputDir).filter(
        c =>
          (include.length > 0 && includeRegExp.test(c.fileName)) ||
          (exclude.length > 0 && !excludeRegExp.test(c.fileName))
      );

      resolve(output);
    });

    compiler.hooks.failed.tap('failed', error => {
      console.error(error.message);
      throw error;
    });
  });
}

export const JEST_BUILD_TIMEOUT = 60 * 1000;
