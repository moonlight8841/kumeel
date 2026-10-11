# Notebook and interactive observatory

The public navigation includes an accessible account/login icon linking to `/admin`. Visitors can sign in there, but only the sole verified editor account with an AAL2 session can open administration.

The observatory provides a position selector, confidence sliders before and after considering a counterargument, a rotating idea exercise, and an explained quiz. Choosing an idea explicitly transfers it into the private assumption exercise and clears its earlier answers. Idea material is edited in Thoughts; quiz questions come from Educational Content. These exercises do not produce public poll counts or psychological assessments.

The Writings tab contains the notebook editor. It creates and edits writing records, preserves their stable IDs, offers search, limited Markdown formatting, a live preview, local recovery, plain-text export, and Ctrl/Cmd+S. Supported formatting consists of headings, bold text, lists, and blockquotes. Raw HTML is rendered as text. Old writing records remain plain text unless the editor changes their format.

Saving puts the text into the existing content draft. Public publishing still uses the CloudPanel confirmation and revision guard. While the notebook has unsaved or recoverable editing, publication is disabled until those changes are saved or discarded. The local editing buffer is separate from the published content and never bypasses database permissions.

Validation covered desktop/mobile layout, visitor and editor AAL1/AAL2 states with mocked Auth, unsaved-publication blocking, recovery, exercises, and HTML escaping. No test writing was published to the production content.
