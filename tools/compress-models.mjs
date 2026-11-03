// Compresse les modèles exportés par Blender (tools/blender/out/*.glb) pour le site : meshopt, puis gzip, dans
// src/assets/models/<nom>.glb.gz. Lancé par npm run models.
//
// La quantification des positions range un facteur d'échelle et un décalage dans le nœud qui porte le maillage. Le
// site repositionne certains nœuds (moitiés de coiffe, boosters) : on place donc chaque maillage dans un nœud enfant,
// qui reçoit ces valeurs, et le nœud nommé garde sa position d'origine.
import { readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const IN = 'tools/blender/out';
const OUT = 'src/assets/models';

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

for (const file of readdirSync(IN).filter((name) => name.endsWith('.glb'))) {
  const document = await io.read(join(IN, file));
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    node.setMesh(null);
    node.addChild(document.createNode().setMesh(mesh));
  }
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const glb = await io.writeBinary(document);
  const target = join(OUT, `${basename(file)}.gz`);
  writeFileSync(target, gzipSync(glb, { level: 9 }));
  console.log(`${file} : ${(glb.length / 1024).toFixed(0)} Ko → ${target} (${(gzipSync(glb, { level: 9 }).length / 1024).toFixed(0)} Ko)`);
}
