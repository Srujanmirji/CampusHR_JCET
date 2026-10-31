import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function initializeDemo<T>(
  directory: string,
  seed: () => Promise<T>,
): Promise<T> {
  const file = join(directory, 'initialized.json');
  try {
    const saved = JSON.parse(await readFile(file, 'utf8')) as {
      version?: number;
      data?: T;
    };
    if (saved.version !== 1 || saved.data === undefined)
      throw new Error(
        'The saved demo initialization is invalid; existing data was not reseeded.',
      );
    return saved.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const data = await seed();
  await writeFile(file, JSON.stringify({ version: 1, data }) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  return data;
}
