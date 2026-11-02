# Modèles 3D du portfolio : fusée à deux boosters, satellite à deux antennes, centrale solaire flottante.
# Lancé avec le module Python de Blender (pip install bpy) : python tools/blender/models.py public/models
# Chaque modèle est exporté en .glb (repère Y vers le haut côté Three.js). Les pièces qui bougent dans le site
# (moitiés de coiffe, boosters, panneaux du satellite) sont des objets nommés ; le reste est fusionné par matériau
# pour limiter les appels de dessin.
import math
import os
import sys

import bpy  # noqa: I001 (bpy doit être importé avant bmesh)
import bmesh
import numpy as np

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'public/models'
os.makedirs(OUT, exist_ok=True)


# ---------- Outils ----------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, rough=0.45, metal=0.0, image=None, emissive=None):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*srgb(color), 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emissive:
        bsdf.inputs['Emission Color'].default_value = (*srgb(emissive), 1)
        bsdf.inputs['Emission Strength'].default_value = 1.0
    if image is not None:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def srgb(hex_):
    h = hex_.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def new_obj(name, bm, mat, smooth=True, parent=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def lathe(name, profile, mat, segs=64, angle=2 * math.pi, start=0.0, parent=None, loc=(0, 0, 0)):
    """Profil [(rayon, hauteur)] tourné autour de l'axe vertical (Z dans Blender)."""
    bm = bmesh.new()
    verts = [bm.verts.new((r * math.cos(start), r * math.sin(start), z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    full = abs(angle - 2 * math.pi) < 1e-6
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=angle, steps=segs, use_duplicate=False)
    if full:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = new_obj(name, bm, mat, parent=parent)
    obj.location = loc
    return obj


def box(name, size, mat, loc=(0, 0, 0), bevel=0.0, rot=(0, 0, 0), parent=None, segs=2):
    bm = bmesh.new()
    bm.loops.layers.uv.new()
    bmesh.ops.create_cube(bm, size=1.0, calc_uvs=True)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    # Chaque face reçoit toute la texture (0 à 1 dans ses deux directions) : une image de cellules couvre le panneau.
    uv = bm.loops.layers.uv.active
    for f in bm.faces:
        ax = max(range(3), key=lambda i: abs(f.normal[i]))
        a, b = [i for i in range(3) if i != ax]
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = (co[a] / size[a] + 0.5, co[b] / size[b] + 0.5)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=segs, affect='EDGES', profile=0.5)
    obj = new_obj(name, bm, mat, smooth=bevel > 0, parent=parent)
    obj.location = loc
    obj.rotation_euler = rot
    if bevel > 0:
        weighted(obj)
    return obj


def cylinder(name, r, h, mat, loc=(0, 0, 0), rot=(0, 0, 0), segs=24, parent=None, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    obj = new_obj(name, bm, mat, parent=parent)
    obj.location = loc
    obj.rotation_euler = rot
    weighted(obj)
    return obj


def sphere(name, r, mat, loc=(0, 0, 0), segs=24, rings=14, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    obj = new_obj(name, bm, mat, parent=parent)
    obj.location = loc
    return obj


def weighted(obj):
    mod = obj.modifiers.new('wn', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True


def apply_all(objs):
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)


def merge(objs, name):
    """Fusionne des objets (tous matériaux confondus, un sous-mesh par matériau dans le glTF)."""
    objs = [o for o in objs if o.type == 'MESH']
    if not objs:
        return None
    apply_all(objs)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    # Toutes les pièces passent dans le repère du monde : l'objet fusionné a son origine en (0, 0, 0).
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def image(name, w, h, fill):
    img = bpy.data.images.new(name, w, h, alpha=False)
    px = np.zeros((h, w, 4), dtype=np.float32)
    fill(px)
    px[..., 3] = 1
    img.pixels.foreach_set(px.ravel())
    img.pack()
    return img


def cells_image(name, cols, rows, w=256, h=256, frame='#c9d1d8', border=6):
    """Module photovoltaïque : cadre alu, cellules bleu nuit séparées par un fin liseré clair, fins conducteurs."""
    def fill(px):
        H, W = px.shape[:2]
        px[..., :3] = srgb(frame)
        inner = px[border:H - border, border:W - border]
        IH, IW = inner.shape[:2]
        inner[..., :3] = srgb('#33477a')
        cw, ch = IW / cols, IH / rows
        yy, xx = np.mgrid[0:IH, 0:IW]
        base = np.array(srgb('#1d3a86'))
        top = np.array(srgb('#0e1f52'))
        for i in range(cols):
            for j in range(rows):
                m = (xx >= i * cw + 1) & (xx < (i + 1) * cw - 1) & (yy >= j * ch + 1) & (yy < (j + 1) * ch - 1)
                t = ((xx - i * cw) / cw * 0.4 + (yy - j * ch) / ch * 0.6)
                col = base[None, None, :] * (1 - t[..., None]) + top[None, None, :] * t[..., None]
                inner[m, :3] = col[m]
                for k in (1, 2):
                    line = m & (np.abs(xx - (i * cw + k * cw / 3)) < 0.5)
                    inner[line, :3] = srgb('#4a63a8')
    return image(name, w, h, fill)


def mli_image(name):
    rng = np.random.default_rng(4)

    def fill(px):
        H, W = px.shape[:2]
        px[..., :3] = srgb('#d9ab45')
        yy, xx = np.mgrid[0:H, 0:W]
        for _ in range(140):
            cx, cy, r = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(10, 40)
            k = rng.uniform(-0.12, 0.18)
            d = ((xx - cx) ** 2 + (yy - cy) ** 2) < r * r
            px[d, :3] = np.clip(px[d, :3] * (1 + k), 0, 1)
        # plis du film
        for _ in range(30):
            y0, a = rng.uniform(0, H), rng.uniform(-0.5, 0.5)
            line = np.abs(yy - (y0 + a * xx)) < 1.0
            px[line, :3] = np.clip(px[line, :3] * 1.35, 0, 1)
    return image(name, 256, 256, fill)


def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        for c in o.children_recursive:
            c.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format='AUTO',
    )


# ---------- Fusée ----------
# Mêmes repères que l'ancienne fusée (src/intro/rocket.js), en Z vers le haut : base des ailerons à 0.
R = 0.32
BODY_BASE = 0.35
BODY_H = 2.2
FAIRING_BASE = BODY_BASE + BODY_H
FAIRING_H = 1.2
FAIRING_R = 0.35


def rocket():
    reset()
    white = material('blanc', '#f1f1ec', rough=0.32)
    red = material('rouge', '#c8372d', rough=0.38)
    dark = material('sombre', '#2a2e35', rough=0.45, metal=0.6)
    steel = material('acier', '#a3abb3', rough=0.3, metal=0.85)
    nozzle_m = material('tuyere', '#3b3530', rough=0.35, metal=0.8)

    parts = []
    # Corps central : léger congé à la base, jupe arrière.
    parts.append(lathe('corps', [(0.27, 0.12), (0.30, 0.18), (R, 0.26), (R, FAIRING_BASE - 0.12)], white))
    parts.append(lathe('jupe', [(0.2, -0.02), (0.29, 0.05), (0.3, 0.12), (0.27, 0.12)], dark))
    parts.append(lathe('inter', [(R, FAIRING_BASE - 0.12), (R + 0.002, FAIRING_BASE - 0.1), (FAIRING_R, FAIRING_BASE - 0.02), (FAIRING_R, FAIRING_BASE)], white))
    for z, h, m in [(BODY_BASE + BODY_H * 0.72, 0.16, red), (FAIRING_BASE - 0.16, 0.035, dark), (BODY_BASE + 0.55, 0.025, dark)]:
        parts.append(lathe('bande', [(R + 0.003, z - h / 2), (R + 0.003, z + h / 2)], m))
    # Gaine de câbles le long du corps.
    parts.append(box('gaine', (0.022, 0.012, 1.7), white, loc=(0, -R - 0.003, 1.35), bevel=0.004))
    # Moteur Vulcain : col et tuyère.
    parts.append(lathe('tuyere', [(0.07, 0.0), (0.09, -0.08), (0.15, -0.28), (0.2, -0.48), (0.205, -0.5)], nozzle_m, segs=48))
    parts.append(lathe('tuyere_int', [(0.195, -0.5), (0.14, -0.3), (0.06, -0.02)], dark, segs=48))
    core = merge(parts, 'corps')

    # Coiffe en deux moitiés (origine sur l'axe, au pied de la coiffe), jointure dans le plan YZ de Three.js.
    prof = [(FAIRING_R, 0), (FAIRING_R, 0.5)]
    steps = 22
    for i in range(1, steps + 1):
        k = i / steps
        prof.append((max(0.002, FAIRING_R * math.cos(k * math.pi / 2) ** 0.85), 0.5 + math.sin(k * math.pi / 2) * (FAIRING_H - 0.5)))
    halves = []
    for side, start in ((1, -math.pi / 2), (-1, math.pi / 2)):
        # Three.js : x Blender = x, y Blender = -z. La moitié côté +x couvre l'angle -90°..90° autour de Z.
        h = lathe('coiffe_' + ('d' if side > 0 else 'g'), prof, white, segs=32, angle=math.pi, start=start)
        h.location = (0, 0, FAIRING_BASE)
        halves.append(h)

    boosters = []
    for side in (1, -1):
        b = []
        L, br = 1.65, 0.16
        x = side * (R + br + 0.035)
        b.append(lathe('b', [(br * 0.85, 0.06), (br, 0.12), (br, L)], white, segs=40))
        nose = [(br, L)]
        for i in range(1, 15):
            k = i / 14
            nose.append((max(0.002, br * math.cos(k * math.pi / 2) ** 0.75), L + math.sin(k * math.pi / 2) * 0.42))
        b.append(lathe('bn', nose, white, segs=40))
        b.append(lathe('bb', [(br + 0.003, L * 0.8 - 0.05), (br + 0.003, L * 0.8 + 0.05)], red, segs=40))
        b.append(lathe('bj', [(0.1, -0.02), (br * 0.88, 0.06), (br * 0.85, 0.06)], dark, segs=40))
        b.append(lathe('bt', [(0.05, 0.0), (0.07, -0.08), (0.11, -0.22), (0.115, -0.23)], nozzle_m, segs=32))
        # Attaches avant et arrière vers le corps central.
        for z in (0.35, L - 0.12):
            b.append(box('att', (0.07, 0.035, 0.035), steel, loc=(-side * (br + 0.03), 0, z), bevel=0.006))
        obj = merge(b, 'booster_' + ('d' if side > 0 else 'g'))
        obj.location = (x, 0, 0.0)
        boosters.append(obj)

    export(os.path.join(OUT, 'fusee.glb'), [core, *halves, *boosters])


# ---------- Satellite ----------
def satellite():
    reset()
    foil = material('mli', '#ffffff', rough=0.3, metal=0.45, image=mli_image('mli'))
    white = material('radiateur', '#ecece6', rough=0.4)
    steel = material('acier', '#a3abb3', rough=0.3, metal=0.85)
    dark = material('sombre', '#2a2e35', rough=0.45, metal=0.5)
    cells = material('cellules', '#ffffff', rough=0.3, metal=0.0, image=cells_image('cellules', 6, 8, 240, 320, border=4))
    back = material('dos', '#dcdcd4', rough=0.6)

    W, H, D = 0.22, 0.28, 0.22
    body = []
    body.append(box('caisson', (W, D, H), foil, bevel=0.006))
    body.append(box('dessus', (W + 0.012, D + 0.012, 0.018), white, loc=(0, 0, H / 2 + 0.006), bevel=0.003))
    body.append(box('dessous', (W + 0.012, D + 0.012, 0.018), white, loc=(0, 0, -H / 2 - 0.006), bevel=0.003))
    # Deux antennes paraboliques sur les côtés avant, avec bras et cornet.
    dish_prof = [(0.0005, 0.0)] + [(0.075 * (i / 12), 0.028 * (i / 12) ** 2) for i in range(1, 13)] + [(0.075, 0.029)]
    for s in (1, -1):
        # Une parabole sur chaque flanc, tournée vers l'avant et un peu vers le bas, au bout d'un bras court.
        rx, rz = math.radians(105), math.radians(s * -28)
        ax = (math.sin(-rz) * -math.sin(rx) * -1, math.cos(rz) * -math.sin(rx), math.cos(rx))
        cx, cy, cz = s * (W / 2 + 0.07), -0.03, 0.05
        d = lathe('parabole', dish_prof, white, segs=40)
        d.location = (cx, cy, cz)
        d.rotation_euler = (rx, 0, rz)
        body.append(d)
        body.append(cylinder('bras', 0.005, 0.07, steel, loc=(s * (W / 2 + 0.035), cy + 0.02, cz), rot=(0, math.pi / 2, 0), segs=8))
        f = 0.05
        body.append(cylinder('cornet', 0.006, 0.02, dark, loc=(cx + ax[0] * f, cy + ax[1] * f, cz + ax[2] * f), rot=(rx, 0, rz), segs=12, r2=0.01))
    # Mât et petite antenne omni, capteur stellaire, tuyères.
    body.append(cylinder('mat', 0.005, 0.16, steel, loc=(0, 0, H / 2 + 0.09), segs=8))
    body.append(sphere('omni', 0.012, white, loc=(0, 0, H / 2 + 0.17), segs=12, rings=8))
    body.append(box('stellaire', (0.03, 0.03, 0.04), dark, loc=(0.06, 0.07, H / 2 + 0.03), bevel=0.004))
    body.append(lathe('moteur', [(0.02, -H / 2 - 0.01), (0.026, -H / 2 - 0.04), (0.04, -H / 2 - 0.07)], dark, segs=20))
    for sx, sy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        body.append(cylinder('rcs', 0.006, 0.02, dark, loc=(sx * (W / 2 + 0.004), sy * 0.08, -H / 2 + 0.02), rot=(0, math.pi / 2, 0), segs=8))
    core = merge(body, 'corps')

    # Ailes : un bras (pivot sur le flanc), puis 4 panneaux en chaîne, chacun parent du précédent, origine sur son
    # bord intérieur, pour se replier en accordéon dans le site.
    PW, PH, T = 0.13, 0.15, 0.008
    wings = []
    for side, tag in ((1, 'd'), (-1, 'g')):
        yoke = merge([
            cylinder('bras', 0.005, 0.07, steel, loc=(side * 0.035, 0, 0), rot=(0, math.pi / 2, 0), segs=8),
            box('fourche', (0.004, 0.006, PH * 0.8), steel, loc=(side * 0.07, 0, 0)),
        ], f'aile_{tag}')
        yoke.location = (side * W / 2, 0, 0.02)
        prev, offset = yoke, side * 0.072
        for i in range(4):
            p = merge([
                box('cellules', (PW, T * 0.5, PH), cells, loc=(side * PW / 2, -T * 0.25, 0)),
                box('dos', (PW, T * 0.5, PH), back, loc=(side * PW / 2, T * 0.25, 0)),
                box('cadre', (0.004, T * 1.2, PH), steel, loc=(side * 0.002, 0, 0)),
                box('cadre', (PW, T * 1.2, 0.004), steel, loc=(side * PW / 2, 0, PH / 2)),
                box('cadre', (PW, T * 1.2, 0.004), steel, loc=(side * PW / 2, 0, -PH / 2)),
            ], f'panneau_{tag}{i}')
            # Les UV d'une boîte couvrent chaque face entière : la texture de cellules remplit la face avant.
            p.parent = prev
            p.location = (offset, 0, 0)
            prev, offset = p, side * (PW + 0.004)
        wings.append(yoke)
    export(os.path.join(OUT, 'satellite.glb'), [core, *wings])


# ---------- Centrale solaire flottante ----------
def floating_plant():
    reset()
    hdpe = material('flotteur', '#e6eaec', rough=0.65)
    blue = material('allee', '#2f6fa8', rough=0.6)
    steel = material('acier', '#a3abb3', rough=0.32, metal=0.8)
    dark = material('sombre', '#2a2e35', rough=0.5, metal=0.3)
    cells = material('cellules', '#ffffff', rough=0.22, metal=0.0, image=cells_image('cellules', 10, 6, 400, 240, frame='#b9c2ca'))
    back = material('dos', '#d8d8d2', rough=0.6)
    buoy = material('bouee', '#ff7a45', rough=0.4)

    parts = []
    cols, rows, dx, dz = 6, 4, 0.5, 0.56
    for i in range(cols):
        for j in range(rows):
            x = (i - (cols - 1) / 2) * dx
            y = (j - (rows - 1) / 2) * dz
            # Flotteur principal moulé (arêtes arrondies, deux renforts), flotteur d'allée bleu derrière.
            parts.append(box('f', (0.44, 0.34, 0.07), hdpe, loc=(x, y, 0.035), bevel=0.018, segs=3))
            for k in (-1, 1):
                parts.append(box('r', (0.4, 0.03, 0.015), hdpe, loc=(x, y + k * 0.09, 0.075), bevel=0.006))
            parts.append(box('a', (0.46, 0.1, 0.04), blue, loc=(x, y + 0.235, 0.02), bevel=0.01, segs=2))
            # Module incliné vers le sud (côté -y Blender = +z Three.js, face à la caméra de l'intro), cadre alu fin,
            # posé sur deux rails et deux montants cachés dessous.
            tilt = math.radians(12)
            parts.append(box('p', (0.44, 0.31, 0.01), cells, loc=(x, y - 0.005, 0.135), rot=(tilt, 0, 0)))
            parts.append(box('pd', (0.44, 0.31, 0.004), back, loc=(x, y - 0.005, 0.128), rot=(tilt, 0, 0)))
            for k in (-1, 1):
                parts.append(box('rail', (0.012, 0.3, 0.012), steel, loc=(x + k * 0.15, y - 0.005, 0.105), rot=(tilt, 0, 0)))
                parts.append(box('m', (0.012, 0.012, 0.06), steel, loc=(x + k * 0.15, y + 0.12, 0.1)))
    # Chemin de câbles le long d'une allée, boîtes de jonction.
    parts.append(box('cable', (cols * dx, 0.025, 0.018), dark, loc=(0, 0.235, 0.05), bevel=0.005))
    for i in range(cols):
        parts.append(box('jb', (0.05, 0.035, 0.025), dark, loc=((i - (cols - 1) / 2) * dx, 0.235, 0.065), bevel=0.006))
    # Bouées d'amarrage et lignes.
    ex, ey = cols * dx / 2, rows * dz / 2
    for sx, sy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        bx, by = sx * (ex + 0.4), sy * (ey + 0.35)
        parts.append(sphere('b', 0.08, buoy, loc=(bx, by, 0.03), segs=20, rings=12))
        parts.append(cylinder('bt', 0.012, 0.08, dark, loc=(bx, by, 0.1), segs=8))
        cx, cy = sx * (ex - 0.1), sy * (ey - 0.1)
        L = math.hypot(bx - cx, by - cy)
        ang = math.atan2(by - cy, bx - cx)
        parts.append(cylinder('l', 0.005, L, dark, loc=((bx + cx) / 2, (by + cy) / 2, 0.035), rot=(0, math.pi / 2, ang), segs=6))
    plant = merge(parts, 'centrale')
    export(os.path.join(OUT, 'centrale-flottante.glb'), [plant])


rocket()
satellite()
floating_plant()
print('ok', OUT)
