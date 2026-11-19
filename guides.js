// Posely pose library for AI-made guide images.
// Each pose has an image at guides/<id>.png (or .jpg / .webp), made with the prompts in PROMPTS.md.
// cam: 'back' = someone else takes the photo, 'selfie' = front camera.
// steps: short tips shown one by one on the camera screen.

export const STYLE = 'A 3D render of an elegant, slender female art mannequin, like a sculptor’s posing mannequin: ' +
  'one smooth, seamless, featureless body of matte warm-beige clay with a graceful feminine silhouette, ' +
  'no clothing, and a simplified, smoothed torso like a modern department-store display mannequin (no navel, no anatomical detail), ' +
  'a smooth face with only softly sculpted features, and a sleek sculpted low bun. ' +
  'Soft diffused studio lighting. Plain flat solid light grey background (#E5E5E5) filling the whole image, ' +
  'no floor, no shadow on the background, no furniture or objects unless named. Portrait 3:4.';
export const FRAMING = {
  back: 'Show the whole body from head to toe, centred, with a little space around it.',
  selfie: 'Show her from the waist up, centred, as seen from a phone held at arm’s length.'
};
export const OUTFIT = {
  pants: '',
  dress: '',
  couple: 'There are two mannequins in the same smooth clay style: the female one and a taller, broader male one.',
  friends: 'There are three female mannequins in the same smooth clay style.'
};

export const CATS = ['All', 'Café', 'Street', 'Wall', 'Sitting', 'Stairs', 'Mirror', 'Beach', 'Door & window', 'Selfie', 'Couple', 'Friends', 'Mine'];

