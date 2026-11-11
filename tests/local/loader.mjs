// Redirige l'import « @netlify/blobs » vers le stockage en mémoire.
export async function resolve(spec, ctx, next) {
  if (spec === "@netlify/blobs") return { url: new URL("./blobs-mock.mjs", import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
}
