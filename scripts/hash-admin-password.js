const readline = require("node:readline");
const { Writable } = require("node:stream");
const { hashPassword } = require("../src/services/users/passwords");
async function main() {
  let password;
  if (process.stdin.isTTY) {
    const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
    const terminal = readline.createInterface({ input: process.stdin, output, terminal: true });
    process.stdout.write("Contrasena del panel (entrada oculta): ");
    terminal.on("SIGINT", () => { terminal.close(); process.exit(130); });
    password = await new Promise((resolve) => terminal.question("", resolve));
    terminal.close();
    process.stdout.write("\n");
  } else {
    password = "";
    for await (const chunk of process.stdin) {
      password += chunk;
      if (password.length > 1026) throw new Error("La contrasena es demasiado larga.");
    }
    password = password.replace(/\r?\n$/, "");
  }
  if (!password || password.length > 1024) throw new Error("La contrasena debe tener entre 1 y 1024 caracteres.");
  console.log(await hashPassword(password));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
