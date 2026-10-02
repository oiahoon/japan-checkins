# Current handoff

Local folder moved by request to ~/ownwork/japan-checkins. Source origin git@github.com:oiahoon/japan-checkins.git. Original private Site unchanged.

Implemented photo metadata proposals, explicit confirmation/manual coordinates, nullable D1 coordinates through additive migration, clickable true-coordinate markers and preserved metadata stripping. Synthetic tests cover endian parsing, no GPS, malformed offsets, date ambiguity, orientation, multiple independent proposals, boundary/holes, confirmation and EXIF removal. Local endpoint smoke verifies save/reload, retries, repeated visits, missing coords and authorization. Desktop/browser tools were unavailable for this continuation: actual new review UI and real-device orientation/camera still need visual/device QA.

Independent production hosting is deliberately blocked pending verified auth adapter. Trusted Sites identity headers are unsafe on a generic public Worker. Never deploy current app unprotected.

Current conversation could not be assigned to a Codex project through available tools; add local folder as project and move conversation using client UI.
