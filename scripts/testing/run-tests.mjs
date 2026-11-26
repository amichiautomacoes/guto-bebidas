import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const suite = process.argv[2];
if (!['unit', 'integration'].includes(suite)) {
  throw new Error('Informe unit ou integration.');
}

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const files = findTests(`tests/${suite}`).sort();
if (!files.length) throw new Error(`Nenhum teste em tests/${suite}.`);
const flags =
  suite === 'integration' ? ['--env-file-if-exists=.env', '--conditions=react-server'] : [];
const result = spawnSync(process.execPath, [...flags, '--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