export const GUIDES = [
  // Café
  { id: 'cafe-chin', cat: 'Café', cam: 'back', outfit: 'pants', name: 'Chin on hand',
    pose: 'sitting on a chair at a small round café table, one elbow on the table and her chin resting on that hand, the other hand around a coffee cup, looking slightly away',
    steps: ['Sit at the edge of the chair', 'Elbow on the table, chin on your hand', 'Other hand on your cup', 'Look out the window'] },
  { id: 'cafe-sip', cat: 'Café', cam: 'back', outfit: 'dress', name: 'Coffee sip',
    pose: 'sitting at a small café table with legs crossed, holding a coffee cup with both hands near her lips, eyes looking down at the cup',
    steps: ['Cross your legs toward the camera', 'Hold the cup with both hands', 'Bring it near your lips', 'Look down at the cup'] },
  { id: 'cafe-window', cat: 'Café', cam: 'back', outfit: 'pants', name: 'Window seat',
    pose: 'sitting side-on at a café table, body turned to the side, one hand resting on the table, head turned toward the camera with a soft smile',
    steps: ['Sit side-on to the camera', 'Rest one hand on the table', 'Turn only your head to the lens', 'Soft smile'] },

  // Street
  { id: 'street-walk', cat: 'Street', cam: 'back', outfit: 'pants', name: 'Walking toward camera',
    pose: 'walking toward the viewer mid-stride, one foot in front of the other, arms swinging naturally, holding a small handbag in one hand, chin slightly up',
    steps: ['Walk slowly toward the camera', 'Cross one foot in front of the other', 'Let your arms swing', 'Chin up, eyes ahead'] },
  { id: 'street-lookback', cat: 'Street', cam: 'back', outfit: 'dress', name: 'Look over shoulder',
    pose: 'walking away from the viewer, seen from behind, turning her head and shoulders back to look over her shoulder at the viewer',
    steps: ['Walk away from the camera', 'Turn your shoulders slightly', 'Look back over your shoulder', 'Keep walking for burst shots'] },
  { id: 'street-sunglasses', cat: 'Street', cam: 'back', outfit: 'pants', name: 'Adjusting sunglasses',
    pose: 'standing with weight on one leg, one hand touching the frame of her sunglasses, the other hand resting on her hip',
    steps: ['Weight on your back leg', 'One hand on your hip', 'Touch your sunglasses', 'Look past the camera'] },

  // Wall
  { id: 'wall-lean', cat: 'Wall', cam: 'back', outfit: 'dress', name: 'Shoulder lean',
    pose: 'leaning one shoulder against an invisible wall, ankles crossed, one hand relaxed at her side and the other touching her hair',
    steps: ['Lean one shoulder on the wall', 'Cross your ankles', 'Touch your hair lightly', 'Tilt your head toward the wall'] },
  { id: 'wall-foot', cat: 'Wall', cam: 'back', outfit: 'pants', name: 'Foot up',
    pose: 'standing with her back against an invisible wall, one knee bent with that foot flat against the wall, hands behind her back, looking to the side',
    steps: ['Back against the wall', 'Bend one knee, foot on the wall', 'Hands behind your back', 'Look to the side'] },
  { id: 'wall-hip', cat: 'Wall', cam: 'back', outfit: 'dress', name: 'Hand on hip',
    pose: 'standing three-quarter turned, one hand on her hip with the elbow out, front leg crossed slightly over the back leg, chin slightly down',
    steps: ['Turn your body 30° away', 'Hand on your hip, elbow out', 'Cross your front leg over', 'Chin slightly down'] },

  // Sitting
  { id: 'sit-bench', cat: 'Sitting', cam: 'back', outfit: 'dress', name: 'Bench, legs crossed',
    pose: 'sitting on the front edge of an invisible bench, legs crossed at the knee, hands resting on her top knee, back straight, looking at the viewer',
    steps: ['Sit on the front edge', 'Cross your legs at the knee', 'Hands on your top knee', 'Sit tall, look at the lens'] },
  { id: 'sit-lean-back', cat: 'Sitting', cam: 'back', outfit: 'pants', name: 'Lean back',
    pose: 'sitting on an invisible bench leaning back on both hands placed behind her, legs stretched forward and crossed at the ankles, face tilted up to the sun',
    steps: ['Hands behind you on the bench', 'Lean back a little', 'Stretch your legs, cross ankles', 'Face up to the sun'] },
  { id: 'sit-ground', cat: 'Sitting', cam: 'back', outfit: 'dress', name: 'On the grass',
    pose: 'sitting on the ground with both knees bent to one side, leaning on one hand, the other hand in her lap, smiling softly',
    steps: ['Sit with knees to one side', 'Lean on one hand', 'Other hand in your lap', 'Soft smile'] },

  // Stairs
  { id: 'stairs-sit', cat: 'Stairs', cam: 'back', outfit: 'pants', name: 'Sitting on steps',
    pose: 'sitting on an invisible staircase, feet on different steps, forearms resting on her knees, hands loosely clasped, leaning slightly forward',
    steps: ['Sit a few steps up', 'Feet on different steps', 'Forearms on your knees', 'Lean forward slightly'] },
  { id: 'stairs-walk', cat: 'Stairs', cam: 'back', outfit: 'dress', name: 'Walking up',
    pose: 'walking up invisible stairs seen from behind and below, one foot on a higher step, one hand on an invisible railing, looking back over her shoulder',
    steps: ['Walk up a few steps', 'Hand on the railing', 'Pause mid-step', 'Look back over your shoulder'] },

  // Mirror
  { id: 'mirror-face', cat: 'Mirror', cam: 'back', outfit: 'dress', name: 'Phone over face',
    pose: 'standing facing the viewer holding a smartphone in front of her face with one hand as if taking a mirror selfie, other hand on her hip, one knee popped',
    steps: ['Phone in front of your face', 'Other hand on your hip', 'Pop one knee', 'Use the back camera'] },
  { id: 'mirror-chest', cat: 'Mirror', cam: 'back', outfit: 'pants', name: 'Phone at chest',
    pose: 'standing facing the viewer holding a smartphone at chest height as if taking a mirror selfie, face visible, other hand touching her hair, head tilted',
    steps: ['Phone at chest height', 'Show your face', 'Other hand in your hair', 'Tilt your head'] },
  { id: 'mirror-side', cat: 'Mirror', cam: 'back', outfit: 'dress', name: 'Side profile',
    pose: 'standing side-on to the viewer holding a smartphone up near her face as if taking a mirror selfie, front knee slightly bent, showing her silhouette',
    steps: ['Turn side-on to the mirror', 'Phone up near your face', 'Bend your front knee', 'Show your silhouette'] },
  { id: 'mirror-sit', cat: 'Mirror', cam: 'back', outfit: 'pants', name: 'Mirror squat',
    pose: 'crouching low facing the viewer, knees together, holding a smartphone up at eye level as if taking a mirror selfie',
    steps: ['Crouch low in front of the mirror', 'Knees together', 'Phone at eye level', 'Show your shoes'] },

  // Beach
  { id: 'beach-twirl', cat: 'Beach', cam: 'back', outfit: 'dress', name: 'Twirl',
    pose: 'mid-twirl, arms floating out to the sides, head tilted back laughing',
    steps: ['Spin slowly', 'Let your arms float out', 'Tilt your head back', 'Use burst mode'] },
  { id: 'beach-hat', cat: 'Beach', cam: 'back', outfit: 'dress', name: 'Holding sun hat',
    pose: 'standing with one hand holding a wide-brim sun hat on her head, the other hand resting lightly on her thigh, looking away to the side',
    steps: ['Hand on your hat brim', 'Other hand on your thigh', 'Look out to the sea', 'Wind in your favour'] },
  { id: 'beach-back', cat: 'Beach', cam: 'back', outfit: 'dress', name: 'Arms open to the sea',
    pose: 'standing with her back to the viewer, arms raised and open wide toward the horizon',
    steps: ['Back to the camera', 'Face the horizon', 'Open your arms wide', 'Photographer crouches low'] },

  // Door & window
  { id: 'door-frame', cat: 'Door & window', cam: 'back', outfit: 'dress', name: 'Doorway lean',
    pose: 'standing in a doorway, one raised hand resting on an invisible door frame above shoulder height, leaning into it, ankles crossed',
    steps: ['Stand in the doorway', 'Raised hand on the frame', 'Lean into it', 'Cross your ankles'] },
  { id: 'window-gaze', cat: 'Door & window', cam: 'back', outfit: 'pants', name: 'Window gaze',
    pose: 'standing side-on, fingertips of one hand touching an invisible window pane, looking out, the other hand holding a coffee cup',
    steps: ['Stand side-on to the window', 'Fingertips on the glass', 'Look outside', 'Let the light hit your face'] },

  // Selfie
  { id: 'selfie-cheek', cat: 'Selfie', cam: 'selfie', outfit: 'dress', name: 'Hand on cheek',
    pose: 'her cheek resting lightly on the back of one hand, head tilted, soft smile, looking into the lens',
    steps: ['Phone slightly above eye level', 'Cheek on your hand', 'Tilt your head', 'Smile with your eyes'] },
  { id: 'selfie-chin', cat: 'Selfie', cam: 'selfie', outfit: 'pants', name: 'Chin up',
    pose: 'chin tilted up about 15 degrees, one hand lightly touching her collarbone, eyes looking down at the lens',
    steps: ['Tilt your chin up 15°', 'Touch your collarbone', 'Eyes down to the lens', 'Relax your mouth'] },
  { id: 'selfie-shoulder', cat: 'Selfie', cam: 'selfie', outfit: 'dress', name: 'Over the shoulder',
    pose: 'body turned away from the viewer, looking back over her shoulder into the lens',
    steps: ['Turn your body away', 'Look back over your shoulder', 'Chin toward your shoulder', 'Hold still'] },
  { id: 'selfie-hair', cat: 'Selfie', cam: 'selfie', outfit: 'pants', name: 'Hands in hair',
    pose: 'both hands lifted into her hair at the sides of her head, elbows out, eyes closed, relaxed',
    steps: ['Hands up into your hair', 'Elbows out', 'Close your eyes', 'Open them on the shot'] },
  { id: 'selfie-sunglasses', cat: 'Selfie', cam: 'selfie', outfit: 'dress', name: 'Peek over sunglasses',
    pose: 'lowering her sunglasses with one finger to peek over them at the lens, playful expression',
    steps: ['Sunglasses on', 'Pull them down with one finger', 'Peek over the top', 'Playful look'] },

  // Couple
  { id: 'couple-walk', cat: 'Couple', cam: 'back', outfit: 'couple', name: 'Walking hand in hand',
    pose: 'walking toward the viewer holding hands, looking at each other and laughing',
    steps: ['Hold hands', 'Walk toward the camera', 'Look at each other', 'Laugh and keep walking'] },
  { id: 'couple-forehead', cat: 'Couple', cam: 'back', outfit: 'couple', name: 'Foreheads together',
    pose: 'standing close facing each other, foreheads touching, holding both hands low between them, eyes closed',
    steps: ['Stand close, face each other', 'Hold both hands low', 'Touch foreheads', 'Close your eyes'] },
  { id: 'couple-hug', cat: 'Couple', cam: 'back', outfit: 'couple', name: 'Back hug',
    pose: 'the man standing behind the woman with his arms wrapped around her waist, his chin near her shoulder, both smiling',
    steps: ['Partner stands behind you', 'Arms around your waist', 'Lean back into them', 'Both smile'] },

  // Friends
  { id: 'friends-line', cat: 'Friends', cam: 'back', outfit: 'friends', name: 'Arm in arm',
    pose: 'standing side by side arm in arm, the outer two turned slightly inward, all laughing',
    steps: ['Stand side by side', 'Link arms', 'Outer friends turn inward', 'Laugh together'] },
  { id: 'friends-walk', cat: 'Friends', cam: 'back', outfit: 'friends', name: 'Walking together',
    pose: 'walking toward the viewer side by side, mid-stride, chatting and smiling',
    steps: ['Walk side by side', 'Start chatting', 'Ignore the camera', 'Use burst mode'] }
];

export function promptFor(g) {
  return [STYLE, OUTFIT[g.outfit], `Pose: ${g.pose}.`, FRAMING[g.cam]].filter(Boolean).join(' ');
}
