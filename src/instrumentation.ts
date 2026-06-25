export async function register() {
  // Node-only startup (redis probe, secrets cache warm) runs lazily from
  // server code — see src/lib/startup/node.ts. Keeping this hook empty
  // avoids bundling node:crypto into the Edge middleware deploy artifact.
}
