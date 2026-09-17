# Cartoon dealer hand

Created with the built-in image-generation tool in style-transfer mode, using `client/src/assets/dealer/dealer-hand.png` as the pose and framing reference. The replacement sprite is `client/src/assets/dealer/dealer-hand-cartoon.png`; it is mirrored for the other hand. The generator retained a checkerboard in the RGB sprite, including after the background cleanup request. The game uses the original transparent hand PNG as a CSS alpha mask, preserving its silhouette and motion anchors while showing only the new cartoon artwork. The source PNG itself is not transparent. The sleeve extension uses matching flat shading.

## Generation prompt

Use case: style-transfer.
Asset type: transparent PNG dealer hand sprite for a polished cartoon blackjack game.
Input image: EDIT TARGET. Restyle this existing hand sprite as a clearly illustrated 2D CARTOON hand while preserving its exact pose, silhouette proportions, location, and portrait canvas framing. Back of hand faces viewer, wrist enters the top, relaxed fingers point down, normal thumb on image RIGHT.
Style: tasteful hand-drawn animation cel, confident smooth dark-brown outlines, rounded finger shapes, simple warm peach flat fills and two-tone cel shadows, only a few short lines for knuckles and small simplified fingernails. Restrained friendly cartoon illustration that reads cleanly at 84 pixels wide. Use charcoal #302d2e for the tailored jacket sleeve with simple flat shading and an ivory shirt cuff. Keep the sleeve and cuff clearly visible in the same locations and widths as the original.
Preserve: exactly five digits, natural thumb joint, relaxed slightly curved mostly-together fingers, same finger lengths, same hand scale, identical placement, sleeve cropped only at the TOP EDGE, all fingertips visible, the existing generous transparent margins. In particular keep index fingertip at about x65.5%,y86% of canvas and sleeve top spanning x18.5% to68.5%.
Remove all photographic details: no pores, skin grain, veins, wrinkles, realistic fabric weave, photorealistic lighting or 3D rendering. Use simple flat graphic shapes and restrained solid shadows. This must look like an intentionally drawn cartoon, not a filtered photo.
Background: GENUINELY TRANSPARENT alpha. No black backdrop, no glow, no table, no background shadow, no checkerboard baked into pixels. Only the single illustrated hand, cuff, and sleeve. No text or extra objects.

## Background cleanup prompt

Use case: background-extraction.
Input image is the EDIT TARGET. Turn this cartoon hand into a clean transparent PNG sprite.
Remove the ENTIRE gray checkerboard background and every pale swirly mark surrounding the hand. Replace ALL pixels outside the hand, cuff and sleeve silhouette with actual transparency (alpha=0), including narrow gaps between fingers. Return an RGBA PNG cutout, not an RGB picture of transparency. Do not paint a new backdrop, color, gradient, checkerboard, pattern, glow, or shadow.
Keep the cartoon hand, its five fingers, natural pose, warm skin colors, dark outline, ivory cuff and charcoal jacket EXACTLY as shown. Preserve the 1024x1536 portrait framing, exact scale and position, and crop the sleeve only at the top edge. Do not redraw or change the hand. Preserve clean antialiased silhouette edges. Only remove the background.
