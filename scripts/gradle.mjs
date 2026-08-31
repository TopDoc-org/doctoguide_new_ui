/**
 * Cross-platform Gradle wrapper runner.
 *
 * `cd android && ./gradlew assembleDebug` is a POSIX-ism. npm shells out to
 * cmd.exe on Windows, where `./gradlew` fails with
 * "'.' is not recognized as an internal or external command".
 *
 * Usage: node scripts/gradle.mjs assembleDebug
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ANDROID = resolve('android');
if (!existsSync(ANDROID)) {
  console.error('android/ not found. Run `npx cap add android` first.');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const wrapper = join(ANDROID, isWin ? 'gradlew.bat' : 'gradlew');
if (!existsSync(wrapper)) {
  console.error(`Gradle wrapper missing at ${wrapper}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/gradle.mjs <task> [...]');
  process.exit(1);
}

if (!process.env['JAVA_HOME']) {
  console.warn('warning: JAVA_HOME is not set; Gradle may pick the wrong JDK (needs 17+ for AGP 8).');
}

const child = spawn(wrapper, args, { cwd: ANDROID, stdio: 'inherit', shell: isWin });
child.on('exit', (code) => process.exit(code ?? 1));
