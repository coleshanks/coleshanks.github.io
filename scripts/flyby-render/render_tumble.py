# Render a model tumbling: over one loop it turns a full circle about Z and about X
# at the same time (both inside a fixed tilt), one PNG per frame. The loop is seamless.
# usage: Blender -b --factory-startup -P render_tumble.py -- <model> <outdir> <frames> <size> <tilt_x> <tilt_y>
#
# Makes the sprite sheets for scripts/flyby.js. Example for a new NASA model
# (.glb from nasa3d.arc.nasa.gov, public domain; .stl works too, rendered as dark rock):
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
#     -P scripts/flyby-render/render_tumble.py -- model.glb /tmp/frames-x 600 320 20 10
#   python3 scripts/flyby-render/pack_sheet.py /tmp/frames-x assets/images/space/nasa/x-spin.webp
# then add it to CRAFT in scripts/flyby.js. Runs in the background without touching an open
# Blender; 600 frames take a few minutes (longer for heavy models). Uses EEVEE.
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, outdir = args[0], args[1]
frames, size = int(args[2]), int(args[3])
tilt_x, tilt_y = math.radians(float(args[4])), math.radians(float(args[5]))
os.makedirs(outdir, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
if src.lower().endswith('.stl'):
    bpy.ops.wm.stl_import(filepath=src)
else:
    bpy.ops.import_scene.gltf(filepath=src)
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']

for o in meshes:  # untextured (the asteroid): dark rock
    if not o.data.materials:
        mat = bpy.data.materials.new('rock')
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = (0.23, 0.22, 0.21, 1)
        bsdf.inputs['Roughness'].default_value = 0.9
        o.data.materials.append(mat)

# centre on the origin; radius of the bounding sphere keeps every frame the same scale
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
centre = (lo + hi) / 2
radius = max((p - centre).length for p in pts)

# outer empty holds the tilt, middle turns about X, inner turns about Z
outer = bpy.data.objects.new('tilt', None)
middle = bpy.data.objects.new('roll', None)
inner = bpy.data.objects.new('spin', None)
for e in (outer, middle, inner):
    scene.collection.objects.link(e)
middle.parent = outer
inner.parent = middle
outer.rotation_euler = (tilt_x, tilt_y, 0)
for o in [o for o in scene.objects if o.parent is None and o not in (outer, middle, inner)]:
    o.location -= centre
    o.parent = inner

scene.frame_start, scene.frame_end = 1, frames
for f, angle in ((1, 0.0), (frames + 1, 2 * math.pi)):
    inner.rotation_euler = (0, 0, angle)
    inner.keyframe_insert('rotation_euler', index=2, frame=f)
    middle.rotation_euler = (angle, 0, 0)
    middle.keyframe_insert('rotation_euler', index=0, frame=f)
for act in bpy.data.actions:  # constant speed: every key linear
    curves = list(getattr(act, 'fcurves', []) or [])
    for layer in getattr(act, 'layers', []):  # Blender 5 layered actions
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves += list(bag.fcurves)
    for fc in curves:
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'

cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = radius * 2.1
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
direction = Vector((1.0, -1.2, 0.7)).normalized()
cam.location = direction * radius * 6
cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
cam_data.clip_end = radius * 20

sun_data = bpy.data.lights.new('sun', 'SUN')
sun_data.energy = 4.0
sun = bpy.data.objects.new('sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), math.radians(-20), math.radians(-40))
world = bpy.data.worlds.new('world')
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.06, 0.07, 0.10, 1)
scene.world = world

engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
print('engines:', engines)
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'CYCLES'):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        continue
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 24
    scene.cycles.device = 'CPU'
print('engine used:', scene.render.engine)
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = size
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = os.path.join(outdir, 'f_')
bpy.ops.render.render(animation=True)
print('done', outdir)
